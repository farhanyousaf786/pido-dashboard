import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  Briefcase,
  MessageSquare,
  Clock3,
  ShieldAlert,
  Trash2,
  Ban,
  ShieldOff,
  Link2,
  Phone,
  Mail,
  AtSign,
  Quote,
} from 'lucide-react';
import { ChatModerationEventHelpers } from '../../../core/models/ChatModerationEvent.js';
import { chatSafetyService } from '../../../core/services/chatSafetyService.js';
import { useAuth } from '../../../core/auth/AuthContext.jsx';

function formatDate(timestamp) {
  if (!timestamp) return '—';
  if (timestamp.toDate) {
    return timestamp.toDate().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }
  return '—';
}

function formatBlockReason(reason) {
  if (!reason) return 'No reason recorded';
  return reason.replace(/off-platform platform reference/gi, 'off-platform reference');
}

function ViolationTypeChips({ types }) {
  if (!types?.length) {
    return <span className="chat-safety-muted">None detected</span>;
  }

  const iconFor = (type) => {
    if (type === 'phone') return Phone;
    if (type === 'email') return Mail;
    if (type === 'url') return Link2;
    if (type === 'social') return AtSign;
    return AlertTriangle;
  };

  return (
    <div className="chat-safety-type-chips">
      {types.map((type) => {
        const Icon = iconFor(type);
        return (
          <span key={type} className={`chat-safety-type-chip chat-safety-type-chip--${type}`}>
            <Icon size={12} />
            {type}
          </span>
        );
      })}
    </div>
  );
}

function SourceBadge({ source }) {
  const isReport = source === 'user_report';
  return (
    <span className={`chat-safety-source chat-safety-source--${isReport ? 'report' : 'block'}`}>
      {isReport ? 'User report' : 'Auto blocked'}
    </span>
  );
}

function SeverityBadge({ severity }) {
  const cls = ChatModerationEventHelpers.severityClass(severity);
  return (
    <span className={`chat-safety-severity chat-safety-severity--${cls}`}>
      {severity || 'low'}
    </span>
  );
}

export default function ChatFlagDetail({ event, onBack, onUpdated, onDeleted }) {
  const { user } = useAuth();
  const [liveEvent, setLiveEvent] = useState(event);
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({
    violationCount: 0,
    chatSuspendedUntil: null,
    accountStatus: null,
    suspendedUntil: null,
  });
  const [adminNote, setAdminNote] = useState(event?.adminNote ?? '');
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [loadingContext, setLoadingContext] = useState(true);

  const displayed = liveEvent || event;

  useEffect(() => {
    if (!event?.id) return;
    const unsub = chatSafetyService.subscribeToEvent(event.id, setLiveEvent);
    return () => unsub();
  }, [event?.id]);

  useEffect(() => {
    if (!displayed) return;
    setAdminNote(displayed.adminNote ?? '');

    let cancelled = false;
    const run = async () => {
      setLoadingContext(true);
      const [recentMessages, userStats] = await Promise.all([
        chatSafetyService.fetchRecentMessages(displayed.chatType, displayed.chatId),
        chatSafetyService.fetchUserModerationStats(displayed.senderId),
      ]);
      if (!cancelled) {
        setMessages(recentMessages);
        setStats(userStats);
        setLoadingContext(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [displayed?.id, displayed?.chatId, displayed?.chatType, displayed?.senderId]);

  if (!displayed) return null;

  const handleAction = async (status) => {
    setProcessing(true);
    setActionError(null);
    const result = await chatSafetyService.updateEventStatus(displayed.id, {
      status,
      adminNote,
      reviewedBy: user?.email ?? user?.name ?? 'admin',
    });
    setProcessing(false);
    if (!result.success) {
      setActionError(result.error || 'Action failed');
      return;
    }
    onUpdated?.({ ...displayed, status, adminNote });
  };

  const adminIdentity = user?.email ?? user?.name ?? 'admin';

  const refreshStats = async () => {
    if (!displayed?.senderId) return;
    const userStats = await chatSafetyService.fetchUserModerationStats(displayed.senderId);
    setStats(userStats);
  };

  const runModerationAction = async (actionFn) => {
    setProcessing(true);
    setActionError(null);
    const result = await actionFn();
    setProcessing(false);
    if (!result.success) {
      setActionError(result.error || 'Action failed');
      return;
    }
    await refreshStats();
  };

  const handleDeleteAndReset = async () => {
    const confirmed = window.confirm(
      'Delete this flag and reset the sender\'s violation count / chat suspension? Use this to clear test data.'
    );
    if (!confirmed) return;

    setProcessing(true);
    setActionError(null);
    const result = await chatSafetyService.deleteEventAndResetUser(displayed.id, {
      resetUserModeration: true,
    });
    setProcessing(false);
    if (!result.success) {
      setActionError(result.error || 'Delete failed');
      return;
    }
    onDeleted?.();
    onBack?.();
  };

  const handleSuspendChat = (durationMs) =>
    runModerationAction(() =>
      chatSafetyService.suspendUserChat(displayed.senderId, durationMs, {
        reason: adminNote || 'Admin chat suspension from Chat Safety',
        adminEmail: adminIdentity,
      })
    );

  const handleSuspendAccount = () =>
    runModerationAction(() =>
      chatSafetyService.suspendAccount(displayed.senderId, 7, {
        reason: adminNote || 'Admin account suspension from Chat Safety',
        adminEmail: adminIdentity,
      })
    );

  const handleBanAccount = async () => {
    const confirmed = window.confirm(
      'Permanently ban this user? They will lose chat access.'
    );
    if (!confirmed) return;
    await runModerationAction(() =>
      chatSafetyService.banAccount(displayed.senderId, {
        reason: adminNote || 'Admin ban from Chat Safety',
        adminEmail: adminIdentity,
      })
    );
  };

  const handleClearRestrictions = async () => {
    const confirmed = window.confirm(
      'Clear all chat/account restrictions and reset violation count for this user?'
    );
    if (!confirmed) return;
    await runModerationAction(() =>
      chatSafetyService.clearAccountRestrictions(displayed.senderId)
    );
  };

  const isProvider = displayed.senderRole === 'provider';

  return (
    <div className="chat-safety-detail-page">
      <button type="button" className="chat-safety-back-btn" onClick={onBack}>
        <ArrowLeft size={18} />
        Back to queue
      </button>

      <div className="chat-safety-detail-hero">
        <div className="chat-safety-detail-hero-main">
          <div className={`chat-safety-avatar ${isProvider ? 'provider' : 'customer'}`}>
            {isProvider ? <Briefcase size={22} /> : <User size={22} />}
          </div>
          <div>
            <h1>{displayed.senderName || 'Unknown sender'}</h1>
            <p>
              {ChatModerationEventHelpers.roleLabel(displayed.senderRole)} ·{' '}
              {displayed.source === 'user_report' ? 'User report' : 'Auto blocked'} ·{' '}
              {formatDate(displayed.createdAt)}
            </p>
          </div>
        </div>
        <div className="chat-safety-detail-badges">
          <span className={`chat-safety-status chat-safety-status--${(displayed.status || 'open').toLowerCase()}`}>
            {displayed.status || 'open'}
          </span>
          <span className={`chat-safety-severity chat-safety-severity--${ChatModerationEventHelpers.severityClass(displayed.severity)}`}>
            {displayed.severity} risk
          </span>
        </div>
      </div>

      <div className="chat-safety-detail-layout">
        <div className="chat-safety-detail-main">
          <section className="chat-safety-detail-card chat-safety-flag-card">
            <h3>
              <AlertTriangle size={18} />
              Flag details
            </h3>

            <div className="chat-safety-reason-callout">
              <div className="chat-safety-reason-callout-icon" aria-hidden="true">
                <ShieldAlert size={20} />
              </div>
              <div className="chat-safety-reason-callout-body">
                <span className="chat-safety-reason-callout-label">Why it was blocked</span>
                <p>{formatBlockReason(displayed.blockReason)}</p>
              </div>
            </div>

            <div className="chat-safety-blocked-message">
              <div className="chat-safety-blocked-message-header">
                <Quote size={16} />
                <span>Blocked message</span>
              </div>
              <blockquote className="chat-safety-blocked-message-quote">
                {displayed.matchedSnippetRedacted
                  ? `"${displayed.matchedSnippetRedacted}"`
                  : '—'}
              </blockquote>
            </div>

            <div className="chat-safety-flag-meta">
              <div className="chat-safety-flag-meta-item">
                <span className="chat-safety-flag-meta-label">Violation types</span>
                <ViolationTypeChips types={displayed.violationTypes} />
              </div>
              <div className="chat-safety-flag-meta-item">
                <span className="chat-safety-flag-meta-label">Chat type</span>
                <span className="chat-safety-meta-pill">{displayed.chatType || 'p2p'}</span>
              </div>
              <div className="chat-safety-flag-meta-item">
                <span className="chat-safety-flag-meta-label">Source</span>
                <SourceBadge source={displayed.source} />
              </div>
              <div className="chat-safety-flag-meta-item">
                <span className="chat-safety-flag-meta-label">Risk level</span>
                <SeverityBadge severity={displayed.severity} />
              </div>
            </div>

            {displayed.reporterName && (
              <div className="chat-safety-reporter-banner">
                <User size={16} />
                <div>
                  <span className="chat-safety-reporter-banner-label">Reported by</span>
                  <strong>
                    {displayed.reporterName}
                    <span className="chat-safety-reporter-role">
                      ({displayed.reporterRole || 'user'})
                    </span>
                  </strong>
                </div>
              </div>
            )}
          </section>

          <section className="chat-safety-detail-card">
            <h3>
              <MessageSquare size={18} />
              Recent chat context
            </h3>
            {loadingContext ? (
              <p className="chat-safety-muted">Loading messages…</p>
            ) : messages.length === 0 ? (
              <p className="chat-safety-muted">No messages found for this chat.</p>
            ) : (
              <ul className="chat-safety-message-list">
                {messages.map((msg) => (
                  <li key={msg.id} className="chat-safety-message-item">
                    <div className="chat-safety-message-meta">
                      <strong>{msg.senderName}</strong>
                      <span>{formatDate(msg.timestamp)}</span>
                    </div>
                    <p>{msg.content}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="chat-safety-detail-sidebar">
          <section className="chat-safety-detail-card">
            <h3>
              <ShieldAlert size={18} />
              Sender profile
            </h3>
            <div className="chat-safety-sidebar-stats">
              <div>
                <span>Total violations</span>
                <strong>{stats.violationCount}</strong>
              </div>
              <div>
                <span>Account status</span>
                <strong>{stats.accountStatus || 'approved'}</strong>
              </div>
              <div>
                <span>Sender ID</span>
                <code>{displayed.senderId || '—'}</code>
              </div>
              <div>
                <span>Chat ID</span>
                <code>{displayed.chatId || '—'}</code>
              </div>
            </div>
          </section>

          <section className="chat-safety-detail-card">
            <h3>
              <Ban size={18} />
              Account actions
            </h3>
            <p className="chat-safety-muted chat-safety-actions-hint">
              Suspend or ban the sender directly from Firestore (no Cloud Functions).
            </p>

            {actionError && <div className="chat-safety-inline-error">{actionError}</div>}

            <div className="chat-safety-actions">
              <button
                type="button"
                className="chat-safety-action-btn warn"
                disabled={processing || !displayed.senderId}
                onClick={() => handleSuspendChat(30 * 60 * 1000)}
              >
                <Clock3 size={16} />
                Suspend chat (30 min)
              </button>
              <button
                type="button"
                className="chat-safety-action-btn warn"
                disabled={processing || !displayed.senderId}
                onClick={() => handleSuspendAccount()}
              >
                <ShieldAlert size={16} />
                Suspend account (7 days)
              </button>
              <button
                type="button"
                className="chat-safety-action-btn danger"
                disabled={processing || !displayed.senderId}
                onClick={handleBanAccount}
              >
                <Ban size={16} />
                Ban account
              </button>
              <button
                type="button"
                className="chat-safety-action-btn neutral"
                disabled={processing || !displayed.senderId}
                onClick={handleClearRestrictions}
              >
                <ShieldOff size={16} />
                Clear restrictions
              </button>
            </div>
          </section>

          <section className="chat-safety-detail-card">
            <h3>
              <Clock3 size={18} />
              Admin review
            </h3>
            <label className="chat-safety-admin-note" htmlFor="chat-safety-note">
              Admin note
            </label>
            <textarea
              id="chat-safety-note"
              rows={4}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Optional note for this review"
            />

            {actionError && <div className="chat-safety-inline-error">{actionError}</div>}

            <div className="chat-safety-actions">
              <button
                type="button"
                className="chat-safety-action-btn dismiss"
                disabled={processing || displayed.status === 'dismissed'}
                onClick={() => handleAction('dismissed')}
              >
                <XCircle size={16} />
                Dismiss
              </button>
              <button
                type="button"
                className="chat-safety-action-btn review"
                disabled={processing || displayed.status === 'reviewed'}
                onClick={() => handleAction('reviewed')}
              >
                <CheckCircle size={16} />
                Mark reviewed
              </button>
              <button
                type="button"
                className="chat-safety-action-btn danger"
                disabled={processing}
                onClick={handleDeleteAndReset}
              >
                <Trash2 size={16} />
                Delete flag &amp; reset user
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
