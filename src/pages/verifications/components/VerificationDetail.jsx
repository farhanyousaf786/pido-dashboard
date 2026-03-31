import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, XCircle, User, Briefcase, Calendar, Mail, Phone, FileText, AlertTriangle } from 'lucide-react';

export default function VerificationDetail({ request, onBack, onApprove, onReject }) {
  const [adminNotes, setAdminNotes] = useState(request?.adminNotes || '');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const status = request?.status || 'pending';
  const isPending = status.toLowerCase() === 'pending';
  const isProvider = request?.userType === 'serviceProvider';

  const handleApprove = async () => {
    setProcessing(true);
    const result = await onApprove(request.id, adminNotes);
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    setProcessing(true);
    const result = await onReject(request.id, rejectionReason, adminNotes);
    setProcessing(false);
    if (result.success) {
      setShowRejectModal(false);
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
                <span className="info-value">{request?.providerName || request?.customerName || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">User ID</span>
                <span className="info-value monospace">{request?.userId || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Email</span>
                <span className="info-value">{request?.email || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Phone</span>
                <span className="info-value">{request?.phoneNumber || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Submitted</span>
                <span className="info-value">{formatDate(request?.submittedAt)}</span>
              </div>
              {request?.licenseNumber && (
                <div className="info-row">
                  <span className="info-label">License Number</span>
                  <span className="info-value">{request.licenseNumber}</span>
                </div>
              )}
              {request?.licenseExpiryDate && (
                <div className="info-row">
                  <span className="info-label">License Expiry</span>
                  <span className="info-value">{request.licenseExpiryDate}</span>
                </div>
              )}
            </div>
          </div>

          {/* Documents */}
          {request?.documents && (
            <div className="detail-section">
              <h3 className="section-title"><FileText size={18} /> Documents</h3>
              <div className="documents-grid">
                {request.documents.licenseUrl && (
                  <div className="document-item">
                    <span className="doc-label">License</span>
                    <a 
                      href={request.documents.licenseUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="doc-link"
                    >
                      View Document
                    </a>
                  </div>
                )}
                {request.documents.selfieUrl && (
                  <div className="document-item">
                    <span className="doc-label">Selfie</span>
                    <a 
                      href={request.documents.selfieUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="doc-link"
                    >
                      View Photo
                    </a>
                  </div>
                )}
                {request.documents.certificateUrl && (
                  <div className="document-item">
                    <span className="doc-label">Certificate</span>
                    <a 
                      href={request.documents.certificateUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="doc-link"
                    >
                      View Certificate
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Admin Notes */}
          <div className="detail-section">
            <h3 className="section-title">Admin Notes</h3>
            <textarea
              className="admin-notes-textarea"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add notes about this verification..."
              rows={4}
            />
          </div>
        </div>

        {/* Right Column - Actions */}
        <div className="detail-right">
          {isPending ? (
            <div className="action-section">
              <h3>Review Decision</h3>
              <p className="action-description">
                Review the submitted documents and information before making a decision.
              </p>
              
              <div className="action-buttons">
                <button
                  className="approve-btn"
                  onClick={handleApprove}
                  disabled={processing}
                >
                  <CheckCircle size={18} />
                  {processing ? 'Processing...' : 'Approve'}
                </button>
                <button
                  className="reject-btn"
                  onClick={() => setShowRejectModal(true)}
                  disabled={processing}
                >
                  <XCircle size={18} />
                  Reject
                </button>
              </div>
            </div>
          ) : (
            <div className="action-section resolved">
              <h3>Decision Made</h3>
              <div className={`decision-badge ${status.toLowerCase()}`}>
                {status.toLowerCase() === 'approved' ? (
                  <><CheckCircle size={20} /> Approved</>
                ) : (
                  <><XCircle size={20} /> Rejected</>
                )}
              </div>
              {request?.rejectionReason && (
                <div className="rejection-reason">
                  <span className="reason-label">Reason:</span>
                  <p>{request.rejectionReason}</p>
                </div>
              )}
              {request?.approvedAt && (
                <p className="decision-date">
                  Approved on {formatDate(request.approvedAt)}
                </p>
              )}
              {request?.rejectedAt && (
                <p className="decision-date">
                  Rejected on {formatDate(request.rejectedAt)}
                </p>
              )}
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
    </div>
  );
}
