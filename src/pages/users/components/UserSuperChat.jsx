import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { superChatService } from '../../../core/services/superChatService.js';

export default function UserSuperChat({ user }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) return undefined;
    setLoading(true);
    const unsub = superChatService.subscribeToMessages(user.uid, ({ messages: next, error: err }) => {
      setMessages(next);
      setError(err || '');
      setLoading(false);
      superChatService.markAdminRead(user.uid).catch(() => {});
    });
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      await superChatService.sendAdminMessage(user, draft.trim());
      setDraft('');
    } catch (e) {
      setError(e.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="user-super-chat">
      <div className="user-super-chat__header">
        <MessageSquare size={16} />
        <span>Super Chat</span>
      </div>
      <p className="user-super-chat__hint">
        Direct chat with this user in the app under Profile → Messages from PIDO.
      </p>

      <div className="user-super-chat__messages">
        {loading ? (
          <div className="user-super-chat__loading">
            <Loader2 size={18} className="spin" /> Loading chat…
          </div>
        ) : messages.length === 0 ? (
          <div className="user-super-chat__empty">No messages yet. Start the conversation below.</div>
        ) : (
          messages.map((msg) => {
            const isAdmin = msg.senderRole === 'admin';
            return (
              <div
                key={msg.id}
                className={`user-super-chat__bubble ${isAdmin ? 'user-super-chat__bubble--admin' : 'user-super-chat__bubble--user'}`}
              >
                <div className="user-super-chat__bubble-meta">
                  {msg.senderName || (isAdmin ? 'Admin' : 'User')}
                </div>
                <div>{msg.message}</div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="user-super-chat__composer">
        <textarea
          className="push-textarea"
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message to this user…"
        />
        <button
          type="button"
          className="push-send-btn"
          onClick={handleSend}
          disabled={sending || !draft.trim()}
        >
          {sending ? 'Sending…' : (
            <>
              <Send size={14} /> Send Chat
            </>
          )}
        </button>
      </div>

      {error ? <div className="push-result error">{error}</div> : null}
    </div>
  );
}
