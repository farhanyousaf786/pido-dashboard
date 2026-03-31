import React, { useEffect, useState } from 'react';
import { ArrowLeft, User, Phone, MapPin, Calendar, Shield, CheckCircle, XCircle, Clock, Mail, Globe, Info } from 'lucide-react';
import { UserHelpers } from '../../../core/models/User.js';

export default function UserDetail({ user, onBack }) {
  const [loading, setLoading] = useState(false);

  const isOnline = user?.isOnline === true;
  const isProvider = UserHelpers.isServiceProvider(user);
  const isCustomer = UserHelpers.isCustomer(user);
  const displayName = UserHelpers.displayName(user) || 'Unknown User';

  const getStatusBadge = () => {
    switch (user?.accountStatus) {
      case 'approved':
        return <span className="detail-status-badge approved"><CheckCircle size={14} /> Approved</span>;
      case 'pending_approval':
        return <span className="detail-status-badge pending"><Clock size={14} /> Pending</span>;
      case 'rejected':
        return <span className="detail-status-badge rejected"><XCircle size={14} /> Rejected</span>;
      default:
        return <span className="detail-status-badge pending"><Clock size={14} /> Unverified</span>;
    }
  };

  if (!user) {
    return (
      <div className="user-detail-page">
        <div className="user-detail-empty">
          <p>User not found</p>
          <button onClick={onBack} className="back-btn">
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-detail-page">
      {/* Header with back button */}
      <div className="user-detail-header">
        <button onClick={onBack} className="back-btn">
          <ArrowLeft size={20} />
          <span>Back to Users</span>
        </button>
      </div>

      {/* User Profile Card */}
      <div className="user-profile-card">
        <div className="user-profile-header">
          <div className="user-profile-avatar">
            <User size={48} />
          </div>
          <div className="user-profile-info">
            <h1 className="user-profile-name">{displayName}</h1>
            <div className="user-profile-badges">
              <span className={`profile-type-badge ${isProvider ? 'provider' : isCustomer ? 'customer' : ''}`}>
                {isProvider ? 'Service Provider' : isCustomer ? 'Customer' : 'Unknown Type'}
              </span>
              {getStatusBadge()}
              <span className={`online-badge ${isOnline ? 'online' : 'offline'}`}>
                <span className="online-dot" /> {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* User Details Grid */}
        <div className="user-details-grid">
          <div className="detail-section">
            <h3 className="section-title"><User size={16} /> Basic Information</h3>
            <div className="detail-items">
              <div className="detail-item">
                <span className="detail-label">User ID</span>
                <span className="detail-value monospace">{user.uid}</span>
              </div>
              {user.email && (
                <div className="detail-item">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{user.email}</span>
                </div>
              )}
              {user.phoneNumber && (
                <div className="detail-item">
                  <span className="detail-label"><Phone size={14} /> Phone</span>
                  <span className="detail-value">{user.phoneNumber}</span>
                </div>
              )}
              {user.createdAt && (
                <div className="detail-item">
                  <span className="detail-label"><Calendar size={14} /> Joined</span>
                  <span className="detail-value">{formatDate(user.createdAt)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="detail-section">
            <h3 className="section-title"><MapPin size={16} /> Location</h3>
            <div className="detail-items">
              {user.currentAddress ? (
                <div className="detail-item">
                  <span className="detail-label">Address</span>
                  <span className="detail-value">{user.currentAddress}</span>
                </div>
              ) : (
                <div className="detail-item">
                  <span className="detail-label">Address</span>
                  <span className="detail-value empty">Not set</span>
                </div>
              )}
              {(user.latitude && user.longitude) && (
                <div className="detail-item">
                  <span className="detail-label">Coordinates</span>
                  <span className="detail-value monospace">
                    {user.latitude.toFixed(6)}, {user.longitude.toFixed(6)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="detail-section">
            <h3 className="section-title"><Shield size={16} /> Verification Status</h3>
            <div className="detail-items">
              <div className="detail-item">
                <span className="detail-label">Phone Verified</span>
                <span className={`detail-value ${user.isNumberVerified ? 'verified' : 'unverified'}`}>
                  {user.isNumberVerified ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Account Verified</span>
                <span className={`detail-value ${user.verify ? 'verified' : 'unverified'}`}>
                  {user.verify ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Profile Complete</span>
                <span className={`detail-value ${user.isProfileComplete ? 'verified' : 'unverified'}`}>
                  {user.isProfileComplete ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {isProvider && (
            <div className="detail-section">
              <h3 className="section-title"><Info size={16} /> Provider Details</h3>
              <div className="detail-items">
                <div className="detail-item">
                  <span className="detail-label">Services Chosen</span>
                  <span className={`detail-value ${user.areServicesChosen ? 'verified' : 'unverified'}`}>
                    {user.areServicesChosen ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Address Set</span>
                  <span className={`detail-value ${user.isAddress ? 'verified' : 'unverified'}`}>
                    {user.isAddress ? 'Yes' : 'No'}
                  </span>
                </div>
                {user.commission && (
                  <div className="detail-item">
                    <span className="detail-label">Commission</span>
                    <span className="detail-value">{user.commission}%</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {user.lastActive && (
            <div className="detail-section">
              <h3 className="section-title"><Globe size={16} /> Activity</h3>
              <div className="detail-items">
                <div className="detail-item">
                  <span className="detail-label">Last Active</span>
                  <span className="detail-value">{formatDateTime(user.lastActive)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(timestamp) {
  if (!timestamp) return '-';
  if (timestamp.toDate) {
    return timestamp.toDate().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  if (timestamp instanceof Date) {
    return timestamp.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  return '-';
}

function formatDateTime(timestamp) {
  if (!timestamp) return '-';
  if (timestamp.toDate) {
    return timestamp.toDate().toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  if (timestamp instanceof Date) {
    return timestamp.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  return '-';
}
