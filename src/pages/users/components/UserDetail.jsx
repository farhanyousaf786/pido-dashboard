import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Phone, MapPin, Calendar, Shield, CheckCircle, XCircle, Clock, Globe, Info, Bell, FlaskConical, Loader2 } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../core/firebase/firebaseConfig.js';
import { UserHelpers } from '../../../core/models/User.js';
import { notificationService } from '../../../core/services/notificationService.js';

export default function UserDetail({ user, onBack, onUserPatch }) {
  const [loading, setLoading] = useState(false);
  const [isTestUser, setIsTestUser] = useState(() => user?.isTestUser === true);
  const [testUserSaving, setTestUserSaving] = useState(false);

  useEffect(() => {
    setIsTestUser(user?.isTestUser === true);
  }, [user?.uid, user?.isTestUser]);
  const [pushForm, setPushForm] = useState({
    title: '',
    body: '',
  });
  const [pushResult, setPushResult] = useState(null);

  const isOnline = user?.isOnline === true;
  const isProvider = UserHelpers.isServiceProvider(user);
  const isCustomer = UserHelpers.isCustomer(user);
  const displayName = UserHelpers.personName(user) || 'Unknown User';
  const hasFcm = !!(user?.fcmToken && String(user.fcmToken).trim());

  const handlePushChange = (e) => {
    const { name, value } = e.target;
    setPushForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTestUserToggle = async () => {
    if (!user?.uid) return;
    const next = !isTestUser;
    setTestUserSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isTestUser: next,
        updatedAt: serverTimestamp(),
      });
      setIsTestUser(next);
      onUserPatch?.({ isTestUser: next });
    } catch (e) {
      console.error('isTestUser update:', e);
      window.alert(e?.message || 'Could not update test user flag. Check Firestore rules.');
    } finally {
      setTestUserSaving(false);
    }
  };

  const handleSendPush = async () => {
    try {
      setLoading(true);
      setPushResult(null);

      if (!pushForm.title || !pushForm.body) {
        setPushResult({ success: false, message: 'Title and message are required' });
        return;
      }

      const payload = {
        userIds: [user.uid],
        fcmTokens: hasFcm ? [String(user.fcmToken).trim()] : undefined,
        title: pushForm.title,
        body: pushForm.body,
      };

      const res = await notificationService.sendUsersNotification(payload);
      if (res?.success) {
        setPushResult({ success: true, message: res.message || 'Notification sent' });
        setPushForm((prev) => ({
          ...prev,
          title: '',
          body: '',
        }));
      } else {
        setPushResult({ success: false, message: res?.message || 'Failed to send', error: res?.error });
      }
    } catch (e) {
      setPushResult({ success: false, message: 'Failed to send', error: e?.message });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (UserHelpers.accountStatusForDisplay(user)) {
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
              {isTestUser ? (
                <span className="profile-type-badge test-user-badge">
                  <FlaskConical size={14} aria-hidden /> Test user
                </span>
              ) : null}
              {getStatusBadge()}
              <span className={`online-badge ${isOnline ? 'online' : 'offline'}`}>
                <span className="online-dot" /> {isOnline ? 'Online' : 'Offline'}
              </span>
              <span className={`fcm-badge ${hasFcm ? 'has' : 'missing'}`}>
                <Bell size={14} /> Can Send {hasFcm ? 'Yes' : 'No'}
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

          <div className="detail-section user-admin-section">
            <h3 className="section-title">
              <FlaskConical size={16} aria-hidden /> Admin
            </h3>
            <p className="user-admin-hint">
              Mark accounts used for QA or staging. Filter the user list with <strong>Test users</strong> /{' '}
              <strong>Production only</strong>.
            </p>
            <div className="user-admin-switch-row">
              <div>
                <span className="user-admin-switch-label">Test user</span>
                <span className="user-admin-switch-sublabel">Firestore field <code className="monospace">isTestUser</code></span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isTestUser}
                aria-busy={testUserSaving}
                disabled={testUserSaving}
                className={`user-test-user-switch ${isTestUser ? 'user-test-user-switch--on' : ''}`}
                onClick={handleTestUserToggle}
              >
                <span className="user-test-user-switch__thumb" />
                <span className="visually-hidden">{isTestUser ? 'On' : 'Off'}</span>
              </button>
            </div>
            {testUserSaving ? (
              <p className="user-admin-saving">
                <Loader2 size={14} className="spin" aria-hidden /> Saving…
              </p>
            ) : null}
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

          <div className="detail-section">
            <h3 className="section-title"><Bell size={16} /> Push Notification</h3>
            <div className="push-notification">
              <div className="push-form">
                <div className="push-row">
                  <div className="push-field">
                    <span className="detail-label">Title</span>
                    <input
                      className="push-input"
                      type="text"
                      name="title"
                      value={pushForm.title}
                      onChange={handlePushChange}
                      placeholder="Enter title"
                    />
                  </div>
                </div>

                <div className="push-row">
                  <div className="push-field">
                    <span className="detail-label">Message</span>
                    <textarea
                      className="push-textarea"
                      name="body"
                      value={pushForm.body}
                      onChange={handlePushChange}
                      placeholder="Enter message"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="push-actions">
                  <button
                    type="button"
                    className="push-send-btn"
                    onClick={handleSendPush}
                    disabled={loading || !pushForm.title || !pushForm.body}
                  >
                    {loading ? 'Sending...' : 'Send Push'}
                  </button>
                </div>

                {pushResult && (
                  <div className={`push-result ${pushResult.success ? 'success' : 'error'}`}>
                    <div className="push-result-title">{pushResult.success ? 'Sent' : 'Failed'}</div>
                    <div className="push-result-message">{pushResult.message}</div>
                    {!!pushResult.error && <div className="push-result-error">Error: {pushResult.error}</div>}
                  </div>
                )}
              </div>
            </div>
          </div>
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
