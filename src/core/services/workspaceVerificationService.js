import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/firebaseConfig.js';

/**
 * Admin workspace approval (Cloud Function — do not write these fields from the client directly).
 * Backend: approveWorkspaceVerification
 */
export async function approveWorkspaceVerification({ bookingId, workspaceAdminNotes }) {
  if (!bookingId) throw new Error('bookingId is required');
  const fn = httpsCallable(functions, 'approveWorkspaceVerification');
  const payload = {
    bookingId,
    ...(workspaceAdminNotes && String(workspaceAdminNotes).trim()
      ? { workspaceAdminNotes: String(workspaceAdminNotes).trim() }
      : {}),
  };
  const res = await fn(payload);
  return res.data;
}

/**
 * Admin workspace rejection (Cloud Function).
 * Backend: rejectWorkspaceVerification
 */
export async function rejectWorkspaceVerification({ bookingId, workspaceRejectionReason }) {
  if (!bookingId) throw new Error('bookingId is required');
  const reason = (workspaceRejectionReason || '').toString().trim();
  if (!reason) throw new Error('Rejection reason is required');
  const fn = httpsCallable(functions, 'rejectWorkspaceVerification');
  const res = await fn({ bookingId, workspaceRejectionReason: reason });
  return res.data;
}
