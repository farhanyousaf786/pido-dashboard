import React from 'react';
import {
  ShieldAlert,
  Eye,
  User,
  Briefcase,
  Link2,
  Phone,
  Mail,
  AtSign,
  AlertTriangle,
  MessageSquareWarning,
} from 'lucide-react';
import { ChatModerationEventHelpers } from '../../../core/models/ChatModerationEvent.js';

function formatDate(timestamp) {
  if (!timestamp) return '—';
  if (timestamp.toDate) {
    return timestamp.toDate().toLocaleString('en-US', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }
  if (timestamp instanceof Date) {
    return timestamp.toLocaleString('en-US', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }
  return '—';
}

function SeverityBadge({ severity }) {
  const cls = ChatModerationEventHelpers.severityClass(severity);
  return (
    <span className={`chat-safety-severity chat-safety-severity--${cls}`}>
      {severity || 'low'}
    </span>
  );
}

function StatusBadge({ status }) {
  const s = (status || 'open').toLowerCase();
  return <span className={`chat-safety-status chat-safety-status--${s}`}>{s}</span>;
}

function SourceBadge({ source }) {
  const isReport = source === 'user_report';
  return (
    <span className={`chat-safety-source chat-safety-source--${isReport ? 'report' : 'block'}`}>
      {isReport ? 'User report' : 'Auto blocked'}
    </span>
  );
}

function TypeChips({ types }) {
  if (!types?.length) return <span className="chat-safety-muted-cell">—</span>;

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
          <span key={type} className="chat-safety-type-chip">
            <Icon size={12} />
            {type}
          </span>
        );
      })}
    </div>
  );
}

function RoleBadge({ role }) {
  const isProvider = role === 'provider';
  return (
    <span className={`user-type-badge ${isProvider ? 'provider' : 'customer'}`}>
      {isProvider ? <Briefcase size={12} /> : <User size={12} />}
      {ChatModerationEventHelpers.roleLabel(role)}
    </span>
  );
}

export default function ChatFlagQueue({ events, loading, statusFilter, onView }) {
  if (loading) {
    return (
      <div className="chat-safety-panel">
        <div className="verification-queue-loading">
          <div className="table-row-skeleton" />
          <div className="table-row-skeleton" />
          <div className="table-row-skeleton" />
          <div className="table-row-skeleton" />
        </div>
      </div>
    );
  }

  const emptyTitle =
    statusFilter === 'open'
      ? 'No open flags'
      : statusFilter === 'reviewed'
        ? 'No reviewed flags'
        : statusFilter === 'dismissed'
          ? 'No dismissed flags'
          : 'No flagged messages yet';

  const emptyBody =
    statusFilter === 'open'
      ? 'When users try to share phone numbers, links, or social handles in chat, they will appear here.'
      : 'Try another filter or wait for new moderation events from the app.';

  return (
    <div className="chat-safety-panel">
      <div className="chat-safety-panel-header">
        <div>
          <h2 className="chat-safety-panel-title">
            <MessageSquareWarning size={18} />
            Flag queue
          </h2>
          <p className="chat-safety-panel-subtitle">
            {events.length} {events.length === 1 ? 'item' : 'items'} in this view
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="chat-safety-empty">
          <div className="chat-safety-empty-icon">
            <ShieldAlert size={40} />
          </div>
          <h3>{emptyTitle}</h3>
          <p>{emptyBody}</p>
        </div>
      ) : (
        <div className="verification-table-container chat-safety-table-wrap">
          <table className="verification-table chat-safety-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Sender</th>
                <th>Role</th>
                <th>Detected</th>
                <th>Reason</th>
                <th>Preview</th>
                <th>Source</th>
                <th>Risk</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr
                  key={event.id}
                  className="chat-safety-row"
                  onClick={() => onView?.(event)}
                >
                  <td className="chat-safety-date-cell">{formatDate(event.createdAt)}</td>
                  <td>
                    <div className="chat-safety-sender-cell">
                      <span className="chat-safety-sender-name">
                        {event.senderName || 'Unknown'}
                      </span>
                      {event.reporterName && (
                        <span className="chat-safety-reporter-hint">
                          Reported by {event.reporterName}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <RoleBadge role={event.senderRole} />
                  </td>
                  <td>
                    <TypeChips types={event.violationTypes} />
                  </td>
                  <td className="chat-safety-reason-cell">{event.blockReason || '—'}</td>
                  <td className="chat-safety-snippet-cell">
                    <code>{event.matchedSnippetRedacted || '—'}</code>
                  </td>
                  <td>
                    <SourceBadge source={event.source} />
                  </td>
                  <td>
                    <SeverityBadge severity={event.severity} />
                  </td>
                  <td>
                    <StatusBadge status={event.status} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="view-btn chat-safety-view-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onView?.(event);
                      }}
                    >
                      <Eye size={14} />
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
