import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckSquare,
  Plus,
  Trash2,
  Pencil,
  X,
  Save,
  Loader,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';
import {
  addChecklistItem,
  deleteChecklistItem,
  subscribeAppTestingChecklist,
  updateChecklistItem,
  toggleChecklistItem,
} from '../../core/services/appTestingChecklistService.js';

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return '—';
  }
}

function emptyDraft() {
  return { title: '', notes: '', dueAtDate: '' };
}

export default function AppTestingChecklist() {
  const { user } = useAuth();
  const actorUid = user?.uid || null;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all | open | done
  const [draft, setDraft] = useState(emptyDraft());
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [editDraft, setEditDraft] = useState(emptyDraft());
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeAppTestingChecklist(
      (rows) => {
        setItems(rows);
        setLoading(false);
        setError('');
      },
      (err) => {
        setLoading(false);
        setError(err?.message || 'Failed to load checklist');
      }
    );
    return () => unsub();
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter((i) => i.done).length;
    return { total, done, open: total - done };
  }, [items]);

  const visibleItems = useMemo(() => {
    let rows = [...items];
    if (filter === 'open') rows = rows.filter((i) => !i.done);
    if (filter === 'done') rows = rows.filter((i) => i.done);
    rows.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const ad = a.dueAtDate || '';
      const bd = b.dueAtDate || '';
      if (ad && bd && ad !== bd) return ad.localeCompare(bd);
      if (ad && !bd) return -1;
      if (!ad && bd) return 1;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    return rows;
  }, [items, filter]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!draft.title.trim() || adding) return;
    setAdding(true);
    setError('');
    try {
      await addChecklistItem({
        title: draft.title,
        notes: draft.notes,
        dueAtDate: draft.dueAtDate,
        actorUid,
      });
      setDraft(emptyDraft());
    } catch (err) {
      setError(err?.message || 'Failed to add item');
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditDraft({
      title: item.title || '',
      notes: item.notes || '',
      dueAtDate: item.dueAtDate || '',
    });
  };

  const cancelEdit = () => {
    setEditingId('');
    setEditDraft(emptyDraft());
  };

  const saveEdit = async (id) => {
    if (!id || busyId) return;
    setBusyId(id);
    setError('');
    try {
      await updateChecklistItem(
        id,
        {
          title: editDraft.title,
          notes: editDraft.notes,
          dueAtDate: editDraft.dueAtDate,
        },
        actorUid
      );
      cancelEdit();
    } catch (err) {
      setError(err?.message || 'Failed to update item');
    } finally {
      setBusyId('');
    }
  };

  const onToggle = async (item) => {
    if (busyId) return;
    setBusyId(item.id);
    setError('');
    try {
      await toggleChecklistItem(item.id, !item.done, actorUid);
    } catch (err) {
      setError(err?.message || 'Failed to update status');
    } finally {
      setBusyId('');
    }
  };

  const onDelete = async (id) => {
    if (!id || busyId) return;
    const ok = window.confirm('Delete this checklist item?');
    if (!ok) return;
    setBusyId(id);
    setError('');
    try {
      await deleteChecklistItem(id);
      if (editingId === id) cancelEdit();
    } catch (err) {
      setError(err?.message || 'Failed to delete item');
    } finally {
      setBusyId('');
    }
  };

  const progressPct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="admin-settings__card admin-settings__card--checklist">
      <h2 className="admin-settings__card-title">
        <CheckSquare size={18} />
        App testing checklist
      </h2>
      <p className="admin-settings__hint admin-settings__hint--tight">
        Track QA / release checks. Add as many items as you need — each keeps created and updated
        times.
      </p>

      {error ? (
        <div className="admin-settings__banner admin-settings__banner--error">{error}</div>
      ) : null}

      <div className="checklist-progress">
        <div className="checklist-progress__meta">
          <strong>
            {stats.done}/{stats.total} done
          </strong>
          <span>{stats.open} open · {progressPct}%</span>
        </div>
        <div className="checklist-progress__bar" aria-hidden>
          <div className="checklist-progress__fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <form className="checklist-add" onSubmit={handleAdd}>
        <input
          className="admin-settings__input"
          placeholder="New checklist item…"
          value={draft.title}
          onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
        />
        <input
          type="date"
          className="admin-settings__input checklist-add__date"
          value={draft.dueAtDate}
          onChange={(e) => setDraft((p) => ({ ...p, dueAtDate: e.target.value }))}
          title="Due date (optional)"
        />
        <button
          type="submit"
          className="admin-settings__btn admin-settings__btn--primary admin-settings__btn--inline"
          disabled={adding || !draft.title.trim()}
        >
          {adding ? <Loader size={16} className="spinning" /> : <Plus size={16} />}
          Add
        </button>
        <textarea
          className="admin-settings__input checklist-add__notes"
          placeholder="Notes (optional)"
          rows={2}
          value={draft.notes}
          onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
        />
      </form>

      <div className="checklist-filters">
        <Filter size={14} />
        {[
          { key: 'all', label: `All (${stats.total})` },
          { key: 'open', label: `Open (${stats.open})` },
          { key: 'done', label: `Done (${stats.done})` },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            className={`checklist-filter-btn ${filter === f.key ? 'is-active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-settings__hint">Loading checklist…</div>
      ) : visibleItems.length === 0 ? (
        <div className="admin-settings__hint">No items in this view. Add one above.</div>
      ) : (
        <ul className="checklist-list">
          {visibleItems.map((item) => {
            const isEditing = editingId === item.id;
            const busy = busyId === item.id;
            return (
              <li
                key={item.id}
                className={`checklist-item ${item.done ? 'is-done' : ''} ${
                  isEditing ? 'is-editing' : ''
                }`}
              >
                {isEditing ? (
                  <div className="checklist-item__edit">
                    <input
                      className="admin-settings__input"
                      value={editDraft.title}
                      onChange={(e) =>
                        setEditDraft((p) => ({ ...p, title: e.target.value }))
                      }
                    />
                    <input
                      type="date"
                      className="admin-settings__input"
                      value={editDraft.dueAtDate}
                      onChange={(e) =>
                        setEditDraft((p) => ({ ...p, dueAtDate: e.target.value }))
                      }
                    />
                    <textarea
                      className="admin-settings__input"
                      rows={2}
                      value={editDraft.notes}
                      onChange={(e) =>
                        setEditDraft((p) => ({ ...p, notes: e.target.value }))
                      }
                    />
                    <div className="checklist-item__edit-actions">
                      <button
                        type="button"
                        className="admin-settings__btn admin-settings__btn--primary admin-settings__btn--inline"
                        onClick={() => saveEdit(item.id)}
                        disabled={busy || !editDraft.title.trim()}
                      >
                        {busy ? <Loader size={14} className="spinning" /> : <Save size={14} />}
                        Save
                      </button>
                      <button
                        type="button"
                        className="admin-settings__btn admin-settings__btn--secondary admin-settings__btn--inline"
                        onClick={cancelEdit}
                        disabled={busy}
                      >
                        <X size={14} />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <label className="checklist-item__check">
                      <input
                        type="checkbox"
                        checked={item.done}
                        disabled={busy}
                        onChange={() => onToggle(item)}
                      />
                      <span className="checklist-item__title">{item.title}</span>
                    </label>
                    {item.notes ? (
                      <p className="checklist-item__notes">{item.notes}</p>
                    ) : null}
                    <div className="checklist-item__meta">
                      {item.dueAtDate ? <span>Due {item.dueAtDate}</span> : null}
                      <span>Created {formatWhen(item.createdAt)}</span>
                      <span>Updated {formatWhen(item.updatedAt)}</span>
                      {item.done && item.completedAt ? (
                        <span>Completed {formatWhen(item.completedAt)}</span>
                      ) : null}
                    </div>
                    <div className="checklist-item__actions">
                      <button
                        type="button"
                        className="checklist-icon-btn"
                        onClick={() => startEdit(item)}
                        disabled={busy}
                        title="Edit"
                        aria-label="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="checklist-icon-btn checklist-icon-btn--danger"
                        onClick={() => onDelete(item.id)}
                        disabled={busy}
                        title="Delete"
                        aria-label="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
