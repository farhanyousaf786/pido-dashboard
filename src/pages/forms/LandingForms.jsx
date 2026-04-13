import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Loader2, AlertCircle, Search } from 'lucide-react';
import { landingFormsService } from '../../core/services/landingFormsService.js';

function toDate(ts) {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (ts?.toDate) return ts.toDate();
  return null;
}

function formatDateTime(ts) {
  const d = toDate(ts);
  if (!d) return '—';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
}

function displayName(form) {
  const first = (form.firstName || '').trim();
  const last = (form.lastName || '').trim();
  const combined = [first, last].filter(Boolean).join(' ');
  if (combined) return combined;
  return form.email || form.docId || 'Submission';
}

function statusBadgeClass(status) {
  const s = (status || '').toLowerCase();
  if (s === 'approved' || s === 'reviewed' || s === 'closed') return 'success';
  if (s === 'rejected') return 'danger';
  if (s === 'pending') return 'warning';
  return 'neutral';
}

export default function LandingForms() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    const unsub = landingFormsService.subscribeToLandingForms(
      (rows) => {
        setForms(rows);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Landing forms:', err);
        setError(err?.message || 'Failed to load forms.');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return forms;
    const q = search.trim().toLowerCase();
    return forms.filter((f) => {
      const blob = [
        displayName(f),
        f.email,
        f.contact,
        f.profession,
        f.address,
        f.docId,
        f.id,
        f.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [forms, search]);

  useEffect(() => {
    if (filtered.length === 0) return;
    setSelectedDocId((prev) =>
      prev && filtered.some((f) => f.docId === prev) ? prev : filtered[0].docId
    );
  }, [filtered]);

  const selected = useMemo(
    () => (selectedDocId ? filtered.find((f) => f.docId === selectedDocId) : null) ?? null,
    [filtered, selectedDocId]
  );

  return (
    <div className="landing-forms-page">
      <div className="landing-forms-header">
        <div className="landing-forms-title-row">
          <ClipboardList size={26} className="landing-forms-title-icon" />
          <div>
            <h1 className="landing-forms-title">Forms</h1>
            <p className="landing-forms-subtitle">Submissions from the Firestore collection landingforms</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="landing-forms-banner landing-forms-banner--error">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="landing-forms-layout">
        <aside className="landing-forms-list-panel">
          <div className="landing-forms-search">
            <Search size={16} className="landing-forms-search-icon" />
            <input
              type="search"
              className="landing-forms-search-input"
              placeholder="Search name, email, phone, profession…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Filter submissions"
            />
          </div>

          {loading ? (
            <div className="landing-forms-list-loading">
              <Loader2 size={22} className="spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <p className="landing-forms-empty">No submissions match your filter.</p>
          ) : (
            <ul className="landing-forms-list">
              {filtered.map((f) => {
                const active = selectedDocId != null && f.docId === selectedDocId;
                return (
                  <li key={f.docId}>
                    <button
                      type="button"
                      className={
                        active
                          ? 'landing-forms-list-item landing-forms-list-item--active'
                          : 'landing-forms-list-item'
                      }
                      onClick={() => setSelectedDocId(f.docId)}
                    >
                      <span className="landing-forms-list-name">{displayName(f)}</span>
                      <span className="landing-forms-list-meta">
                        {f.profession ? `${f.profession} · ` : ''}
                        {formatDateTime(f.submittedAt)}
                      </span>
                      <span className={`booking-badge ${statusBadgeClass(f.status)} landing-forms-list-badge`}>
                        {f.status || '—'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className="landing-forms-detail-panel">
          {!selected && !loading ? (
            <div className="landing-forms-detail-empty">No submission selected.</div>
          ) : !selected ? (
            <div className="landing-forms-detail-empty">Loading…</div>
          ) : (
            <>
              <div className="landing-forms-detail-head">
                <h2 className="landing-forms-detail-title">{displayName(selected)}</h2>
                <span className={`booking-badge ${statusBadgeClass(selected.status)}`}>
                  {selected.status || '—'}
                </span>
              </div>

              <div className="detail-items landing-forms-detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Document ID</span>
                  <span className="detail-value monospace">{selected.docId}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">id (field)</span>
                  <span className="detail-value monospace">{selected.id || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">First name</span>
                  <span className="detail-value">{selected.firstName || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Last name</span>
                  <span className="detail-value">{selected.lastName || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{selected.email || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Contact</span>
                  <span className="detail-value">{selected.contact || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Profession</span>
                  <span className="detail-value">{selected.profession || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Address</span>
                  <span className="detail-value">{selected.address || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className="detail-value">{selected.status || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">createdAt (string)</span>
                  <span className="detail-value monospace landing-forms-break">
                    {selected.createdAt != null && selected.createdAt !== ''
                      ? String(selected.createdAt)
                      : '—'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">submittedAt (timestamp)</span>
                  <span className="detail-value">{formatDateTime(selected.submittedAt)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">ipAddress</span>
                  <span className="detail-value monospace">{selected.ipAddress || '—'}</span>
                </div>
                <div className="detail-item landing-forms-detail-full">
                  <span className="detail-label">userAgent</span>
                  <span className="detail-value monospace landing-forms-break">{selected.userAgent || '—'}</span>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
