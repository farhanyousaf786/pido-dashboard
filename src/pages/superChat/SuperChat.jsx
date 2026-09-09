import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  Loader2,
  Users,
  ArrowLeft,
  CheckCircle,
  X,
} from 'lucide-react';
import { collection, limit, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../core/firebase/firebaseConfig.js';
import { superChatService } from '../../core/services/superChatService.js';
import './SuperChat.css';

function formatTime(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatUserType(type) {
  if (type === 'serviceProvider') return 'Provider';
  if (type === 'customer') return 'Customer';
  return type || '';
}

export default function SuperChat() {
  const [mode, setMode] = useState('one'); // 'one' | 'bulk'
  const [chats, setChats] = useState([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [chatsError, setChatsError] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [selectedChat, setSelectedChat] = useState(null);

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [bulkSelected, setBulkSelected] = useState([]);
  const [bulkDraft, setBulkDraft] = useState('');
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkError, setBulkError] = useState('');
  const [bulkUserType, setBulkUserType] = useState(''); // '' | 'customer' | 'serviceProvider'

  const bottomRef = useRef(null);
  const mobileShowThread = Boolean(selectedChat) && mode === 'one';

  useEffect(() => {
    setChatsLoading(true);
    const unsub = superChatService.subscribeToChats(({ chats: next, error }) => {
      setChats(next);
      setChatsError(error || '');
      setChatsLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (mode !== 'one' || !selectedChat?.userId) {
      setMessages([]);
      return undefined;
    }

    setMessagesLoading(true);
    setSendError('');
    const unsub = superChatService.subscribeToMessages(
      selectedChat.userId,
      ({ messages: next, error }) => {
        setMessages(next);
        setMessagesLoading(false);
        if (error) setSendError(error);
        superChatService.markAdminRead(selectedChat.userId).catch(() => {});
      }
    );
    return unsub;
  }, [selectedChat?.userId, mode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, selectedChat?.userId]);

  useEffect(() => {
    if (!newChatOpen && mode !== 'bulk') return undefined;
    setUsersLoading(true);
    const q = query(collection(db, 'users'), limit(500));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((docSnap) => {
          const d = docSnap.data() || {};
          return {
            uid: docSnap.id,
            fullName: (d.fullName || d.displayName || '').toString(),
            email: (d.email || '').toString(),
            phoneNumber: (d.phoneNumber || '').toString(),
            userType: (d.userType || '').toString(),
          };
        });
        setAllUsers(rows);
        setUsersLoading(false);
      },
      () => setUsersLoading(false)
    );
    return () => unsub();
  }, [newChatOpen, mode]);

  const filteredChats = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(
      (c) =>
        c.userName.toLowerCase().includes(q) ||
        c.userEmail.toLowerCase().includes(q) ||
        c.userId.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q)
    );
  }, [chats, listSearch]);

  const filteredUsers = useMemo(() => {
    const q = (mode === 'bulk' ? listSearch : userSearch).trim().toLowerCase();
    let rows = allUsers;
    if (mode === 'bulk' && bulkUserType) {
      rows = rows.filter((u) => u.userType === bulkUserType);
    }
    if (q) {
      rows = rows.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.phoneNumber.includes(mode === 'bulk' ? listSearch : userSearch) ||
          u.uid.toLowerCase().includes(q)
      );
    }
    return rows.slice(0, mode === 'bulk' ? 80 : 40);
  }, [allUsers, userSearch, listSearch, mode, bulkUserType]);

  const bulkSelectedUsers = useMemo(
    () => allUsers.filter((u) => bulkSelected.includes(u.uid)),
    [allUsers, bulkSelected]
  );

  const totalUnread = useMemo(
    () => chats.reduce((sum, c) => sum + (c.adminUnreadCount > 0 ? c.adminUnreadCount : 0), 0),
    [chats]
  );

  const openChat = (chat) => {
    setMode('one');
    setSelectedChat(chat);
    setDraft('');
    setSendError('');
    setNewChatOpen(false);
  };

  const startChatWithUser = (user) => {
    const existing = chats.find((c) => c.userId === user.uid);
    if (existing) {
      openChat(existing);
      return;
    }
    openChat({
      id: user.uid,
      userId: user.uid,
      userName: user.fullName || user.email || user.phoneNumber || 'User',
      userEmail: user.email || '',
      userType: user.userType || '',
      lastMessage: '',
      adminUnreadCount: 0,
      updatedAt: null,
    });
  };

  const toggleBulkUser = (uid) => {
    setBulkSelected((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
    setBulkResult(null);
  };

  const handleSend = async () => {
    if (!selectedChat?.userId || !draft.trim() || sending) return;
    setSending(true);
    setSendError('');
    try {
      await superChatService.sendAdminMessage(
        {
          uid: selectedChat.userId,
          fullName: selectedChat.userName,
          email: selectedChat.userEmail,
          userType: selectedChat.userType,
        },
        draft.trim()
      );
      setDraft('');
    } catch (e) {
      setSendError(e.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleBulkSend = async () => {
    if (!bulkDraft.trim() || bulkSelectedUsers.length === 0 || bulkSending) return;
    const ok = window.confirm(
      `Send this Super Chat message to ${bulkSelectedUsers.length} user(s)?`
    );
    if (!ok) return;

    setBulkSending(true);
    setBulkError('');
    setBulkResult(null);
    try {
      const res = await superChatService.sendBulkAdminMessage(
        bulkSelectedUsers,
        bulkDraft.trim()
      );
      setBulkResult(res);
      setBulkDraft('');
      setBulkSelected([]);
    } catch (e) {
      setBulkError(e.message || 'Bulk send failed');
    } finally {
      setBulkSending(false);
    }
  };

  return (
    <div className="super-chat-page">
      <header className="super-chat-page__header">
        <div>
          <h1>Super Chat</h1>
          <p>One-to-one or bulk messages (users see them under Messages from PIDO).</p>
        </div>
        <div className="super-chat-page__header-right">
          {totalUnread > 0 && mode === 'one' && (
            <div className="super-chat-page__unread-pill">{totalUnread} unread</div>
          )}
          <div className="super-chat-mode-toggle" role="group" aria-label="Chat mode">
            <button
              type="button"
              className={`super-chat-mode-btn ${mode === 'one' ? 'active' : ''}`}
              onClick={() => setMode('one')}
            >
              1:1 chat
            </button>
            <button
              type="button"
              className={`super-chat-mode-btn ${mode === 'bulk' ? 'active' : ''}`}
              onClick={() => {
                setMode('bulk');
                setSelectedChat(null);
                setNewChatOpen(false);
                setBulkResult(null);
                setBulkError('');
              }}
            >
              Bulk send
            </button>
          </div>
        </div>
      </header>

      {mode === 'bulk' ? (
        <div className="super-chat-bulk">
          <section className="super-chat-bulk__pick">
            <div className="super-chat-bulk__toolbar">
              <div className="super-chat-inbox__search">
                <Search size={16} />
                <input
                  type="text"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder="Search users to select…"
                />
              </div>
              <select
                className="super-chat-bulk__filter"
                value={bulkUserType}
                onChange={(e) => setBulkUserType(e.target.value)}
                aria-label="Filter by user type"
              >
                <option value="">All types</option>
                <option value="customer">Customers</option>
                <option value="serviceProvider">Providers</option>
              </select>
              <span className="super-chat-bulk__count">
                {bulkSelected.length} selected
              </span>
            </div>

            {bulkSelectedUsers.length > 0 && (
              <div className="super-chat-bulk__chips">
                {bulkSelectedUsers.map((u) => (
                  <span key={u.uid} className="super-chat-bulk__chip">
                    {u.fullName || u.email || u.phoneNumber || 'User'}
                    <button type="button" onClick={() => toggleBulkUser(u.uid)} aria-label="Remove">
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  className="super-chat-bulk__clear"
                  onClick={() => setBulkSelected([])}
                >
                  Clear all
                </button>
              </div>
            )}

            <div className="super-chat-bulk__list">
              {usersLoading ? (
                <div className="super-chat-empty">
                  <Loader2 size={18} className="spin" /> Loading users…
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="super-chat-empty">No users found</div>
              ) : (
                filteredUsers.map((u) => {
                  const checked = bulkSelected.includes(u.uid);
                  return (
                    <label
                      key={u.uid}
                      className={`super-chat-bulk__row ${checked ? 'is-selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleBulkUser(u.uid)}
                      />
                      <span className="super-chat-bulk__name">
                        {u.fullName || u.email || u.phoneNumber || 'User'}
                      </span>
                      <span className="super-chat-bulk__meta">
                        {u.email || u.phoneNumber || u.uid.slice(0, 8)}
                        {u.userType ? ` · ${formatUserType(u.userType)}` : ''}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </section>

          <section className="super-chat-bulk__compose">
            {bulkResult?.success ? (
              <div className="super-chat-bulk__success">
                <CheckCircle size={28} />
                <h3>Messages sent</h3>
                <p>{bulkResult.message}</p>
                {bulkResult.result && (
                  <p className="super-chat-bulk__success-meta">
                    {bulkResult.result.successCount} delivered
                    {bulkResult.result.failureCount
                      ? ` · ${bulkResult.result.failureCount} failed`
                      : ''}
                  </p>
                )}
                <button
                  type="button"
                  className="super-chat-pane__send"
                  onClick={() => setBulkResult(null)}
                >
                  Send another
                </button>
              </div>
            ) : (
              <>
                <h2>Bulk Super Chat</h2>
                <p className="super-chat-bulk__hint">
                  Same message is delivered as a 1:1 Super Chat to each selected user (with push).
                </p>
                <textarea
                  rows={8}
                  value={bulkDraft}
                  onChange={(e) => setBulkDraft(e.target.value)}
                  placeholder="Write the message to send to all selected users…"
                />
                <button
                  type="button"
                  className="super-chat-pane__send super-chat-bulk__send"
                  onClick={handleBulkSend}
                  disabled={
                    bulkSending || !bulkDraft.trim() || bulkSelectedUsers.length === 0
                  }
                >
                  {bulkSending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                  {bulkSending
                    ? 'Sending…'
                    : `Send to ${bulkSelectedUsers.length || 0} user${
                        bulkSelectedUsers.length === 1 ? '' : 's'
                      }`}
                </button>
                {bulkError ? <div className="super-chat-pane__error">{bulkError}</div> : null}
              </>
            )}
          </section>
        </div>
      ) : (
        <div className={`super-chat-shell ${mobileShowThread ? 'super-chat-shell--thread' : ''}`}>
          <aside className="super-chat-inbox">
            <div className="super-chat-inbox__toolbar">
              <div className="super-chat-inbox__search">
                <Search size={16} />
                <input
                  type="text"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder="Search conversations…"
                />
              </div>
              <button
                type="button"
                className="super-chat-inbox__new"
                onClick={() => {
                  setNewChatOpen((v) => !v);
                  setUserSearch('');
                }}
              >
                <Users size={16} />
                New
              </button>
            </div>

            {newChatOpen && (
              <div className="super-chat-new">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Find a user by name, email, phone…"
                  autoFocus
                />
                <div className="super-chat-new__list">
                  {usersLoading ? (
                    <div className="super-chat-empty">
                      <Loader2 size={16} className="spin" /> Loading users…
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="super-chat-empty">No users found</div>
                  ) : (
                    filteredUsers.map((u) => (
                      <button
                        key={u.uid}
                        type="button"
                        className="super-chat-new__row"
                        onClick={() => startChatWithUser(u)}
                      >
                        <span className="super-chat-new__name">
                          {u.fullName || u.email || u.phoneNumber || 'User'}
                        </span>
                        <span className="super-chat-new__meta">
                          {u.email || u.phoneNumber || u.uid.slice(0, 8)}
                          {u.userType ? ` · ${formatUserType(u.userType)}` : ''}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="super-chat-inbox__list">
              {chatsLoading ? (
                <div className="super-chat-empty">
                  <Loader2 size={18} className="spin" /> Loading chats…
                </div>
              ) : chatsError ? (
                <div className="super-chat-empty super-chat-empty--error">{chatsError}</div>
              ) : filteredChats.length === 0 ? (
                <div className="super-chat-empty">
                  No conversations yet. Click <strong>New</strong> to message a user.
                </div>
              ) : (
                filteredChats.map((chat) => {
                  const active = selectedChat?.userId === chat.userId;
                  const unread = chat.adminUnreadCount > 0;
                  return (
                    <button
                      key={chat.id}
                      type="button"
                      className={`super-chat-thread ${active ? 'super-chat-thread--active' : ''} ${
                        unread ? 'super-chat-thread--unread' : ''
                      }`}
                      onClick={() => openChat(chat)}
                    >
                      <div className="super-chat-thread__avatar">
                        {(chat.userName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="super-chat-thread__body">
                        <div className="super-chat-thread__top">
                          <span className="super-chat-thread__name">{chat.userName}</span>
                          <span className="super-chat-thread__time">
                            {formatTime(chat.updatedAt)}
                          </span>
                        </div>
                        <div className="super-chat-thread__preview">
                          {chat.lastMessage || 'No messages yet'}
                        </div>
                      </div>
                      {unread && (
                        <span className="super-chat-thread__badge">{chat.adminUnreadCount}</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className="super-chat-pane">
            {!selectedChat ? (
              <div className="super-chat-pane__empty">
                <MessageSquare size={40} />
                <h2>Select a conversation</h2>
                <p>Pick a chat from the list, or start a new one with any user.</p>
              </div>
            ) : (
              <>
                <div className="super-chat-pane__header">
                  <button
                    type="button"
                    className="super-chat-pane__back"
                    onClick={() => setSelectedChat(null)}
                    aria-label="Back to list"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <strong>{selectedChat.userName}</strong>
                    <div className="super-chat-pane__sub">
                      {selectedChat.userEmail || selectedChat.userId}
                      {selectedChat.userType
                        ? ` · ${formatUserType(selectedChat.userType)}`
                        : ''}
                    </div>
                  </div>
                </div>

                <div className="super-chat-pane__messages">
                  {messagesLoading ? (
                    <div className="super-chat-empty">
                      <Loader2 size={18} className="spin" /> Loading messages…
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="super-chat-empty">
                      No messages yet. Say hello below — the user sees this under Messages from PIDO.
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isAdmin = msg.senderRole === 'admin';
                      return (
                        <div
                          key={msg.id}
                          className={`super-chat-bubble ${
                            isAdmin ? 'super-chat-bubble--admin' : 'super-chat-bubble--user'
                          }`}
                        >
                          <div className="super-chat-bubble__meta">
                            {msg.senderName || (isAdmin ? 'PIDO Admin' : 'User')}
                            {msg.timestamp?.toDate
                              ? ` · ${formatTime(msg.timestamp.toDate())}`
                              : ''}
                          </div>
                          <div className="super-chat-bubble__text">{msg.message}</div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                <div className="super-chat-pane__composer">
                  <textarea
                    rows={2}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type a message… (Enter to send)"
                  />
                  <button
                    type="button"
                    className="super-chat-pane__send"
                    onClick={handleSend}
                    disabled={sending || !draft.trim()}
                  >
                    {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                    Send
                  </button>
                </div>

                {sendError ? <div className="super-chat-pane__error">{sendError}</div> : null}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
