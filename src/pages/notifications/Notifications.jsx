import React, { useEffect, useMemo, useState } from 'react';
import {
  Send,
  Users,
  Globe,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader,
  Search,
} from 'lucide-react';
import { collection, limit, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../core/firebase/firebaseConfig.js';
import { notificationService } from '../../core/services/notificationService';
import './Notifications.css';

export default function Notifications() {
  const [activeTab, setActiveTab] = useState('topic');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    body: '',
    data: '',
    image: '',
    topic: 'Pido-all',
    action: 'GENERAL',
    bookingId: '',
    providerId: '',
    customerId: '',
    conversationId: '',
    promotionId: '',
    ticketId: '',
    transactionId: '',
    notificationId: '',
  });
  const [result, setResult] = useState(null);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const lower = searchTerm.toLowerCase();
    return users.filter((user) => {
      const name = (user.name || '').toString().toLowerCase();
      const email = (user.email || '').toString().toLowerCase();
      const phone = (user.phoneNumber || '').toString();
      return (
        name.includes(lower) ||
        email.includes(lower) ||
        phone.includes(searchTerm)
      );
    });
  }, [users, searchTerm]);

  useEffect(() => {
    if (activeTab !== 'users') return;

    const q = query(collection(db, 'users'), limit(500));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = [];
        snap.forEach((doc) => {
          const data = doc.data() || {};
          const fullName = (data.fullName || data.name || data.displayName || '').toString().trim();
          next.push({
            id: doc.id,
            name: fullName || data.email || data.phoneNumber || 'User',
            email: (data.email || '').toString(),
            phoneNumber: (data.phoneNumber || '').toString(),
            userType: (data.userType || '').toString(),
            fcmToken: (data.fcmToken || '').toString(),
          });
        });
        setUsers(next);
      },
      (err) => {
        console.error('Error subscribing to users for notifications:', err);
      }
    );

    return () => unsub();
  }, [activeTab]);

  const handleUserSelect = (userId) => {
    setSelectedUsers((prev) => {
      if (prev.includes(userId)) return prev.filter((id) => id !== userId);
      return [...prev, userId];
    });
  };

  const buildNotificationData = () => {
    const data = {};

    // Main routing payload (flat keys for FCM data)
    if (formData.action) data.action = formData.action;

    if (formData.bookingId) data.bookingId = formData.bookingId;
    if (formData.providerId) data.providerId = formData.providerId;
    if (formData.customerId) data.customerId = formData.customerId;
    if (formData.conversationId) data.conversationId = formData.conversationId;
    if (formData.promotionId) data.promotionId = formData.promotionId;
    if (formData.ticketId) data.ticketId = formData.ticketId;
    if (formData.transactionId) data.transactionId = formData.transactionId;
    if (formData.notificationId) data.notificationId = formData.notificationId;

    // Optional custom JSON data
    if (formData.data) {
      try {
        const custom = JSON.parse(formData.data);
        Object.assign(data, custom);
      } catch (e) {
        console.error('Invalid JSON in data field:', e);
      }
    }

    return Object.keys(data).length > 0 ? data : undefined;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSendNotification = async (type) => {
    setLoading(true);
    setResult(null);

    try {
      if (type === 'users' && selectedUsers.length === 0) {
        setResult({ success: false, message: 'Please select at least one user' });
        return;
      }

      let data = null;

      if (type === 'topic') {
        data = await notificationService.sendTopicNotification({
          topic: formData.topic,
          title: formData.title,
          body: formData.body,
          data: buildNotificationData(),
          image: formData.image || undefined,
        });
      } else if (type === 'users') {
        const selectedModels = selectedUsers
          .map((id) => users.find((u) => u.id === id))
          .filter(Boolean);
        const fcmTokens = selectedModels
          .map((u) => u.fcmToken)
          .filter((t) => t && t.trim() !== '');

        data = await notificationService.sendUsersNotification({
          userIds: selectedUsers,
          fcmTokens,
          title: formData.title,
          body: formData.body,
          data: buildNotificationData(),
          image: formData.image || undefined,
        });
      }

      if (data?.success) {
        setResult({ success: true, message: data.message, details: data.result });
        setFormData({
          title: '',
          body: '',
          data: '',
          image: '',
          topic: 'Pido-all',
          action: 'GENERAL',
          bookingId: '',
          providerId: '',
          customerId: '',
          conversationId: '',
          promotionId: '',
          ticketId: '',
          transactionId: '',
          notificationId: '',
        });
        setSelectedUsers([]);
        setSearchTerm('');
      } else {
        setResult({
          success: false,
          message: data?.message || 'Failed to send notification',
          error: data?.error,
        });
      }
    } catch (e) {
      console.error('Error sending notification:', e);
      setResult({
        success: false,
        message: 'Failed to send notification',
        error: e?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setLoading(true);
    setResult(null);

    try {
      const data = await notificationService.testNotification({
        type: activeTab === 'topic' ? 'topic' : 'user',
        target: activeTab === 'topic' ? formData.topic : selectedUsers[0] || null,
        title: 'Test Notification',
        body: 'This is a test notification from Pido Admin Dashboard',
      });

      setResult({
        success: !!data?.success,
        message: data?.message,
        details: data?.result,
      });
    } catch (e) {
      console.error('Error sending test notification:', e);
      setResult({
        success: false,
        message: 'Failed to send test notification',
        error: e?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedUserModels = useMemo(() => {
    if (selectedUsers.length === 0) return [];
    const map = new Map(users.map((u) => [u.id, u]));
    return selectedUsers.map((id) => map.get(id)).filter(Boolean);
  }, [users, selectedUsers]);

  return (
    <div className="notifications-container">
      <div className="notifications-header">
        <div className="header-title">
          <h1>Notifications Sender</h1>
          <p>Send push notifications to users</p>
        </div>
      </div>

      <div className="notifications-tabs">
        <button
          className={`tab-btn ${activeTab === 'topic' ? 'active' : ''}`}
          onClick={() => setActiveTab('topic')}
          type="button"
        >
          <Globe size={18} />
          Send To All Users
        </button>
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
          type="button"
        >
          <Users size={18} />
          Multiple Users
        </button>
      </div>

      <div className="notifications-content">
        <div className="notification-form">
          <div className="form-section">
            <h3>
              {activeTab === 'topic' && 'Topic Notification'}
              {activeTab === 'users' && 'Multiple Users Notification'}
            </h3>

            {activeTab === 'topic' && (
              <div className="form-group">
                <label>Topic Name</label>
                <input
                  type="text"
                  name="topic"
                  value={formData.topic}
                  onChange={handleInputChange}
                  placeholder="Pido-all"
                  readOnly
                />
                <small>Default topic for all Pido app users</small>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="form-group">
                <label>Search & Select Users</label>
                <div className="search-dropdown-container">
                  <div className="search-input-wrapper">
                    <Search size={16} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search by name, email, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>

                  {searchTerm && filteredUsers.length > 0 && (
                    <div className="dropdown-results">
                      {filteredUsers
                        .filter((user) => !selectedUsers.includes(user.id))
                        .map((user) => (
                          <div
                            key={user.id}
                            className={`dropdown-item ${!user.fcmToken ? 'disabled' : 'clickable'}`}
                            onClick={() => user.fcmToken && handleUserSelect(user.id)}
                          >
                            <div className="tile-content">
                              <div className="tile-header">
                                <span className="customer-name">
                                  {user.name}
                                </span>
                                <span
                                  className={`fcm-badge ${user.fcmToken ? 'has-token' : 'no-token'}`}
                                >
                                  {user.fcmToken ? '✓ FCM' : '✗ No FCM'}
                                </span>
                              </div>
                              <div className="tile-details">
                                <div className="detail-item">
                                  <span className="detail-label">Email:</span>
                                  <span className="detail-value">{user.email || 'N/A'}</span>
                                </div>
                                {!!user.phoneNumber && (
                                  <div className="detail-item">
                                    <span className="detail-label">Phone:</span>
                                    <span className="detail-value">{user.phoneNumber}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {searchTerm && filteredUsers.length === 0 && (
                    <div className="dropdown-empty">No users found</div>
                  )}
                </div>

                {selectedUserModels.length > 0 && (
                  <div className="receivers-section">
                    <div className="receivers-header">
                      <h4>Recipients ({selectedUserModels.length})</h4>
                      <button
                        type="button"
                        className="btn-clear-all"
                        onClick={() => setSelectedUsers([])}
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="receivers-list">
                      {selectedUserModels.map((user) => (
                        <div key={user.id} className="receiver-card">
                          <div className="receiver-info">
                            <div className="receiver-name">
                              {user.name}
                            </div>
                            <div className="receiver-details">
                              <span className="receiver-email">{user.email || 'N/A'}</span>
                              {!!user.phoneNumber && (
                                <span className="receiver-phone">{user.phoneNumber}</span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn-remove-receiver"
                            onClick={() => handleUserSelect(user.id)}
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter notification title"
                required
              />
            </div>

            <div className="form-group">
              <label>Message *</label>
              <textarea
                name="body"
                value={formData.body}
                onChange={handleInputChange}
                placeholder="Enter notification message"
                rows={4}
                required
              />
            </div>

            {false && (
              <div className="form-group">
                <label>Image URL (Optional)</label>
                <input
                  type="url"
                  name="image"
                  value={formData.image}
                  onChange={handleInputChange}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            )}

            {/* <div className="form-group">
              <label>Action (Tap Routing)</label>
              <select
                name="action"
                value={formData.action || 'GENERAL'}
                onChange={handleInputChange}
                className="route-select"
              >
                <option value="GENERAL">Default (Notification detail)</option>
                <option value="BOOKING_CREATED">Booking Created</option>
                <option value="BOOKING_CONFIRMED">Booking Confirmed</option>
                <option value="BOOKING_CANCELLED">Booking Cancelled</option>
                <option value="BOOKING_REMINDER">Booking Reminder</option>
                <option value="PROVIDER_ASSIGNED">Provider Assigned</option>
                <option value="SERVICE_COMPLETED">Service Completed</option>
                <option value="PAYMENT_RECEIVED">Payment Received</option>
                <option value="PAYMENT_FAILED">Payment Failed</option>
                <option value="CHAT_MESSAGE">Chat Message</option>
                <option value="PROMOTION">Promotion</option>
                <option value="REVIEW_REQUEST">Review Request</option>
                <option value="SUPPORT_REPLY">Support Reply</option>
              </select>
              <small>Mobile app will navigate based on this action + IDs below</small>
            </div> */}

            {[
              'BOOKING_CREATED',
              'BOOKING_CONFIRMED',
              'BOOKING_CANCELLED',
              'BOOKING_REMINDER',
              'PROVIDER_ASSIGNED',
              'SERVICE_COMPLETED',
              'PAYMENT_RECEIVED',
              'PAYMENT_FAILED',
              'REVIEW_REQUEST',
            ].includes(formData.action) && (
              <div className="form-group">
                <label>Booking ID</label>
                <input
                  type="text"
                  name="bookingId"
                  value={formData.bookingId || ''}
                  onChange={handleInputChange}
                  placeholder="Enter bookingId"
                />
              </div>
            )}

            {formData.action === 'CHAT_MESSAGE' && (
              <div className="form-group">
                <label>Conversation ID</label>
                <input
                  type="text"
                  name="conversationId"
                  value={formData.conversationId || ''}
                  onChange={handleInputChange}
                  placeholder="Enter conversationId"
                />
              </div>
            )}

            {formData.action === 'PROMOTION' && (
              <div className="form-group">
                <label>Promotion ID</label>
                <input
                  type="text"
                  name="promotionId"
                  value={formData.promotionId || ''}
                  onChange={handleInputChange}
                  placeholder="Enter promotionId"
                />
              </div>
            )}

            {formData.action === 'SUPPORT_REPLY' && (
              <div className="form-group">
                <label>Ticket ID</label>
                <input
                  type="text"
                  name="ticketId"
                  value={formData.ticketId || ''}
                  onChange={handleInputChange}
                  placeholder="Enter ticketId"
                />
              </div>
            )}
{/* 
            {formData.action === 'GENERAL' && (
              <div className="form-group">
                <label>Notification ID (Optional)</label>
                <input
                  type="text"
                  name="notificationId"
                  value={formData.notificationId || ''}
                  onChange={handleInputChange}
                  placeholder="Enter notificationId"
                />
              </div>
            )} */}

            {/* <div className="form-group">
              <label>Data (JSON - Optional)</label>
              <textarea
                name="data"
                value={formData.data}
                onChange={handleInputChange}
                placeholder='{"key": "value"}'
                rows={3}
              />
              <small>Optional custom data in JSON format</small>
            </div> */}

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleTestNotification}
                disabled={
                  loading ||
                  (activeTab === 'users' && selectedUsers.length === 0)
                }
              >
                {loading ? (
                  <Loader size={16} className="animate-spin" />
                ) : (
                  <AlertCircle size={16} />
                )}
                Test Send
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={() => handleSendNotification(activeTab)}
                disabled={
                  loading ||
                  !formData.title ||
                  !formData.body ||
                  (activeTab === 'users' && selectedUsers.length === 0)
                }
              >
                {loading ? (
                  <Loader size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                {loading
                  ? 'Sending...'
                  : activeTab === 'topic'
                    ? 'Send to Topic'
                    : `Send to ${selectedUsers.length} User${
                        selectedUsers.length !== 1 ? 's' : ''
                      }`}
              </button>
            </div>
          </div>
        </div>

        {result && (
          <div className={`result-box ${result.success ? 'success' : 'error'}`}>
            <div className="result-header">
              {result.success ? (
                <>
                  <CheckCircle size={24} className="result-icon success-icon" />
                  <div className="result-title-section">
                    <h4>Notification Sent</h4>
                    <p className="result-subtitle">{result.message}</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle size={24} className="result-icon error-icon" />
                  <div className="result-title-section">
                    <h4>Failed to Send</h4>
                    <p className="result-subtitle">{result.message}</p>
                  </div>
                </>
              )}
            </div>

            {!result.success && result.error && (
              <div className="result-error">
                <strong>Error:</strong>
                <p>{result.error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
