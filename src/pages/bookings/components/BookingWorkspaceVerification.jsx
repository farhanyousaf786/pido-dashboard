import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Loader2,
  MapPin,
} from 'lucide-react';
import { BookingHelpers } from '../../../core/models/Booking.js';
import {
  approveWorkspaceVerification,
  rejectWorkspaceVerification,
} from '../../../core/services/workspaceVerificationService.js';

function toDate(ts) {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (ts?.toDate) return ts.toDate();
  return null;
}

function formatDateTime(ts) {
  const d = toDate(ts);
  if (!d) return '-';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function BookingWorkspaceVerification({ booking }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [workspaceApproveNotes, setWorkspaceApproveNotes] = useState('');
  const [workspaceRejectReason, setWorkspaceRejectReason] = useState('');
  const [workspaceFnLoading, setWorkspaceFnLoading] = useState(null);
  const [workspaceFnError, setWorkspaceFnError] = useState(null);
  const [workspaceFnSuccess, setWorkspaceFnSuccess] = useState(null);

  const workspaceState = useMemo(
    () => (booking ? BookingHelpers.getWorkspaceVerificationState(booking) : 'none'),
    [booking],
  );
  const workspacePhotoUrls = useMemo(
    () => (booking ? BookingHelpers.getWorkspacePhotoUrls(booking) : []),
    [booking],
  );

  const previewUrl = workspacePhotoUrls[0] ?? null;

  useEffect(() => {
    if (!booking) return;
    setWorkspaceApproveNotes('');
    setWorkspaceRejectReason('');
    setWorkspaceFnError(null);
    setWorkspaceFnSuccess(null);
    setWorkspaceFnLoading(null);
  }, [booking]);

  useEffect(() => {
    if (!dialogOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setDialogOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialogOpen]);

  const handleApproveWorkspace = async () => {
    if (!booking?.bookingId) return;
    setWorkspaceFnLoading('approve');
    setWorkspaceFnError(null);
    setWorkspaceFnSuccess(null);
    try {
      await approveWorkspaceVerification({
        bookingId: booking.bookingId,
        workspaceAdminNotes: workspaceApproveNotes.trim() || undefined,
      });
      setWorkspaceFnSuccess('Workspace approved.');
      setWorkspaceApproveNotes('');
    } catch (e) {
      setWorkspaceFnError(e?.message || 'Approve failed');
    } finally {
      setWorkspaceFnLoading(null);
    }
  };

  const handleRejectWorkspace = async () => {
    if (!booking?.bookingId) return;
    const reason = workspaceRejectReason.trim();
    if (!reason) {
      setWorkspaceFnError('Enter a rejection reason.');
      return;
    }
    setWorkspaceFnLoading('reject');
    setWorkspaceFnError(null);
    setWorkspaceFnSuccess(null);
    try {
      await rejectWorkspaceVerification({
        bookingId: booking.bookingId,
        workspaceRejectionReason: reason,
      });
      setWorkspaceFnSuccess('Workspace rejected.');
      setWorkspaceRejectReason('');
    } catch (e) {
      setWorkspaceFnError(e?.message || 'Reject failed');
    } finally {
      setWorkspaceFnLoading(null);
    }
  };

  if (!booking) return null;

  const statusBadgeClass =
    workspaceState === 'approved'
      ? 'success'
      : workspaceState === 'rejected'
        ? 'danger'
        : workspaceState === 'pending'
          ? 'warning'
          : 'neutral';

  const statusLabel =
    workspaceState === 'none'
      ? 'No workspace photos'
      : workspaceState === 'pending'
        ? 'Pending review'
        : workspaceState === 'approved'
          ? 'Approved'
          : 'Rejected';

  return (
    <div className="detail-section booking-workspace-section booking-workspace-card">
      <h3 className="section-title">
        <Building2 size={16} /> Workspace verification
      </h3>
      <p className="booking-workspace-intro">
        Photos and flags are stored on <code className="monospace">bookings/&lt;bookingId&gt;</code>. Approve or reject
        via Cloud Functions from the detail dialog (not a normal Firestore save).
      </p>

      <div className="booking-workspace-compact">
        <div className="booking-workspace-compact-preview">
          {previewUrl ? (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" title="Open full image">
              <img src={previewUrl} alt="" loading="lazy" />
            </a>
          ) : (
            <div className="booking-workspace-compact-placeholder">No photo</div>
          )}
        </div>
        <div className="booking-workspace-compact-meta">
          <span className={`booking-badge ${statusBadgeClass}`}>{statusLabel}</span>
          <button type="button" className="bookings-action-btn booking-workspace-detail-btn" onClick={() => setDialogOpen(true)}>
            Detail
          </button>
        </div>
      </div>

      {dialogOpen && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDialogOpen(false);
          }}
        >
          <div
            className="modal-content booking-workspace-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-workspace-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <Building2 size={24} className="booking-workspace-modal-icon" />
              <h3 id="booking-workspace-modal-title">Workspace verification</h3>
            </div>
            <div className="modal-body booking-workspace-modal-body">
              <p className="booking-workspace-intro booking-workspace-intro--tight">
                Review photos and metadata, then approve or reject. Actions call Cloud Functions only.
              </p>

              <div className="booking-workspace-status-row">
                <span className={`booking-badge ${statusBadgeClass}`}>{statusLabel}</span>
              </div>

              {workspacePhotoUrls.length > 0 ? (
                <div className="booking-workspace-photos booking-workspace-photos--modal">
                  {workspacePhotoUrls.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="booking-workspace-photo-link"
                    >
                      <img src={url} alt="" className="booking-workspace-photo" loading="lazy" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="detail-value booking-workspace-empty">No workspace images on this booking.</p>
              )}

              <div className="detail-items booking-workspace-readonly">
                <div className="detail-item">
                  <span className="detail-label">Verified at</span>
                  <span className="detail-value">{formatDateTime(booking.workspaceVerifiedAt)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Verified by</span>
                  <span className="detail-value monospace">{booking.workspaceVerifiedBy || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Provider notes</span>
                  <span className="detail-value">{booking.workspaceProviderNotes || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Admin notes (on booking)</span>
                  <span className="detail-value">{booking.workspaceAdminNotes || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Rejection reason</span>
                  <span className="detail-value">{booking.workspaceRejectionReason || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Rejected at</span>
                  <span className="detail-value">{formatDateTime(booking.workspaceRejectedAt)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Rejected by</span>
                  <span className="detail-value monospace">{booking.workspaceRejectedBy || '—'}</span>
                </div>
              </div>

              <div className="booking-location-verify">
                <h4 className="booking-workspace-subtitle">
                  <MapPin size={14} /> Location check (GPS)
                </h4>
                <p className="booking-workspace-intro booking-workspace-intro--tight">
                  Not the same as workspace photo approval — GPS / distance fields on the same booking.
                </p>
                <div className="detail-items booking-workspace-readonly">
                  <div className="detail-item">
                    <span className="detail-label">locationVerified</span>
                    <span className="detail-value">
                      {booking.locationVerified == null ? '—' : String(booking.locationVerified)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">verifiedDistance</span>
                    <span className="detail-value">
                      {booking.verifiedDistance == null ? '—' : String(booking.verifiedDistance)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">verifiedLatitude / verifiedLongitude</span>
                    <span className="detail-value monospace">
                      {booking.verifiedLatitude != null && booking.verifiedLongitude != null
                        ? `${booking.verifiedLatitude}, ${booking.verifiedLongitude}`
                        : '—'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">verifiedAt</span>
                    <span className="detail-value">{formatDateTime(booking.verifiedAt)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">verificationMethod</span>
                    <span className="detail-value">{booking.verificationMethod || '—'}</span>
                  </div>
                </div>
              </div>

              {workspaceFnError && (
                <div className="booking-workspace-fn-msg booking-workspace-fn-msg--error">
                  <AlertCircle size={16} /> {workspaceFnError}
                </div>
              )}
              {workspaceFnSuccess && (
                <div className="booking-workspace-fn-msg booking-workspace-fn-msg--ok">
                  <CheckCircle size={16} /> {workspaceFnSuccess}
                </div>
              )}

              <div className="booking-workspace-actions">
                <div className="booking-workspace-field">
                  <span className="detail-label">Admin notes (sent with approve)</span>
                  <textarea
                    className="booking-input booking-workspace-textarea"
                    value={workspaceApproveNotes}
                    onChange={(e) => setWorkspaceApproveNotes(e.target.value)}
                    rows={2}
                    placeholder="Optional"
                    disabled={workspacePhotoUrls.length === 0 || workspaceFnLoading}
                  />
                </div>
                <div className="booking-workspace-field">
                  <span className="detail-label">Rejection reason (required to reject)</span>
                  <textarea
                    className="booking-input booking-workspace-textarea"
                    value={workspaceRejectReason}
                    onChange={(e) => setWorkspaceRejectReason(e.target.value)}
                    rows={2}
                    placeholder="Why is this workspace rejected?"
                    disabled={workspacePhotoUrls.length === 0 || workspaceFnLoading}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer booking-workspace-modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDialogOpen(false)}
                disabled={workspaceFnLoading}
              >
                Close
              </button>
              <button
                type="button"
                className="bookings-delete-btn"
                onClick={handleRejectWorkspace}
                disabled={
                  workspacePhotoUrls.length === 0 || workspaceFnLoading || workspaceState === 'rejected'
                }
              >
                {workspaceFnLoading === 'reject' ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <AlertCircle size={16} />
                )}
                <span>Reject workspace</span>
              </button>
              <button
                type="button"
                className="bookings-primary-btn"
                onClick={handleApproveWorkspace}
                disabled={
                  workspacePhotoUrls.length === 0 || workspaceFnLoading || workspaceState === 'approved'
                }
              >
                {workspaceFnLoading === 'approve' ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                <span>Approve workspace</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
