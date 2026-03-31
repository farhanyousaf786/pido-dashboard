import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, ExternalLink, Trash2, AlertTriangle } from 'lucide-react';

export default function VerificationQueue({ requests, loading, onView }) {
  const [selected, setSelected] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelected(requests.map(r => r.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelected(prev => {
      if (prev.includes(id)) {
        return prev.filter(s => s !== id);
      }
      return [...prev, id];
    });
  };

  const isAllSelected = requests.length > 0 && selected.length === requests.length;
  const isSomeSelected = selected.length > 0 && selected.length < requests.length;

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleString('en-US', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleString('en-US', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    }
    return 'N/A';
  };

  const getStatusBadge = (status) => {
    switch ((status || 'pending').toLowerCase()) {
      case 'approved':
        return <span className="verification-status approved"><CheckCircle size={14} /> Approved</span>;
      case 'rejected':
        return <span className="verification-status rejected"><XCircle size={14} /> Rejected</span>;
      default:
        return <span className="verification-status pending"><Clock size={14} /> Pending</span>;
    }
  };

  const getUserTypeBadge = (userType) => {
    if (userType === 'serviceProvider') {
      return <span className="user-type-badge provider">Provider</span>;
    }
    return <span className="user-type-badge customer">Customer</span>;
  };

  if (loading) {
    return (
      <div className="verification-queue-loading">
        <div className="table-row-skeleton" />
        <div className="table-row-skeleton" />
        <div className="table-row-skeleton" />
        <div className="table-row-skeleton" />
      </div>
    );
  }

  return (
    <div className="verification-queue">
      {/* Bulk Actions */}
      {selected.length > 0 && (
        <div className="bulk-actions-bar">
          <span>{selected.length} selected</span>
          <button 
            className="bulk-delete-btn"
            onClick={() => setDeleteConfirm(true)}
          >
            <Trash2 size={16} />
            Delete Selected
          </button>
        </div>
      )}

      {/* Table */}
      <div className="verification-table-container">
        {requests.length === 0 ? (
          <div className="verification-empty">
            <ShieldCheck size={48} className="empty-icon" />
            <h3>No verification requests found</h3>
            <p>Requests will appear here when users submit them</p>
          </div>
        ) : (
          <table className="verification-table">
            <thead>
              <tr>
                <th className="checkbox-cell">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => el && (el.indeterminate = isSomeSelected)}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Contact</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                const isSelected = selected.includes(request.id);
                const status = request.status || 'pending';
                const contactInfo = request.email || request.phoneNumber || 'N/A';
                
                return (
                  <tr 
                    key={request.id} 
                    className={isSelected ? 'selected' : ''}
                  >
                    <td className="checkbox-cell">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectOne(request.id)}
                      />
                    </td>
                    <td className="id-cell">{request.id}</td>
                    <td className="name-cell">{request.providerName || request.customerName || 'N/A'}</td>
                    <td>{getUserTypeBadge(request.userType)}</td>
                    <td className="contact-cell">{contactInfo}</td>
                    <td className="date-cell">{formatDate(request.submittedAt)}</td>
                    <td>{getStatusBadge(status)}</td>
                    <td className="action-cell">
                      <button 
                        className="view-btn"
                        onClick={() => onView(request)}
                      >
                        <ExternalLink size={16} />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <AlertTriangle size={24} className="warning-icon" />
              <h3>Delete Verification Requests</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete {selected.length} verification request(s)?</p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-danger"
                onClick={() => {
                  // Handle delete
                  setDeleteConfirm(false);
                  setSelected([]);
                }}
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
