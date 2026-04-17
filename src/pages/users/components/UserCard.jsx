import React from 'react';
import { User, Phone, MapPin, Calendar, Shield, CheckCircle, XCircle, Clock } from 'lucide-react';
import { UserHelpers } from '../../../core/models/User.js';

export default function UserCard({ user }) {
  const isOnline = user.isOnline === true;
  const isProvider = UserHelpers.isServiceProvider(user);
  const isCustomer = UserHelpers.isCustomer(user);
  const nameLabel = UserHelpers.personName(user) || 'Unknown User';
  
  // Account status badge (customers always show Approved)
  const getStatusBadge = () => {
    switch (UserHelpers.accountStatusForDisplay(user)) {
      case 'approved':
        return <span className="user-status-badge approved"><CheckCircle size={12} /> Approved</span>;
      case 'pending_approval':
        return <span className="user-status-badge pending"><Clock size={12} /> Pending</span>;
      case 'rejected':
        return <span className="user-status-badge rejected"><XCircle size={12} /> Rejected</span>;
      default:
        return <span className="user-status-badge pending"><Clock size={12} /> Unverified</span>;
    }
  };

  return (
    <div className="user-card">
      <div className="user-card-header">
        <div className="user-avatar">
          <User size={24} />
        </div>
        <div className="user-status-indicator">
          <span className={`online-dot ${isOnline ? 'online' : 'offline'}`} />
          <span className="online-text">{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      <div className="user-card-body">
        <h3 className="user-name">{nameLabel}</h3>
        <p className="user-email">{UserHelpers.contactDisplay(user)}</p>

        <div className="user-type-badges">
          <span className={`type-badge ${isProvider ? 'provider' : isCustomer ? 'customer' : 'unknown'}`}>
            {isProvider ? 'Service Provider' : isCustomer ? 'Customer' : 'Unknown Type'}
          </span>
          {getStatusBadge()}
        </div>

        <div className="user-info-grid">
          {user.phoneNumber && (
            <div className="info-item">
              <Phone size={14} />
              <span>{user.phoneNumber}</span>
            </div>
          )}
          {user.currentAddress && (
            <div className="info-item">
              <MapPin size={14} />
              <span>{user.currentAddress}</span>
            </div>
          )}
          {user.createdAt && (
            <div className="info-item">
              <Calendar size={14} />
              <span>{formatDate(user.createdAt)}</span>
            </div>
          )}
          <div className="info-item">
            <Shield size={14} />
            <span>{user.isNumberVerified ? 'Verified' : 'Unverified'}</span>
          </div>
        </div>
      </div>

      <div className="user-card-footer">
        <span className="user-id">ID: {user.uid?.substring(0, 12)}...</span>
        <button className="view-details-btn">View Details</button>
      </div>
    </div>
  );
}

function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';
  if (timestamp.toDate) {
    return timestamp.toDate().toLocaleDateString();
  }
  if (timestamp instanceof Date) {
    return timestamp.toLocaleDateString();
  }
  return 'Unknown';
}
