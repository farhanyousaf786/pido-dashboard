import React, { useEffect, useMemo, useState } from 'react';
import {
  Mail,
  MessageSquare,
  Users,
  Send,
  Search,
  Loader,
  AlertCircle,
  CheckCircle,
  UserPlus,
  UserMinus,
  X,
  ChevronDown,
  ChevronUp,
  List,
  Clock,
  Plus,
  Trash2,
  FileText,
  Save,
} from 'lucide-react';
import { collection, limit, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../core/firebase/firebaseConfig.js';
import { bulkMessagingService } from '../../core/services/bulkMessagingService.js';
import { emailService } from '../../core/services/emailService.js';
import { useAuth } from '../../core/auth/AuthContext';
import './BulkMessaging.css';

const DEFAULT_FILTERS = {
  userType: '',
  accountStatus: '',
  signupMethod: '',
  searchQuery: '',
  isOnline: '',
  signupComplete: false,
  profileComplete: false,
  excludeTestUsers: true,
};

function isPlaceholderEmail(email, phone) {
  const e = String(email || '').trim().toLowerCase();
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits || !e) return false;
  return e === `${digits}@gmail.com`;
}

function hasRealEmail(user) {
  const email = String(user.email || '').trim();
  if (!email.includes('@')) return false;
  return !isPlaceholderEmail(email, user.phoneNumber);
}

function isValidManualEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!e || !e.includes('@')) return false;
  const [local, domain] = e.split('@');
  return Boolean(local && domain && domain.includes('.'));
}

function formatUserType(type) {
  if (type === 'serviceProvider') return 'Provider';
  if (type === 'customer') return 'Customer';
  return type || '—';
}

function UserBrowserModal({
  open,
  onClose,
  users,
  loading,
  search,
  onSearchChange,
  selection,
  onToggle,
  onInclude,
  onExclude,
  filteredUsers,
}) {
  if (!open) return null;

  return (
    <div className="bulk-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="bulk-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-user-modal-title"
      >
        <div className="bulk-modal__header">
          <div>
            <h2 id="bulk-user-modal-title">Browse users</h2>
            <p>Search and select users to always include or exclude from this send.</p>
          </div>
          <button type="button" className="bulk-modal__close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="bulk-modal__search">
          <Search size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, email, phone, or user ID…"
            autoFocus
          />
        </div>

        <div className="bulk-modal__toolbar">
          <span className="bulk-modal__count">
            {selection.length > 0 ? `${selection.length} selected` : 'No users selected'}
          </span>
          <div className="bulk-modal__toolbar-actions">
            <button
              type="button"
              className="bulk-btn bulk-btn-outline bulk-btn--include"
              disabled={selection.length === 0}
              onClick={onInclude}
            >
              <UserPlus size={16} />
              Include
            </button>
            <button
              type="button"
              className="bulk-btn bulk-btn-outline bulk-btn--exclude"
              disabled={selection.length === 0}
              onClick={onExclude}
            >
              <UserMinus size={16} />
              Exclude
            </button>
          </div>
        </div>

        <div className="bulk-modal__body">
          {loading ? (
            <div className="bulk-modal__empty">
              <Loader size={24} className="spinning" />
              <span>Loading users…</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bulk-modal__empty">No users match your search.</div>
          ) : (
            <table className="bulk-user-table">
              <thead>
                <tr>
                  <th aria-label="Select" />
                  <th>Name</th>
                  <th>Email</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className={selection.includes(u.id) ? 'bulk-user-table__row--selected' : ''}
                    onClick={() => onToggle(u.id)}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selection.includes(u.id)}
                        onChange={() => onToggle(u.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="bulk-user-table__name">{u.name}</td>
                    <td className="bulk-user-table__email">
                      {u.hasRealEmail ? u.email : <span className="bulk-tag bulk-tag--muted">No email</span>}
                    </td>
                    <td>
                      {u.userType ? (
                        <span className="bulk-tag">{formatUserType(u.userType)}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bulk-modal__footer">
          <button type="button" className="bulk-btn bulk-btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BulkMessaging() {
  const { adminTestMode, user } = useAuth();
  const [channel, setChannel] = useState('email');
  const [audienceMode, setAudienceMode] = useState('only_selected');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [includeUserIds, setIncludeUserIds] = useState([]);
  const [excludeUserIds, setExcludeUserIds] = useState([]);
  const [extraEmails, setExtraEmails] = useState([]);
  const [manualEmail, setManualEmail] = useState('');
  const [includeLabels, setIncludeLabels] = useState({});
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerSelection, setPickerSelection] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [recipientsOpen, setRecipientsOpen] = useState(false);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [emailReady, setEmailReady] = useState(null);
  const [emailStatusError, setEmailStatusError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDeletingId, setHistoryDeletingId] = useState('');

  const [welcomeType, setWelcomeType] = useState('customer');
  const [welcomeTemplates, setWelcomeTemplates] = useState(null);
  const [welcomeLoading, setWelcomeLoading] = useState(false);
  const [welcomeSaving, setWelcomeSaving] = useState(false);
  const [welcomeSaveMsg, setWelcomeSaveMsg] = useState('');
  const [welcomeHistory, setWelcomeHistory] = useState([]);
  const [welcomeHistoryLoading, setWelcomeHistoryLoading] = useState(false);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await bulkMessagingService.getHistory(20);
      setHistory(res?.data?.campaigns || []);
    } catch {
      // History is optional — don't block the page
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadWelcomeTemplate = async () => {
    setWelcomeLoading(true);
    setWelcomeSaveMsg('');
    try {
      const res = await emailService.getWelcomeTemplate();
      setWelcomeTemplates(res?.data?.templates || null);
    } catch (e) {
      setWelcomeSaveMsg(e.message || 'Failed to load welcome template');
    } finally {
      setWelcomeLoading(false);
    }
  };

  const loadWelcomeHistory = async () => {
    setWelcomeHistoryLoading(true);
    try {
      const res = await emailService.getWelcomeHistory(40);
      setWelcomeHistory(res?.data?.sends || []);
    } catch {
      // optional
    } finally {
      setWelcomeHistoryLoading(false);
    }
  };

  const updateWelcomeField = (field, value) => {
    setWelcomeTemplates((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [welcomeType]: {
          ...prev[welcomeType],
          [field]: value,
        },
      };
    });
  };

  const saveWelcomeTemplate = async () => {
    if (!welcomeTemplates) return;
    setWelcomeSaving(true);
    setWelcomeSaveMsg('');
    try {
      const res = await emailService.saveWelcomeTemplate(welcomeTemplates);
      setWelcomeTemplates(res?.data?.templates || welcomeTemplates);
      setWelcomeSaveMsg('Template saved. New signups will use this copy.');
    } catch (e) {
      setWelcomeSaveMsg(e.message || 'Failed to save template');
    } finally {
      setWelcomeSaving(false);
    }
  };

  const deleteHistoryItem = async (id) => {
    if (!id || historyDeletingId) return;
    const ok = window.confirm('Remove this entry from Past emails? (Does not unsend the email.)');
    if (!ok) return;
    setHistoryDeletingId(id);
    try {
      await bulkMessagingService.deleteHistoryItem(id);
      setHistory((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      window.alert(e.message || 'Failed to delete');
    } finally {
      setHistoryDeletingId('');
    }
  };

  useEffect(() => {
    if (!user) return undefined;

    let cancelled = false;
    setEmailStatusError('');
    emailService
      .getStatus()
      .then((res) => {
        if (cancelled) return;
        const ready = res?.data?.emailReady === true;
        setEmailReady(ready);
        if (!ready) {
          setEmailStatusError(
            'SendGrid keys are missing on the live API. Check functions/.env and redeploy.'
          );
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setEmailReady(false);
        setEmailStatusError(e.message || 'Could not check email status');
      });

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (channel !== 'welcome') return;
    loadWelcomeTemplate();
    loadWelcomeHistory();
  }, [channel]);

  useEffect(() => {
    setUsersLoading(true);
    const q = query(collection(db, 'users'), limit(1000));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((doc) => {
          const d = doc.data() || {};
          return {
            id: doc.id,
            name: (d.fullName || d.displayName || d.email || d.phoneNumber || 'User').toString(),
            email: (d.email || '').toString(),
            phoneNumber: (d.phoneNumber || '').toString(),
            userType: (d.userType || '').toString(),
            isTestUser: d.isTestUser === true,
            hasRealEmail: hasRealEmail({ email: d.email, phoneNumber: d.phoneNumber }),
          };
        });
        setAllUsers(rows);
        setUsersLoading(false);
      },
      () => setUsersLoading(false)
    );
    return () => unsub();
  }, []);

  const effectiveFilters = useMemo(() => {
    const f = { ...filters };
    if (!adminTestMode) f.excludeTestUsers = true;
    if (f.isOnline === 'true') f.isOnline = true;
    else if (f.isOnline === 'false') f.isOnline = false;
    else delete f.isOnline;
    if (!f.signupComplete) delete f.signupComplete;
    if (!f.profileComplete) delete f.profileComplete;
    return f;
  }, [filters, adminTestMode]);

  const audiencePayload = useMemo(
    () => ({
      audienceMode,
      filters: effectiveFilters,
      includeUserIds,
      excludeUserIds,
      extraEmails,
    }),
    [audienceMode, effectiveFilters, includeUserIds, excludeUserIds, extraEmails]
  );

  const filteredPickerUsers = useMemo(() => {
    let rows = [...allUsers].filter((u) => u.hasRealEmail);
    if (!adminTestMode || filters.excludeTestUsers !== false) {
      rows = rows.filter((u) => !u.isTestUser);
    }
    if (filters.userType) rows = rows.filter((u) => u.userType === filters.userType);
    if (pickerSearch.trim()) {
      const q = pickerSearch.toLowerCase();
      rows = rows.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.phoneNumber.includes(pickerSearch) ||
          u.id.toLowerCase().includes(q)
      );
    }
    return rows.slice(0, 100);
  }, [allUsers, pickerSearch, filters.userType, filters.excludeTestUsers, adminTestMode]);

  const includeUsers = useMemo(() => {
    return includeUserIds.map((id) => {
      const u = allUsers.find((row) => row.id === id);
      return {
        id,
        name: u?.name || includeLabels[id] || `${id.slice(0, 8)}…`,
        email: u?.email || includeLabels[`${id}:email`] || '',
      };
    });
  }, [allUsers, includeUserIds, includeLabels]);

  const excludeUsers = useMemo(() => {
    return excludeUserIds.map((id) => {
      const u = allUsers.find((row) => row.id === id);
      return {
        id,
        name: u?.name || includeLabels[id] || `${id.slice(0, 8)}…`,
        email: u?.email || '',
      };
    });
  }, [allUsers, excludeUserIds, includeLabels]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setResult(null);
  };

  const toggleIncludeUser = (userRow) => {
    const id = userRow.id;
    const isIncluded = includeUserIds.includes(id);
    if (isIncluded) {
      setIncludeUserIds((prev) => prev.filter((x) => x !== id));
      return;
    }
    setIncludeLabels((prev) => ({
      ...prev,
      [id]: userRow.name,
      [`${id}:email`]: userRow.email || '',
    }));
    setIncludeUserIds((prev) => [...new Set([...prev, id])]);
    setExcludeUserIds((prev) => prev.filter((x) => x !== id));
    setResult(null);
  };

  const togglePickerUser = (id) => {
    setPickerSelection((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const addPickerToInclude = () => {
    const labels = {};
    pickerSelection.forEach((id) => {
      const u = allUsers.find((row) => row.id === id);
      if (u) {
        labels[id] = u.name;
        if (u.email) labels[`${id}:email`] = u.email;
      }
    });
    setIncludeLabels((prev) => ({ ...prev, ...labels }));
    setIncludeUserIds((prev) => [...new Set([...prev, ...pickerSelection])]);
    setExcludeUserIds((prev) => prev.filter((id) => !pickerSelection.includes(id)));
    setPickerSelection([]);
  };

  const addPickerToExclude = () => {
    setExcludeUserIds((prev) => [...new Set([...prev, ...pickerSelection])]);
    setIncludeUserIds((prev) => prev.filter((id) => !pickerSelection.includes(id)));
    setPickerSelection([]);
  };

  const addManualEmail = () => {
    const email = manualEmail.trim().toLowerCase();
    if (!isValidManualEmail(email)) {
      setResult({ success: false, message: 'Enter a valid email address' });
      return;
    }

    const matched = allUsers.find((u) => u.email.toLowerCase() === email);
    if (matched) {
      setIncludeLabels((prev) => ({
        ...prev,
        [matched.id]: matched.name,
        [`${matched.id}:email`]: matched.email,
      }));
      setIncludeUserIds((prev) => [...new Set([...prev, matched.id])]);
      setExcludeUserIds((prev) => prev.filter((id) => id !== matched.id));
      setExtraEmails((prev) => prev.filter((e) => e !== email));
    } else {
      setExtraEmails((prev) => (prev.includes(email) ? prev : [...prev, email]));
    }
    setManualEmail('');
    setResult(null);
  };

  const removeInclude = (id) => {
    setIncludeUserIds((prev) => prev.filter((x) => x !== id));
  };

  const removeExtraEmail = (email) => {
    setExtraEmails((prev) => prev.filter((e) => e !== email));
  };

  const removeExclude = (id) => {
    setExcludeUserIds((prev) => prev.filter((x) => x !== id));
  };

  const clearSelectedIncludes = () => {
    setIncludeUserIds([]);
    setExtraEmails([]);
  };

  const toggleExcludeFromPreview = (recipient) => {
    if (recipient?.manual || !recipient?.uid) {
      const email = String(recipient?.rawEmail || recipient?.email || '')
        .trim()
        .toLowerCase();
      if (!email || email.includes('*')) {
        // Fallback: drop matching extra email by exact rawEmail only
        return;
      }
      setExtraEmails((prev) => prev.filter((e) => e !== email));
      return;
    }
    const uid = recipient.uid;
    setExcludeUserIds((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    );
  };

  useEffect(() => {
    if (channel !== 'email' || emailReady !== true) return undefined;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await bulkMessagingService.previewBulkEmail(audiencePayload);
        if (!cancelled) {
          setPreview(res.data);
        }
      } catch (e) {
        if (!cancelled) {
          setResult({ success: false, message: e.message || 'Could not load audience' });
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [channel, emailReady, audiencePayload]);

  const handleSend = async () => {
    if (channel !== 'email') return;
    if (!subject.trim() || !message.trim()) {
      setResult({ success: false, message: 'Subject and message are required' });
      return;
    }

    const count = preview?.totalRecipients ?? 0;
    if (count <= 0) {
      setResult({
        success: false,
        message: 'No eligible recipients. Adjust filters or review the recipient list.',
      });
      return;
    }

    const ok = window.confirm(`Send this email to ${count} user(s)?`);
    if (!ok) return;

    setSendLoading(true);
    setResult(null);
    try {
      const res = await bulkMessagingService.sendBulkEmail({
        ...audiencePayload,
        subject: subject.trim(),
        message: message.trim(),
      });
      setResult({
        success: true,
        message: res.message || 'Sent successfully',
        details: res.result,
        campaignId: res.campaignId,
      });
      setSubject('');
      setMessage('');
      loadHistory();
    } catch (e) {
      setResult({ success: false, message: e.message || 'Send failed' });
    } finally {
      setSendLoading(false);
    }
  };

  const openUserModal = () => {
    setPickerSelection([]);
    setPickerSearch('');
    setUserModalOpen(true);
  };

  return (
    <div className="bulk-messaging-container">
      <header className="bulk-messaging-header">
        <div>
          <h1>Bulk Messaging</h1>
          <p>Build your audience with filters, then fine-tune with include and exclude lists.</p>
        </div>
        {channel === 'email' && (
          <div className="bulk-header-stat">
            {previewLoading ? (
              <Loader size={22} className="spinning bulk-header-stat__loader" />
            ) : (
              <span className="bulk-header-stat__value">{preview?.totalRecipients ?? '—'}</span>
            )}
            <span className="bulk-header-stat__label">recipients selected</span>
          </div>
        )}
      </header>

      <div className="bulk-channel-tabs">
        <button
          type="button"
          className={`tab-btn ${channel === 'email' ? 'active' : ''}`}
          onClick={() => setChannel('email')}
        >
          <Mail size={16} />
          Email
        </button>
        <button
          type="button"
          className={`tab-btn ${channel === 'welcome' ? 'active' : ''}`}
          onClick={() => setChannel('welcome')}
        >
          <FileText size={16} />
          Welcome email
        </button>
        <button type="button" className="tab-btn" disabled title="Coming soon">
          <MessageSquare size={16} />
          SMS (soon)
        </button>
      </div>

      {channel === 'email' && emailReady === false && (
        <div className="bulk-banner bulk-banner--error">
          <AlertCircle size={18} />
          {emailStatusError ||
            'SendGrid is not configured. Email sending is unavailable until API keys are set.'}
        </div>
      )}

      {channel === 'welcome' ? (
        <div className="bulk-welcome">
          <div className="bulk-banner bulk-banner--info">
            <CheckCircle size={18} />
            <div>
              Welcome emails send automatically when a user finishes signup (customer after personal
              info; provider after profile complete). Edit the template below — use{' '}
              <code>{'{{name}}'}</code> for the recipient name.
            </div>
          </div>

          <div className="bulk-main">
            <section className="bulk-panel">
              <div className="bulk-panel__head">
                <FileText size={18} />
                <h2>Template</h2>
              </div>

              <div className="bulk-welcome__type-toggle" role="group" aria-label="Welcome template type">
                <button
                  type="button"
                  className={`bulk-mode-btn ${welcomeType === 'customer' ? 'active' : ''}`}
                  onClick={() => setWelcomeType('customer')}
                >
                  Customer
                </button>
                <button
                  type="button"
                  className={`bulk-mode-btn ${welcomeType === 'serviceProvider' ? 'active' : ''}`}
                  onClick={() => setWelcomeType('serviceProvider')}
                >
                  Provider
                </button>
              </div>

              {welcomeLoading || !welcomeTemplates ? (
                <p className="bulk-muted">
                  {welcomeLoading ? 'Loading template…' : 'No template loaded'}
                </p>
              ) : (
                <>
                  <div className="bulk-field">
                    <label htmlFor="welcome-subject">Subject</label>
                    <input
                      id="welcome-subject"
                      type="text"
                      value={welcomeTemplates[welcomeType]?.subject || ''}
                      onChange={(e) => updateWelcomeField('subject', e.target.value)}
                    />
                  </div>
                  <div className="bulk-field">
                    <label htmlFor="welcome-title">Email title</label>
                    <input
                      id="welcome-title"
                      type="text"
                      value={welcomeTemplates[welcomeType]?.title || ''}
                      onChange={(e) => updateWelcomeField('title', e.target.value)}
                    />
                  </div>
                  <div className="bulk-field">
                    <label htmlFor="welcome-body">Body</label>
                    <textarea
                      id="welcome-body"
                      rows={14}
                      value={welcomeTemplates[welcomeType]?.body || ''}
                      onChange={(e) => updateWelcomeField('body', e.target.value)}
                    />
                  </div>
                  <div className="bulk-welcome__actions">
                    <button
                      type="button"
                      className="bulk-btn bulk-btn-primary"
                      onClick={saveWelcomeTemplate}
                      disabled={welcomeSaving}
                    >
                      {welcomeSaving ? <Loader size={16} className="spinning" /> : <Save size={16} />}
                      {welcomeSaving ? 'Saving…' : 'Save template'}
                    </button>
                    {welcomeSaveMsg ? (
                      <span className="bulk-muted">{welcomeSaveMsg}</span>
                    ) : null}
                  </div>
                </>
              )}
            </section>

            <section className="bulk-panel bulk-history">
              <div className="bulk-panel__head">
                <Clock size={18} />
                <h2>Welcome email record</h2>
                <button
                  type="button"
                  className="bulk-btn bulk-btn-outline bulk-history__refresh"
                  onClick={loadWelcomeHistory}
                  disabled={welcomeHistoryLoading}
                >
                  {welcomeHistoryLoading ? <Loader size={14} className="spinning" /> : null}
                  Refresh
                </button>
              </div>

              {welcomeHistoryLoading && welcomeHistory.length === 0 ? (
                <p className="bulk-muted">Loading record…</p>
              ) : welcomeHistory.length === 0 ? (
                <p className="bulk-muted">
                  No welcome emails logged yet. New signup sends will appear here.
                </p>
              ) : (
                <div className="bulk-history-list">
                  {welcomeHistory.map((row) => (
                    <article key={row.id} className="bulk-history-item">
                      <div className="bulk-history-item__main">
                        <strong>{row.subject || 'Welcome email'}</strong>
                        <span
                          className={`bulk-history-status ${
                            row.status === 'failed'
                              ? 'bulk-history-status--warn'
                              : 'bulk-history-status--ok'
                          }`}
                        >
                          {row.status === 'failed' ? 'Failed' : 'Sent'}
                        </span>
                      </div>
                      <p className="bulk-history-item__preview">
                        {row.recipientName || 'User'} · {row.email || 'no email'}
                      </p>
                      <div className="bulk-history-item__meta">
                        <span>{formatUserType(row.userType)}</span>
                        <span>
                          {row.source === 'admin_manual' ? 'Sent by admin' : 'Auto on signup'}
                        </span>
                        <span>
                          {row.createdAt
                            ? new Date(row.createdAt).toLocaleString()
                            : 'Just now'}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      ) : channel === 'sms' ? (
        <div className="bulk-card bulk-coming-soon">
          <MessageSquare size={40} />
          <p>Bulk SMS will use the same audience rules once Twilio is connected.</p>
        </div>
      ) : (
        <>
        <div className="bulk-main">
          <section className="bulk-panel bulk-panel--audience">
            <div className="bulk-panel__head">
              <Users size={18} />
              <h2>Audience</h2>
            </div>

            <div className="bulk-field">
              <label>Mode</label>
              <div className="bulk-mode-toggle" role="group" aria-label="Audience mode">
                <button
                  type="button"
                  className={`bulk-mode-btn ${audienceMode === 'only_selected' ? 'active' : ''}`}
                  onClick={() => {
                    setAudienceMode('only_selected');
                    setResult(null);
                  }}
                >
                  Only selected users
                </button>
                <button
                  type="button"
                  className={`bulk-mode-btn ${audienceMode === 'filters' ? 'active' : ''}`}
                  onClick={() => {
                    setAudienceMode('filters');
                    setResult(null);
                  }}
                >
                  Filter by criteria
                </button>
              </div>
            </div>

            {audienceMode === 'filters' ? (
              <>
                <p className="bulk-panel__hint">
                  Users must have a real email address. Phone-placeholder emails are skipped automatically.
                </p>
                <div className="bulk-filter-grid">
                  <div className="bulk-field">
                    <label htmlFor="bulk-user-type">User type</label>
                    <select
                      id="bulk-user-type"
                      value={filters.userType}
                      onChange={(e) => handleFilterChange('userType', e.target.value)}
                    >
                      <option value="">All types</option>
                      <option value="customer">Customers</option>
                      <option value="serviceProvider">Service providers</option>
                    </select>
                  </div>
                  <div className="bulk-field">
                    <label htmlFor="bulk-account-status">Account status</label>
                    <select
                      id="bulk-account-status"
                      value={filters.accountStatus}
                      onChange={(e) => handleFilterChange('accountStatus', e.target.value)}
                    >
                      <option value="">All statuses</option>
                      <option value="approved">Approved</option>
                      <option value="pending_approval">Pending approval</option>
                      <option value="rejected">Rejected</option>
                      <option value="unverified">Unverified</option>
                    </select>
                  </div>
                  <div className="bulk-field">
                    <label htmlFor="bulk-online">Online status</label>
                    <select
                      id="bulk-online"
                      value={filters.isOnline}
                      onChange={(e) => handleFilterChange('isOnline', e.target.value)}
                    >
                      <option value="">Any</option>
                      <option value="true">Online now</option>
                      <option value="false">Offline</option>
                    </select>
                  </div>
                  <div className="bulk-field">
                    <label htmlFor="bulk-signup-method">Sign-up method</label>
                    <select
                      id="bulk-signup-method"
                      value={filters.signupMethod}
                      onChange={(e) => handleFilterChange('signupMethod', e.target.value)}
                    >
                      <option value="">Any</option>
                      <option value="social">Google / Apple</option>
                      <option value="phone">Phone sign-up</option>
                    </select>
                  </div>
                </div>

                <div className="bulk-checks">
                  <label className="bulk-check">
                    <input
                      type="checkbox"
                      checked={filters.signupComplete}
                      onChange={(e) => handleFilterChange('signupComplete', e.target.checked)}
                    />
                    Signup complete only
                  </label>
                  <label className="bulk-check">
                    <input
                      type="checkbox"
                      checked={filters.profileComplete}
                      onChange={(e) => handleFilterChange('profileComplete', e.target.checked)}
                    />
                    Profile complete only
                  </label>
                </div>

                <div className="bulk-field">
                  <label htmlFor="bulk-search-query">Search within audience</label>
                  <input
                    id="bulk-search-query"
                    type="text"
                    value={filters.searchQuery}
                    onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                    placeholder="Name, email, phone, or user ID…"
                  />
                </div>
              </>
            ) : (
              <>
                <p className="bulk-panel__hint">
                  Only users on your <strong>include list</strong> will receive this email. Check people below or add an email.
                </p>

                <div className="bulk-inline-picker">
                  <div className="bulk-inline-picker__search">
                    <Search size={16} />
                    <input
                      type="text"
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder="Search users to select…"
                    />
                  </div>
                  <div className="bulk-inline-picker__list">
                    {usersLoading ? (
                      <p className="bulk-muted">Loading users…</p>
                    ) : filteredPickerUsers.length === 0 ? (
                      <p className="bulk-muted">No users match your search.</p>
                    ) : (
                      filteredPickerUsers.map((u) => {
                        const checked = includeUserIds.includes(u.id);
                        return (
                          <label
                            key={u.id}
                            className={`bulk-inline-picker__row ${checked ? 'is-selected' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleIncludeUser(u)}
                            />
                            <span className="bulk-inline-picker__name">{u.name}</span>
                            <span className="bulk-inline-picker__meta">
                              {u.hasRealEmail ? u.email || 'email' : 'no email'}
                              {u.userType ? ` · ${formatUserType(u.userType)}` : ''}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="bulk-include-exclude">
              <div className="bulk-include-exclude__head">
                <span>Selected & manual emails</span>
                {audienceMode === 'filters' && (
                  <button type="button" className="bulk-btn bulk-btn-outline" onClick={openUserModal}>
                    <Users size={16} />
                    Browse users
                  </button>
                )}
              </div>

              <div className="bulk-manual-email">
                <label htmlFor="bulk-manual-email">Add email manually</label>
                <div className="bulk-manual-email__row">
                  <input
                    id="bulk-manual-email"
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addManualEmail();
                      }
                    }}
                    placeholder="name@example.com"
                  />
                  <button
                    type="button"
                    className="bulk-btn bulk-btn-outline bulk-btn--include"
                    onClick={addManualEmail}
                    disabled={!manualEmail.trim()}
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>
              </div>

              {(includeUserIds.length > 0 || extraEmails.length > 0 || excludeUserIds.length > 0) && (
                <div className="bulk-lists">
                  {(includeUserIds.length > 0 || extraEmails.length > 0) && (
                    <div className="bulk-list-block">
                      <div className="bulk-list-block__top">
                        <span className="bulk-list-block__label bulk-list-block__label--include">
                          Always include ({includeUserIds.length + extraEmails.length})
                        </span>
                        <button
                          type="button"
                          className="bulk-link-btn"
                          onClick={clearSelectedIncludes}
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="bulk-chips">
                        {includeUsers.map((u) => (
                          <span key={u.id} className="bulk-chip bulk-chip--include" title={u.email || u.id}>
                            <span className="bulk-chip__text">
                              {u.name}
                              {u.email ? <small>{u.email}</small> : null}
                            </span>
                            <button type="button" onClick={() => removeInclude(u.id)} aria-label="Remove">
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                        {extraEmails.map((email) => (
                          <span key={email} className="bulk-chip bulk-chip--include" title={email}>
                            <span className="bulk-chip__text">
                              {email}
                              <small>Manual email</small>
                            </span>
                            <button
                              type="button"
                              onClick={() => removeExtraEmail(email)}
                              aria-label="Remove"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {excludeUserIds.length > 0 && (
                    <div className="bulk-list-block">
                      <span className="bulk-list-block__label bulk-list-block__label--exclude">
                        Always exclude ({excludeUserIds.length})
                      </span>
                      <div className="bulk-chips">
                        {excludeUsers.map((u) => (
                          <span key={u.id} className="bulk-chip bulk-chip--exclude">
                            <span className="bulk-chip__text">{u.name}</span>
                            <button type="button" onClick={() => removeExclude(u.id)} aria-label="Remove">
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {includeUserIds.length === 0 && extraEmails.length === 0 && excludeUserIds.length === 0 && (
                <p className="bulk-muted bulk-muted--center">
                  Browse users or type an email above to build your list.
                </p>
              )}
            </div>

            <div className="bulk-audience-summary">
              {previewLoading && !preview ? (
                <div className="bulk-audience-summary__loading">
                  <Loader size={18} className="spinning" />
                  <span>Loading matching users…</span>
                </div>
              ) : preview ? (
                <>
                  <div className="bulk-preview-card">
                    <div className="bulk-preview-card__main">
                      <div className="bulk-preview-card__count">{preview.totalRecipients}</div>
                      <div>
                        <div className="bulk-preview-card__title">
                          {preview.totalRecipients === 1 ? 'user selected' : 'users selected'}
                        </div>
                        <div className="bulk-preview-card__meta">
                          {audienceMode === 'only_selected'
                            ? 'From your include list only'
                            : 'Everyone matching your filters is included'}
                          {(preview.includeCount > 0 || preview.excludeCount > 0) && (
                            <>
                              {' '}
                              · +{preview.includeCount} forced · −{preview.excludeCount} skipped
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {preview.recipients?.length > 0 && (
                      <button
                        type="button"
                        className="bulk-btn bulk-btn-outline"
                        onClick={() => setRecipientsOpen((v) => !v)}
                      >
                        <List size={16} />
                        {recipientsOpen ? 'Hide recipient list' : 'Review & remove individuals'}
                        {recipientsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    )}
                  </div>

                  {preview.totalRecipients === 0 && (
                    <div className="bulk-banner bulk-banner--warn">
                      <AlertCircle size={18} />
                      <div>
                        {audienceMode === 'only_selected'
                          ? 'No users or emails selected yet. Browse users or add an email above.'
                          : 'No users match these filters with a real email. Try loosening filters or add people manually.'}
                      </div>
                    </div>
                  )}

                  {preview.totalRecipients > 0 && !recipientsOpen && (
                    <p className="bulk-muted">
                      Open <strong>Review & remove individuals</strong> to uncheck anyone you do not want
                      to email before sending.
                    </p>
                  )}
                </>
              ) : null}
            </div>

            {preview?.recipients?.length > 0 && recipientsOpen && (
              <div className="bulk-recipients-panel">
                <p className="bulk-muted">
                  Uncheck anyone to exclude them from this send.
                  {preview.truncated ? ` Showing first 250 of ${preview.totalRecipients}.` : ''}
                </p>
                <div className="bulk-recipient-table-scroll">
                  <table className="bulk-recipient-table">
                    <thead>
                      <tr>
                        <th>Send</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.recipients.map((r) => {
                        const excluded = r.uid ? excludeUserIds.includes(r.uid) : false;
                        const rowKey = r.uid || r.rawEmail || r.email;
                        return (
                          <tr key={rowKey} className={excluded ? 'bulk-row-excluded' : ''}>
                            <td>
                              <input
                                type="checkbox"
                                checked={!excluded}
                                onChange={() => toggleExcludeFromPreview(r)}
                              />
                            </td>
                            <td>
                              {r.name}
                              {r.manual ? <span className="bulk-tag">Manual</span> : null}
                            </td>
                            <td>{r.email}</td>
                            <td>{formatUserType(r.userType)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <section className="bulk-panel bulk-panel--compose">
            <div className="bulk-panel__head">
              <Mail size={18} />
              <h2>Compose email</h2>
            </div>

            {result?.success ? (
              <div className="bulk-success-card">
                <CheckCircle size={28} />
                <div>
                  <h3>Email sent successfully</h3>
                  <p>{result.message}</p>
                  {result.details && (
                    <p className="bulk-success-card__meta">
                      {result.details.successCount} delivered
                      {result.details.failureCount
                        ? ` · ${result.details.failureCount} failed`
                        : ''}
                      {result.campaignId ? ` · Saved to history` : ''}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="bulk-btn bulk-btn-outline"
                  onClick={() => setResult(null)}
                >
                  Send another
                </button>
              </div>
            ) : (
              <>
                <div className="bulk-field">
                  <label htmlFor="bulk-subject">Subject</label>
                  <input
                    id="bulk-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="What should the subject line say?"
                  />
                </div>

                <div className="bulk-field bulk-field--grow">
                  <label htmlFor="bulk-message">Message</label>
                  <textarea
                    id="bulk-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your message here…"
                  />
                </div>

                <div className="bulk-panel__actions">
                  <button
                    type="button"
                    className="bulk-btn bulk-btn-primary bulk-btn--block"
                    onClick={handleSend}
                    disabled={
                      sendLoading ||
                      emailReady === false ||
                      previewLoading ||
                      !preview ||
                      (preview?.totalRecipients ?? 0) <= 0
                    }
                  >
                    {sendLoading ? <Loader size={16} className="spinning" /> : <Send size={16} />}
                    {sendLoading ? 'Sending…' : 'Send bulk email'}
                  </button>
                  {(preview?.totalRecipients ?? 0) <= 0 && !previewLoading && (
                    <p className="bulk-muted bulk-muted--center">
                      Select filters above — matching users are added automatically.
                    </p>
                  )}
                </div>

                {result && !result.success && (
                  <div className="bulk-banner bulk-banner--error">
                    <AlertCircle size={18} />
                    <div>{result.message}</div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        <section className="bulk-panel bulk-history">
          <div className="bulk-panel__head">
            <Clock size={18} />
            <h2>Past emails</h2>
            <button
              type="button"
              className="bulk-btn bulk-btn-outline bulk-history__refresh"
              onClick={loadHistory}
              disabled={historyLoading}
            >
              {historyLoading ? <Loader size={14} className="spinning" /> : null}
              Refresh
            </button>
          </div>

          {historyLoading && history.length === 0 ? (
            <p className="bulk-muted">Loading history…</p>
          ) : history.length === 0 ? (
            <p className="bulk-muted">No bulk emails yet. Sends will appear here.</p>
          ) : (
            <div className="bulk-history-list">
              {history.map((c) => (
                <article key={c.id} className="bulk-history-item">
                  <div className="bulk-history-item__main">
                    <strong>{c.subject || '(no subject)'}</strong>
                    <div className="bulk-history-item__actions">
                      <span
                        className={`bulk-history-status ${
                          c.failureCount > 0
                            ? 'bulk-history-status--warn'
                            : 'bulk-history-status--ok'
                        }`}
                      >
                        {c.failureCount > 0 ? 'Completed with errors' : 'Sent'}
                      </span>
                      <button
                        type="button"
                        className="bulk-history-item__delete"
                        onClick={() => deleteHistoryItem(c.id)}
                        disabled={historyDeletingId === c.id}
                        title="Delete from history"
                        aria-label="Delete from history"
                      >
                        {historyDeletingId === c.id ? (
                          <Loader size={14} className="spinning" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                  {c.messagePreview ? (
                    <p className="bulk-history-item__preview">{c.messagePreview}</p>
                  ) : null}
                  <div className="bulk-history-item__meta">
                    <span>
                      {c.successCount}/{c.totalRecipients} delivered
                    </span>
                    <span>{c.audienceMode === 'only_selected' ? 'Selected users' : 'Filters'}</span>
                    <span>
                      {c.createdAt
                        ? new Date(c.createdAt).toLocaleString()
                        : 'Just now'}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        </>
      )}

      <UserBrowserModal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        users={allUsers}
        loading={usersLoading}
        search={pickerSearch}
        onSearchChange={setPickerSearch}
        selection={pickerSelection}
        onToggle={togglePickerUser}
        onInclude={() => {
          addPickerToInclude();
        }}
        onExclude={() => {
          addPickerToExclude();
        }}
        filteredUsers={filteredPickerUsers}
      />
    </div>
  );
}
