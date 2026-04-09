import React from 'react';
import { User, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';
import { UserHelpers } from '../../../core/models/User.js';

export default function UserRow({ user, onClick }) {
  const isOnline = user.isOnline === true;
  const isProvider = UserHelpers.isServiceProvider(user);
  const isCustomer = UserHelpers.isCustomer(user);
  const nameLabel = UserHelpers.personName(user) || 'Unknown User';

  // Account status badge
  const getStatusBadge = () => {
    switch (user.accountStatus) {
      case 'approved':
        return <span className="status-badge approved"><CheckCircle size={12} /> Approved</span>;
      case 'pending_approval':
        return <span className="status-badge pending"><Clock size={12} /> Pending</span>;
      case 'rejected':
        return <span className="status-badge rejected"><XCircle size={12} /> Rejected</span>;
      default:
        return <span className="status-badge pending"><Clock size={12} /> Unverified</span>;
    }
  };

  return (
    <tr className="user-row">
      <td className="user-cell user-info-cell">
        <div className="user-row-info">
          <div className="user-row-avatar">
            <User size={18} />
          </div>
          <div className="user-row-details">
            <span className="user-row-name" title={user.uid || undefined}>
              {nameLabel}
            </span>
          </div>
        </div>
      </td>
      
      <td className="user-cell user-type-cell">
        <div className="user-type-stack">
          <span className={`user-type ${isProvider ? 'provider' : isCustomer ? 'customer' : ''}`}>
            {isProvider ? 'Service Provider' : isCustomer ? 'Customer' : 'Unknown'}
          </span>
          {user.isTestUser === true ? (
            <span className="user-row-test-pill" title="Test user (isTestUser)">
              Test
            </span>
          ) : null}
        </div>
      </td>
      
      <td className="user-cell">
        {getStatusBadge()}
      </td>
      
      <td className="user-cell">
        <span className={`online-status ${isOnline ? 'online' : 'offline'}`}>
          <span className="online-dot" /> {isOnline ? 'Online' : 'Offline'}
        </span>
      </td>
      
      <td className="user-cell contact-cell">{UserHelpers.contactDisplay(user)}</td>

      <td className="user-cell action-cell">
        <button className="view-user-btn" onClick={(e) => { e.stopPropagation(); onClick && onClick(user); }}>
          <ExternalLink size={16} />
          View
        </button>
      </td>
    </tr>
  );
}
