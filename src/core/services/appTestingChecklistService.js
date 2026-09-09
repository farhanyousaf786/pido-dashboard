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
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig.js';

const columnsCol = collection(db, 'appTestingColumns');
const sessionsCol = collection(db, 'appTestingSessions');

export const CELL_STATUSES = ['unchecked', 'pass', 'fail', 'na'];

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

function normalizeStatus(value) {
  const s = String(value || 'unchecked').toLowerCase();
  if (s === 'pass' || s === 'fail' || s === 'na' || s === 'unchecked') return s;
  if (s === 'true' || s === 'checked' || s === 'ok') return 'pass';
  if (s === 'false') return 'fail';
  return 'unchecked';
}

function mapColumn(snap) {
  const d = snap.data() || {};
  return {
    id: snap.id,
    label: String(d.label || '').trim() || 'Untitled',
    sortOrder: Number.isFinite(Number(d.sortOrder)) ? Number(d.sortOrder) : Date.now(),
    createdAt: toIso(d.createdAt),
    updatedAt: toIso(d.updatedAt),
  };
}

function mapSession(snap) {
  const d = snap.data() || {};
  const resultsRaw = d.results && typeof d.results === 'object' ? d.results : {};
  const results = {};
  for (const [key, val] of Object.entries(resultsRaw)) {
    results[key] = normalizeStatus(val);
  }
  return {
    id: snap.id,
    date: d.date || (toIso(d.createdAt) || '').slice(0, 10) || '',
    notes: String(d.notes || '').trim(),
    results,
    createdAt: toIso(d.createdAt),
    updatedAt: toIso(d.updatedAt),
    createdBy: d.createdBy || null,
    updatedBy: d.updatedBy || null,
  };
}

export function subscribeTestingColumns(onChange, onError) {
  const q = query(columnsCol, orderBy('sortOrder', 'asc'));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map(mapColumn)),
    (err) => onError?.(err)
  );
}

export function subscribeTestingSessions(onChange, onError) {
  const q = query(sessionsCol, orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map(mapSession)),
    (err) => onError?.(err)
  );
}

export async function addTestingColumn({ label, actorUid = null }) {
  const clean = String(label || '').trim();
  if (!clean) throw new Error('Column name is required');
  const ref = await addDoc(columnsCol, {
    label: clean,
    sortOrder: Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: actorUid,
    updatedBy: actorUid,
  });
  return ref.id;
}

export async function updateTestingColumn(id, { label }, actorUid = null) {
  const clean = String(label || '').trim();
  if (!id) throw new Error('Column id is required');
  if (!clean) throw new Error('Column name is required');
  await updateDoc(doc(db, 'appTestingColumns', id), {
    label: clean,
    updatedAt: serverTimestamp(),
    updatedBy: actorUid,
  });
}

export async function deleteTestingColumn(id) {
  if (!id) throw new Error('Column id is required');
  // Remove column doc; session result keys for this column are left orphaned (ignored in UI).
  await deleteDoc(doc(db, 'appTestingColumns', id));
}

export async function addTestingSession({ date, notes = '', actorUid = null, columnIds = [] }) {
  const day = String(date || '').trim();
  if (!day) throw new Error('Date is required');
  const results = {};
  for (const colId of columnIds) {
    results[colId] = 'unchecked';
  }
  const ref = await addDoc(sessionsCol, {
    date: day,
    notes: String(notes || '').trim(),
    results,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: actorUid,
    updatedBy: actorUid,
  });
  return ref.id;
}

export async function updateTestingSession(id, patch, actorUid = null) {
  if (!id) throw new Error('Session id is required');
  const next = {
    updatedAt: serverTimestamp(),
    updatedBy: actorUid,
  };
  if (patch.date !== undefined) {
    const day = String(patch.date || '').trim();
    if (!day) throw new Error('Date is required');
    next.date = day;
  }
  if (patch.notes !== undefined) next.notes = String(patch.notes || '').trim();
  if (patch.results !== undefined && typeof patch.results === 'object') {
    const cleaned = {};
    for (const [key, val] of Object.entries(patch.results)) {
      cleaned[key] = normalizeStatus(val);
    }
    next.results = cleaned;
  }
  await updateDoc(doc(db, 'appTestingSessions', id), next);
}

export async function setSessionCellStatus(sessionId, columnId, status, actorUid = null) {
  if (!sessionId || !columnId) throw new Error('Session and column are required');
  const clean = normalizeStatus(status);
  await updateDoc(doc(db, 'appTestingSessions', sessionId), {
    [`results.${columnId}`]: clean,
    updatedAt: serverTimestamp(),
    updatedBy: actorUid,
  });
}

export async function deleteTestingSession(id) {
  if (!id) throw new Error('Session id is required');
  await deleteDoc(doc(db, 'appTestingSessions', id));
}

export function nextCellStatus(current) {
  const idx = CELL_STATUSES.indexOf(normalizeStatus(current));
  return CELL_STATUSES[(idx + 1) % CELL_STATUSES.length];
}

export function sessionRowTone(session, columns) {
  const statuses = columns.map((c) => normalizeStatus(session.results?.[c.id]));
  if (statuses.some((s) => s === 'fail')) return 'fail';
  if (statuses.length > 0 && statuses.every((s) => s === 'pass' || s === 'na')) return 'pass';
  if (statuses.some((s) => s === 'pass')) return 'partial';
  return 'neutral';
}

/** Seed default columns once if none exist. */
export async function ensureDefaultTestingColumns(actorUid = null) {
  const defaults = [
    'Booking flow',
    'Live Tracking',
    'Notifications',
    'Booking widget',
    'Sign in',
    'Sign up',
    'Payment Method',
    'App Version +1',
    'Payment Flow',
    'Chat Flag test',
    'Version check',
  ];
  // Caller should only invoke when columns.length === 0
  const batch = writeBatch(db);
  const now = Date.now();
  defaults.forEach((label, i) => {
    const ref = doc(columnsCol);
    batch.set(ref, {
      label,
      sortOrder: now + i,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: actorUid,
      updatedBy: actorUid,
    });
  });
  await batch.commit();
}
