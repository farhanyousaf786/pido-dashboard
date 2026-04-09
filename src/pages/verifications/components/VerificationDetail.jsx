import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle, XCircle, User, Briefcase, FileText, AlertTriangle, Clock } from 'lucide-react';
import { verificationService } from '../../../core/services/verificationService';

export default function VerificationDetail({ request, onBack, onApprove, onReject }) {
  const [liveRequest, setLiveRequest] = useState(request || null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [resolvedUserId, setResolvedUserId] = useState(null);

  const [imageModal, setImageModal] = useState({ open: false, title: '', src: '' });

  const [resolvedUser, setResolvedUser] = useState(null);
  const [profileUserinfo, setProfileUserinfo] = useState(null);

  const displayedRequest = liveRequest || request;
  const requestStatus = displayedRequest?.status || 'pending';
  const isProvider = displayedRequest?.userType === 'serviceProvider';
  const isCustomer = !isProvider;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!displayedRequest?.id) {
        setResolvedUserId(null);
        return;
      }

      try {
        const userId = await verificationService.resolveUserIdFromRequestData(displayedRequest, displayedRequest.id);
        if (!cancelled) setResolvedUserId(userId || null);
      } catch {
        if (!cancelled) setResolvedUserId(null);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [displayedRequest]);

  useEffect(() => {
    if (!resolvedUserId) {
      setProfileUserinfo(null);
      return;
    }
    const unsub = verificationService.subscribeToUserProfileUserinfo(resolvedUserId, (data) => {
      setProfileUserinfo(data);
    });
    return () => {
      if (unsub) unsub();
    };
  }, [resolvedUserId]);

  useEffect(() => {
    if (!request?.id) return;
    const unsub = verificationService.subscribeToVerificationRequestDoc(request.id, (doc) => {
      if (doc) setLiveRequest(doc);
    });
    return () => {
      if (unsub) unsub();
    };
  }, [request?.id]);

  useEffect(() => {
    let unsubscribe = null;
    let cancelled = false;

    const run = async () => {
      if (!isCustomer) {
        setResolvedUser(null);
        return;
      }

      const userId = await verificationService.resolveUserIdFromRequestData(displayedRequest, displayedRequest?.id);
      if (cancelled) return;

      unsubscribe = verificationService.subscribeToUserDoc(userId, (user) => {
        setResolvedUser(user);
      });
    };

    run();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [isCustomer, displayedRequest]);

  const status = useMemo(() => {
    if (!isCustomer) return requestStatus;
    return 'approved';
  }, [isCustomer, requestStatus]);

  useEffect(() => {
    setSelectedStatus(status.toLowerCase());
  }, [status]);

  const isPending = status.toLowerCase() === 'pending';

  const verificationDisplayName = useMemo(() => {
    const fromProfile = (profileUserinfo?.fullName || profileUserinfo?.displayName || '').toString().trim();
    if (fromProfile) return fromProfile;
    const raw = (displayedRequest?.providerName || displayedRequest?.customerName || '').toString().trim();
    if (raw && raw.toLowerCase() !== 'customer') return raw;
    return 'N/A';
  }, [profileUserinfo, displayedRequest]);

  const documents = displayedRequest?.documents || {};
  const licenseUrl = documents.licenseUrl || displayedRequest?.licenseImageUrl || displayedRequest?.licenseUrl || '';
  const selfieUrl = documents.selfieUrl || displayedRequest?.selfieUrl || '';
  const certificateUrl = documents.certificateUrl || displayedRequest?.certificateUrl || '';

  const adminNotes = displayedRequest?.adminNotes || '';

  const handleSetPending = async () => {
    setProcessing(true);
    setActionError(null);
    const res = await verificationService.setPendingRequest(displayedRequest.id, adminNotes);
    setProcessing(false);
    if (!res.success) setActionError(res.error || 'Failed to set status to pending');
  };

  const handleUpdateStatus = async () => {
    if (!selectedStatus) return;
    if (selectedStatus === status.toLowerCase()) return;

    if (selectedStatus === 'approved') {
      await handleApprove();
      return;
    }
    if (selectedStatus === 'rejected') {
      setShowRejectModal(true);
      return;
    }
    await handleSetPending();
  };

  const handleApprove = async () => {
    setProcessing(true);
    setActionError(null);

    const result = isProvider
      ? await verificationService.approveRequest(displayedRequest.id, adminNotes)
      : await onApprove(displayedRequest.id, adminNotes);
    setProcessing(false);
    if (result && result.success === false) setActionError(result.error || 'Failed to approve');
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    setProcessing(true);
    setActionError(null);
    const result = isProvider
      ? await verificationService.rejectRequest(displayedRequest.id, rejectionReason, adminNotes)
      : await onReject(displayedRequest.id, rejectionReason, adminNotes);
    setProcessing(false);
    if (result.success) {
      setShowRejectModal(false);
    } else {
      setActionError(result.error || 'Failed to reject');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleString('en-US', {
        dateStyle: 'long',
        timeStyle: 'short',
      });
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleString('en-US', {
        dateStyle: 'long',
        timeStyle: 'short',
      });
    }
    return 'N/A';
  };

  return (
    <div className="verification-detail-page">
      {/* Header */}
      <div className="verification-detail-header">
        <button onClick={onBack} className="back-btn">
          <ArrowLeft size={20} />
          <span>Back to Verifications</span>
        </button>
      </div>

      {/* Title */}
      <div className="verification-detail-title">
        <h1>Verification Request</h1>
        <span className={`detail-status ${status.toLowerCase()}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      <div className="verification-detail-grid">
        {/* Left Column - Info */}
        <div className="detail-left">
          {/* User Info */}
          <div className="detail-section">
            <h3 className="section-title">
              {isProvider ? <Briefcase size={18} /> : <User size={18} />}
              {isProvider ? 'Provider Information' : 'Customer Information'}
            </h3>
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">Name</span>
                <span className="info-value">{verificationDisplayName}</span>
              </div>
              <div className="info-row">
                <span className="info-label">User ID</span>
                <span className="info-value monospace">{resolvedUserId || displayedRequest?.userId || displayedRequest?.uid || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Email</span>
                <span className="info-value">{displayedRequest?.email || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Phone</span>
                <span className="info-value">{displayedRequest?.phoneNumber || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Submitted</span>
                <span className="info-value">{formatDate(displayedRequest?.submittedAt)}</span>
              </div>
              {displayedRequest?.licenseNumber && (
                <div className="info-row">
                  <span className="info-label">License Number</span>
                  <span className="info-value">{displayedRequest.licenseNumber}</span>
                </div>
              )}
              {displayedRequest?.licenseExpiryDate && (
                <div className="info-row">
                  <span className="info-label">License Expiry</span>
                  <span className="info-value">{displayedRequest.licenseExpiryDate}</span>
                </div>
              )}
            </div>
          </div>

          {/* Documents */}
          {(licenseUrl || selfieUrl || certificateUrl) && (
            <div className="detail-section">
              <h3 className="section-title"><FileText size={18} /> Documents</h3>
              <div className="documents-grid">
                {licenseUrl && (
                  <button
                    type="button"
                    className="document-item document-preview"
                    onClick={() => setImageModal({ open: true, title: 'License', src: licenseUrl })}
                  >
                    <span className="doc-label">License</span>
                    <img className="doc-image" src={licenseUrl} alt="License" loading="lazy" />
                  </button>
                )}
                {selfieUrl && (
                  <button
                    type="button"
                    className="document-item document-preview"
                    onClick={() => setImageModal({ open: true, title: 'Selfie', src: selfieUrl })}
                  >
                    <span className="doc-label">Selfie</span>
                    <img className="doc-image" src={selfieUrl} alt="Selfie" loading="lazy" />
                  </button>
                )}
                {certificateUrl && (
                  <button
                    type="button"
                    className="document-item document-preview"
                    onClick={() => setImageModal({ open: true, title: 'Certificate', src: certificateUrl })}
                  >
                    <span className="doc-label">Certificate</span>
                    <img className="doc-image" src={certificateUrl} alt="Certificate" loading="lazy" />
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Column - Actions */}
        <div className="detail-right">
          {!isCustomer && (
            <div className={`action-section ${isPending ? '' : 'resolved'}`}>
              <h3>Status Actions</h3>
              <p className="action-description">
                You can change status at any time. This updates both verification request and user account status.
              </p>

              {actionError && (
                <div className="verifications-error">
                  <AlertTriangle size={18} />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="status-dropdown-row">
                <select
                  className="status-select"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  disabled={processing}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>

                <button
                  className="update-status-btn"
                  onClick={handleUpdateStatus}
                  disabled={processing || !selectedStatus || selectedStatus === status.toLowerCase()}
                >
                  {processing ? 'Updating...' : 'Update Status'}
                </button>
              </div>

              <div className="action-section-meta">
                {!!displayedRequest?.rejectionReason && (
                  <div className="rejection-reason">
                    <span className="reason-label">Reason:</span>
                    <p>{displayedRequest.rejectionReason}</p>
                  </div>
                )}
                {!!displayedRequest?.approvedAt && (
                  <p className="decision-date">Approved on {formatDate(displayedRequest.approvedAt)}</p>
                )}
                {!!displayedRequest?.rejectedAt && (
                  <p className="decision-date">Rejected on {formatDate(displayedRequest.rejectedAt)}</p>
                )}

                <div className="current-status-tag">
                  <span className="reason-label">Current Status</span>
                  <div className={`decision-badge ${status.toLowerCase()}`}>
                    {status.toLowerCase() === 'approved' ? (
                      <><CheckCircle size={18} /> Approved</>
                    ) : status.toLowerCase() === 'rejected' ? (
                      <><XCircle size={18} /> Rejected</>
                    ) : (
                      <><Clock size={18} /> Pending</>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal-content reject-modal">
            <div className="modal-header">
              <AlertTriangle size={24} className="warning-icon" />
              <h3>Reject Verification</h3>
            </div>
            <div className="modal-body">
              <p>Please provide a reason for rejecting this verification request:</p>
              <textarea
                className="rejection-textarea"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={4}
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowRejectModal(false)}
                disabled={processing}
              >
                Cancel
              </button>
              <button 
                className="btn-danger"
                onClick={handleReject}
                disabled={!rejectionReason.trim() || processing}
              >
                {processing ? 'Processing...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {imageModal.open && (
        <div className="modal-overlay" onClick={() => setImageModal({ open: false, title: '', src: '' })}>
          <div className="modal-content image-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{imageModal.title}</h3>
            </div>
            <div className="modal-body">
              <img className="doc-image-full" src={imageModal.src} alt={imageModal.title} />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setImageModal({ open: false, title: '', src: '' })}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
