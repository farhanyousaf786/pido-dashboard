import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckSquare,
  Plus,
  Trash2,
  Pencil,
  X,
  Save,
  Loader,
  Table2,
} from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';
import {
  addTestingColumn,
  addTestingSession,
  deleteTestingColumn,
  deleteTestingSession,
  ensureDefaultTestingColumns,
  nextCellStatus,
  sessionRowTone,
  setSessionCellStatus,
  subscribeTestingColumns,
  subscribeTestingSessions,
  updateTestingColumn,
  updateTestingSession,
} from '../../core/services/appTestingChecklistService.js';

function todayIsoDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return '—';
  }
}

function cellLabel(status) {
  if (status === 'pass') return '✓';
  if (status === 'fail') return '✗';
  if (status === 'na') return 'N/A';
  return '';
}

export default function AppTestingChecklist() {
  const { user } = useAuth();
  const actorUid = user?.uid || null;

  const [columns, setColumns] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState('');
  const [seeded, setSeeded] = useState(false);

  const [newColumnLabel, setNewColumnLabel] = useState('');
  const [editingColumnId, setEditingColumnId] = useState('');
  const [editingColumnLabel, setEditingColumnLabel] = useState('');

  const [newSessionDate, setNewSessionDate] = useState(todayIsoDate());
  const [newSessionNotes, setNewSessionNotes] = useState('');
  const [editingSessionId, setEditingSessionId] = useState('');
  const [editingSessionDate, setEditingSessionDate] = useState('');
  const [editingSessionNotes, setEditingSessionNotes] = useState('');

  useEffect(() => {
    setLoading(true);
    let colsReady = false;
    let sessionsReady = false;
    const done = () => {
      if (colsReady && sessionsReady) setLoading(false);
    };

    const unsubCols = subscribeTestingColumns(
      (rows) => {
        setColumns(rows);
        colsReady = true;
        done();
        setError('');
      },
      (err) => {
        colsReady = true;
        done();
        setError(err?.message || 'Failed to load columns');
      }
    );

    const unsubSessions = subscribeTestingSessions(
      (rows) => {
        setSessions(rows);
        sessionsReady = true;
        done();
        setError('');
      },
      (err) => {
        sessionsReady = true;
        done();
        setError(err?.message || 'Failed to load sessions');
      }
    );

    return () => {
      unsubCols();
      unsubSessions();
    };
  }, []);

  useEffect(() => {
    if (loading || seeded || columns.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        await ensureDefaultTestingColumns(actorUid);
        if (!cancelled) setSeeded(true);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to seed default columns');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, columns.length, seeded, actorUid]);

  const stats = useMemo(() => {
    let pass = 0;
    let fail = 0;
    let na = 0;
    let unchecked = 0;
    for (const session of sessions) {
      for (const col of columns) {
        const s = session.results?.[col.id] || 'unchecked';
        if (s === 'pass') pass += 1;
        else if (s === 'fail') fail += 1;
        else if (s === 'na') na += 1;
        else unchecked += 1;
      }
    }
    return { pass, fail, na, unchecked, rows: sessions.length, cols: columns.length };
  }, [sessions, columns]);

  const run = async (key, fn) => {
    setBusyKey(key);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setBusyKey('');
    }
  };

  const handleAddColumn = (e) => {
    e.preventDefault();
    if (!newColumnLabel.trim()) return;
    run('add-col', async () => {
      await addTestingColumn({ label: newColumnLabel, actorUid });
      setNewColumnLabel('');
    });
  };

  const handleSaveColumn = (id) => {
    run(`col-${id}`, async () => {
      await updateTestingColumn(id, { label: editingColumnLabel }, actorUid);
      setEditingColumnId('');
      setEditingColumnLabel('');
    });
  };

  const handleDeleteColumn = (id, label) => {
    const ok = window.confirm(`Remove column “${label}”? Existing cell values for it will be hidden.`);
    if (!ok) return;
    run(`col-${id}`, () => deleteTestingColumn(id));
  };

  const handleAddSession = (e) => {
    e.preventDefault();
    run('add-session', async () => {
      await addTestingSession({
        date: newSessionDate,
        notes: newSessionNotes,
        actorUid,
        columnIds: columns.map((c) => c.id),
      });
      setNewSessionNotes('');
      setNewSessionDate(todayIsoDate());
    });
  };

  const handleSaveSession = (id) => {
    run(`session-${id}`, async () => {
      await updateTestingSession(
        id,
        { date: editingSessionDate, notes: editingSessionNotes },
        actorUid
      );
      setEditingSessionId('');
    });
  };

  const handleDeleteSession = (id, date) => {
    const ok = window.confirm(`Delete test log for ${date}?`);
    if (!ok) return;
    run(`session-${id}`, () => deleteTestingSession(id));
  };

  const handleCycleCell = (session, columnId) => {
    const current = session.results?.[columnId] || 'unchecked';
    const next = nextCellStatus(current);
    run(`cell-${session.id}-${columnId}`, () =>
      setSessionCellStatus(session.id, columnId, next, actorUid)
    );
  };

  return (
    <div className="admin-settings__card admin-settings__card--checklist">
      <h2 className="admin-settings__card-title">
        <Table2 size={18} />
        App testing log
      </h2>
      <p className="admin-settings__hint admin-settings__hint--tight">
        Spreadsheet-style QA log: rows are test dates, columns are features. Click a cell to cycle{' '}
        <strong>empty → pass → fail → N/A</strong>. Add/edit/remove rows and columns anytime.
      </p>

      {error ? (
        <div className="admin-settings__banner admin-settings__banner--error">{error}</div>
      ) : null}

      <div className="testlog-legend">
        <span className="testlog-chip testlog-chip--pass">✓ Pass</span>
        <span className="testlog-chip testlog-chip--fail">✗ Fail</span>
        <span className="testlog-chip testlog-chip--na">N/A</span>
        <span className="testlog-chip">Empty</span>
        <span className="testlog-meta">
          {stats.rows} sessions · {stats.cols} checks · {stats.pass} pass · {stats.fail} fail
        </span>
      </div>

      <div className="testlog-toolbar">
        <form className="testlog-toolbar__form" onSubmit={handleAddSession}>
          <input
            type="date"
            className="admin-settings__input"
            value={newSessionDate}
            onChange={(e) => setNewSessionDate(e.target.value)}
            required
          />
          <input
            className="admin-settings__input"
            placeholder="Session notes (optional)"
            value={newSessionNotes}
            onChange={(e) => setNewSessionNotes(e.target.value)}
          />
          <button
            type="submit"
            className="admin-settings__btn admin-settings__btn--primary admin-settings__btn--inline"
            disabled={busyKey === 'add-session' || !newSessionDate}
          >
            {busyKey === 'add-session' ? <Loader size={16} className="spinning" /> : <Plus size={16} />}
            Add date row
          </button>
        </form>

        <form className="testlog-toolbar__form" onSubmit={handleAddColumn}>
          <input
            className="admin-settings__input"
            placeholder="New feature column…"
            value={newColumnLabel}
            onChange={(e) => setNewColumnLabel(e.target.value)}
          />
          <button
            type="submit"
            className="admin-settings__btn admin-settings__btn--secondary admin-settings__btn--inline"
            disabled={busyKey === 'add-col' || !newColumnLabel.trim()}
          >
            {busyKey === 'add-col' ? <Loader size={16} className="spinning" /> : <Plus size={16} />}
            Add column
          </button>
        </form>
      </div>

      {loading ? (
        <div className="admin-settings__hint">Loading testing log…</div>
      ) : columns.length === 0 ? (
        <div className="admin-settings__hint">
          No columns yet. Add a feature column above (defaults will seed automatically).
        </div>
      ) : (
        <div className="testlog-table-wrap">
          <table className="testlog-table">
            <thead>
              <tr>
                <th className="testlog-table__sticky">Date</th>
                {columns.map((col) => (
                  <th key={col.id}>
                    {editingColumnId === col.id ? (
                      <div className="testlog-col-edit">
                        <input
                          className="admin-settings__input"
                          value={editingColumnLabel}
                          onChange={(e) => setEditingColumnLabel(e.target.value)}
                        />
                        <button
                          type="button"
                          className="checklist-icon-btn"
                          title="Save"
                          onClick={() => handleSaveColumn(col.id)}
                          disabled={busyKey === `col-${col.id}`}
                        >
                          <Save size={14} />
                        </button>
                        <button
                          type="button"
                          className="checklist-icon-btn"
                          title="Cancel"
                          onClick={() => {
                            setEditingColumnId('');
                            setEditingColumnLabel('');
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="testlog-col-head">
                        <span title={col.label}>{col.label}</span>
                        <span className="testlog-col-head__actions">
                          <button
                            type="button"
                            className="checklist-icon-btn"
                            title="Rename column"
                            onClick={() => {
                              setEditingColumnId(col.id);
                              setEditingColumnLabel(col.label);
                            }}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            className="checklist-icon-btn checklist-icon-btn--danger"
                            title="Delete column"
                            onClick={() => handleDeleteColumn(col.id, col.label)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </span>
                      </div>
                    )}
                  </th>
                ))}
                <th>Notes / actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="testlog-empty">
                    No test sessions yet. Add a date row to start logging.
                  </td>
                </tr>
              ) : (
                sessions.map((session) => {
                  const tone = sessionRowTone(session, columns);
                  const editing = editingSessionId === session.id;
                  return (
                    <tr key={session.id} className={`testlog-row testlog-row--${tone}`}>
                      <td className="testlog-table__sticky">
                        {editing ? (
                          <input
                            type="date"
                            className="admin-settings__input"
                            value={editingSessionDate}
                            onChange={(e) => setEditingSessionDate(e.target.value)}
                          />
                        ) : (
                          <div className="testlog-date">
                            <strong>{session.date || '—'}</strong>
                            <small>Updated {formatWhen(session.updatedAt)}</small>
                          </div>
                        )}
                      </td>
                      {columns.map((col) => {
                        const status = session.results?.[col.id] || 'unchecked';
                        const key = `cell-${session.id}-${col.id}`;
                        return (
                          <td key={col.id}>
                            <button
                              type="button"
                              className={`testlog-cell testlog-cell--${status}`}
                              onClick={() => handleCycleCell(session, col.id)}
                              disabled={busyKey === key}
                              title="Click to cycle status"
                            >
                              {busyKey === key ? (
                                <Loader size={12} className="spinning" />
                              ) : (
                                cellLabel(status)
                              )}
                            </button>
                          </td>
                        );
                      })}
                      <td>
                        {editing ? (
                          <div className="testlog-session-edit">
                            <textarea
                              className="admin-settings__input"
                              rows={2}
                              value={editingSessionNotes}
                              onChange={(e) => setEditingSessionNotes(e.target.value)}
                              placeholder="Notes"
                            />
                            <div className="testlog-session-edit__actions">
                              <button
                                type="button"
                                className="admin-settings__btn admin-settings__btn--primary admin-settings__btn--inline"
                                onClick={() => handleSaveSession(session.id)}
                                disabled={busyKey === `session-${session.id}`}
                              >
                                <Save size={14} />
                                Save
                              </button>
                              <button
                                type="button"
                                className="admin-settings__btn admin-settings__btn--secondary admin-settings__btn--inline"
                                onClick={() => setEditingSessionId('')}
                              >
                                <X size={14} />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="testlog-session-side">
                            {session.notes ? (
                              <p className="testlog-session-notes">{session.notes}</p>
                            ) : (
                              <p className="testlog-session-notes is-muted">No notes</p>
                            )}
                            <div className="testlog-session-side__actions">
                              <button
                                type="button"
                                className="checklist-icon-btn"
                                title="Edit row"
                                onClick={() => {
                                  setEditingSessionId(session.id);
                                  setEditingSessionDate(session.date || todayIsoDate());
                                  setEditingSessionNotes(session.notes || '');
                                }}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                className="checklist-icon-btn checklist-icon-btn--danger"
                                title="Delete row"
                                onClick={() => handleDeleteSession(session.id, session.date)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="admin-settings__hint" style={{ marginTop: 12 }}>
        <CheckSquare size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
        Tip: green row = all pass/N/A · red row = any fail · click cells to update.
      </p>
    </div>
  );
}
