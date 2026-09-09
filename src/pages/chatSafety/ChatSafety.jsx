import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldAlert,
  AlertCircle,
  Inbox,
  CheckCircle2,
  XCircle,
  Flag,
} from 'lucide-react';
import { chatSafetyService } from '../../core/services/chatSafetyService.js';
import ChatFlagQueue from './components/ChatFlagQueue.jsx';
import ChatFlagDetail from './components/ChatFlagDetail.jsx';

const STATUS_FILTERS = [
  { key: 'open', label: 'Open', icon: Flag },
  { key: 'all', label: 'All', icon: Inbox },
  { key: 'reviewed', label: 'Reviewed', icon: CheckCircle2 },
  { key: 'dismissed', label: 'Dismissed', icon: XCircle },
];

function computeStats(events) {
  let open = 0;
  let reviewed = 0;
  let dismissed = 0;
  let reports = 0;

  for (const event of events) {
    const status = (event.status || 'open').toLowerCase();
    if (status === 'reviewed') reviewed += 1;
    else if (status === 'dismissed') dismissed += 1;
    else open += 1;
    if (event.source === 'user_report') reports += 1;
  }

  return { open, reviewed, dismissed, total: events.length, reports };
}

export default function ChatSafety() {
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('open');
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = chatSafetyService.subscribeToEvents(({ events, error: subError }) => {
      setAllEvents(events);
      setError(subError);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const stats = useMemo(() => computeStats(allEvents), [allEvents]);

  const filteredEvents = useMemo(() => {
    if (statusFilter === 'all') return allEvents;
    return allEvents.filter(
      (event) => (event.status || 'open').toLowerCase() === statusFilter
    );
  }, [allEvents, statusFilter]);

  if (selectedEvent) {
    return (
      <div className="chat-safety-page">
        <ChatFlagDetail
          event={selectedEvent}
          onBack={() => setSelectedEvent(null)}
          onUpdated={(updated) => setSelectedEvent(updated)}
          onDeleted={() => setSelectedEvent(null)}
        />
      </div>
    );
  }

  return (
    <div className="chat-safety-page">
      <div className="verifications-header">
        <div className="verifications-title-section">
          <div className="chat-safety-header-icon">
            <ShieldAlert size={26} />
          </div>
          <div>
            <h1>Chat Safety</h1>
            <p>Review blocked messages and off-platform contact attempts</p>
          </div>
        </div>
      </div>

      <div className="verification-stats-bar chat-safety-stats-bar">
        <button
          type="button"
          className={`verification-stat-item clickable ${statusFilter === 'open' ? 'active' : ''}`}
          onClick={() => setStatusFilter('open')}
        >
          <span className="stat-value pending">{stats.open}</span>
          <span className="stat-label">Open flags</span>
        </button>
        <button
          type="button"
          className={`verification-stat-item clickable ${statusFilter === 'reviewed' ? 'active' : ''}`}
          onClick={() => setStatusFilter('reviewed')}
        >
          <span className="stat-value approved">{stats.reviewed}</span>
          <span className="stat-label">Reviewed</span>
        </button>
        <button
          type="button"
          className={`verification-stat-item clickable ${statusFilter === 'dismissed' ? 'active' : ''}`}
          onClick={() => setStatusFilter('dismissed')}
        >
          <span className="stat-value rejected">{stats.dismissed}</span>
          <span className="stat-label">Dismissed</span>
        </button>
        <div className="verification-stat-item total">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="verification-stat-item chat-safety-stat-reports">
          <span className="stat-value">{stats.reports}</span>
          <span className="stat-label">User reports</span>
        </div>
      </div>

      <div className="verification-tabs">
        {STATUS_FILTERS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              className={`tab-btn ${statusFilter === tab.key ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab.key)}
            >
              <Icon size={18} />
              {tab.label}
              {tab.key === 'open' && stats.open > 0 && (
                <span className="chat-safety-tab-badge">{stats.open}</span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="verifications-error">
          <AlertCircle size={20} />
          <span>
            Could not load chat safety events. Try refreshing the page or check your connection.
          </span>
        </div>
      )}

      <ChatFlagQueue
        events={filteredEvents}
        loading={loading}
        statusFilter={statusFilter}
        onView={(event) => setSelectedEvent(event)}
      />
    </div>
  );
}
