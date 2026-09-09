import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig.js';

const checklistCol = collection(db, 'appTestingChecklist');

function toIso(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') {
    try {
      return value.toDate().toISOString();
    } catch {
      return null;
    }
  }
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function mapItem(snap) {
  const d = snap.data() || {};
  return {
    id: snap.id,
    title: String(d.title || '').trim(),
    notes: String(d.notes || '').trim(),
    done: d.done === true,
    dueAt: toIso(d.dueAt) || (d.dueAtDate ? `${d.dueAtDate}T12:00:00.000Z` : null),
    dueAtDate: d.dueAtDate || (toIso(d.dueAt) ? toIso(d.dueAt).slice(0, 10) : ''),
    createdAt: toIso(d.createdAt),
    updatedAt: toIso(d.updatedAt),
    completedAt: toIso(d.completedAt),
    createdBy: d.createdBy || null,
    updatedBy: d.updatedBy || null,
    sortOrder: Number.isFinite(Number(d.sortOrder)) ? Number(d.sortOrder) : 0,
  };
}

export function subscribeAppTestingChecklist(onChange, onError) {
  const q = query(checklistCol, orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map(mapItem);
      onChange(items);
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

export async function addChecklistItem({ title, notes = '', dueAtDate = '', actorUid = null }) {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) throw new Error('Title is required');

  const payload = {
    title: cleanTitle,
    notes: String(notes || '').trim(),
    done: false,
    dueAtDate: dueAtDate || null,
    dueAt: dueAtDate ? new Date(`${dueAtDate}T12:00:00`) : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    completedAt: null,
    createdBy: actorUid,
    updatedBy: actorUid,
    sortOrder: Date.now(),
  };

  const ref = await addDoc(checklistCol, payload);
  return ref.id;
}

export async function updateChecklistItem(id, patch, actorUid = null) {
  if (!id) throw new Error('Item id is required');
  const next = {
    updatedAt: serverTimestamp(),
    updatedBy: actorUid,
  };

  if (patch.title !== undefined) {
    const cleanTitle = String(patch.title || '').trim();
    if (!cleanTitle) throw new Error('Title is required');
    next.title = cleanTitle;
  }
  if (patch.notes !== undefined) next.notes = String(patch.notes || '').trim();
  if (patch.dueAtDate !== undefined) {
    const dueAtDate = patch.dueAtDate || null;
    next.dueAtDate = dueAtDate;
    next.dueAt = dueAtDate ? new Date(`${dueAtDate}T12:00:00`) : null;
  }
  if (patch.done !== undefined) {
    next.done = patch.done === true;
    next.completedAt = patch.done === true ? serverTimestamp() : null;
  }

  await updateDoc(doc(db, 'appTestingChecklist', id), next);
}

export async function toggleChecklistItem(id, done, actorUid = null) {
  return updateChecklistItem(id, { done }, actorUid);
}

export async function deleteChecklistItem(id) {
  if (!id) throw new Error('Item id is required');
  await deleteDoc(doc(db, 'appTestingChecklist', id));
}
