import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  CreditCard,
  DollarSign,
  Loader2,
  Save,
  Shield,
  User,
  Briefcase,
  AlertCircle,
  RefreshCcw,
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { bookingService } from '../../core/services/bookingService.js';

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

function toInputDateTime(ts) {
  const d = toDate(ts);
  if (!d) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function parseNumberOrNull(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseIntOrNull(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

function parseTimestampOrNull(input) {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return Timestamp.fromDate(d);
}

function cleanString(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function badgeClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'completed') return 'success';
  if (s === 'accepted') return 'info';
  if (s === 'pending') return 'warning';
  if (s === 'cancelled' || s === 'declined' || s === 'failed') return 'danger';
  return 'neutral';
}

export default function BookingDetail({ bookingId, onBack }) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [error, setError] = useState(null);
  const [saveResult, setSaveResult] = useState(null);
  const [statusSaveResult, setStatusSaveResult] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [form, setForm] = useState({
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: '',
    bookingDate: '',
    estimatedArrivalTime: '',

    totalAmount: '',
    currency: 'USD',
    totalServices: '',
    totalDuration: '',

    commissionAmount: '',
    payoutToProfessional: '',
    isRefunded: false,
    refundAmount: '',
    isPaidOut: false,

    serviceProviderUid: '',
    serviceProviderName: '',
    providerStatus: '',

    customerUid: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',

    categoryId: '',
    categoryName: '',

    platform: '',
    appVersion: '',

    cancelledBy: '',
    cancellationReason: '',

    remainingDistance: '',
    distance: '',

    workspaceVerified: false,
    workspaceVerifiedBy: '',
    workspaceRejectionReason: '',
  });

  const [initialForm, setInitialForm] = useState(null);

  useEffect(() => {
    if (!bookingId) return;

    setLoading(true);
    setError(null);

    const unsub = bookingService.subscribeToBooking(
      bookingId,
      (next) => {
        setBooking(next);
        setLoading(false);
        setSaveResult(null);
      },
      (err) => {
        console.error('Error loading booking:', err);
        setError('Failed to load booking.');
        setLoading(false);
      }
    );

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [bookingId]);

  useEffect(() => {
    if (!booking) return;
    const next = {
      status: booking.status || 'pending',
      paymentStatus: booking.paymentStatus || 'pending',
      paymentMethod: booking.paymentMethod || '',
      bookingDate: toInputDateTime(booking.bookingDate),
      estimatedArrivalTime: toInputDateTime(booking.estimatedArrivalTime),

      totalAmount: booking.totalAmount ?? '',
      currency: booking.currency || 'USD',
      totalServices: booking.totalServices ?? '',
      totalDuration: booking.totalDuration ?? '',

      commissionAmount: booking.commissionAmount ?? '',
      payoutToProfessional: booking.payoutToProfessional ?? '',
      isRefunded: booking.isRefunded === true,
      refundAmount: booking.refundAmount ?? '',
      isPaidOut: booking.isPaidOut === true,

      serviceProviderUid: booking.serviceProviderUid || '',
      serviceProviderName: booking.serviceProviderName || '',
      providerStatus: booking.providerStatus || '',

      customerUid: booking.customerUid || '',
      customerName: booking.customerName || '',
      customerEmail: booking.customerEmail || '',
      customerPhone: booking.customerPhone || '',

      categoryId: booking.categoryId || '',
      categoryName: booking.categoryName || '',

      platform: booking.platform || '',
      appVersion: booking.appVersion || '',

      cancelledBy: booking.cancelledBy || '',
      cancellationReason: booking.cancellationReason || '',

      remainingDistance: booking.remainingDistance ?? '',
      distance: booking.distance ?? '',

      workspaceVerified: booking.workspaceVerified === true,
      workspaceVerifiedBy: booking.workspaceVerifiedBy || '',
      workspaceRejectionReason: booking.workspaceRejectionReason || '',
    };

    setForm(next);
    setInitialForm(next);
    setEditMode(false);
    setShowAdvanced(false);
    setStatusSaveResult(null);
  }, [booking]);

  const headerBadges = useMemo(() => {
    return {
      status: booking?.status || '-',
      paymentStatus: booking?.paymentStatus || '-',
      refund: booking?.isRefunded === true ? 'Refunded' : 'Not refunded',
      payout: booking?.isPaidOut === true ? 'Paid out' : 'Not paid out',
    };
  }, [booking]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const buildStatusUpdates = () => {
    return {
      status: cleanString(form.status) || 'pending',
    };
  };

  const buildMainUpdates = () => {
    const updates = {
      paymentStatus: cleanString(form.paymentStatus) || 'pending',
      paymentMethod: cleanString(form.paymentMethod),
      currency: cleanString(form.currency) || 'USD',

      totalAmount: parseNumberOrNull(form.totalAmount) ?? 0,
      totalServices: parseIntOrNull(form.totalServices) ?? 0,
      totalDuration: parseIntOrNull(form.totalDuration) ?? 0,

      commissionAmount: parseNumberOrNull(form.commissionAmount) ?? 0,
      payoutToProfessional: parseNumberOrNull(form.payoutToProfessional) ?? 0,
      isRefunded: form.isRefunded === true,
      refundAmount: parseNumberOrNull(form.refundAmount) ?? 0,
      isPaidOut: form.isPaidOut === true,

      serviceProviderUid: cleanString(form.serviceProviderUid),
      serviceProviderName: cleanString(form.serviceProviderName),
      providerStatus: cleanString(form.providerStatus),

      customerUid: cleanString(form.customerUid),
      customerName: cleanString(form.customerName),
      customerEmail: cleanString(form.customerEmail),
      customerPhone: cleanString(form.customerPhone),

      categoryId: cleanString(form.categoryId),
      categoryName: cleanString(form.categoryName),

      platform: cleanString(form.platform),
      appVersion: cleanString(form.appVersion),

      cancelledBy: cleanString(form.cancelledBy),
      cancellationReason: cleanString(form.cancellationReason),

      remainingDistance: parseNumberOrNull(form.remainingDistance),
      distance: parseNumberOrNull(form.distance),

      workspaceVerified: form.workspaceVerified === true,
      workspaceVerifiedBy: cleanString(form.workspaceVerifiedBy),
      workspaceRejectionReason: cleanString(form.workspaceRejectionReason),
    };

    const bookingDate = parseTimestampOrNull(form.bookingDate);
    const estimatedArrivalTime = parseTimestampOrNull(form.estimatedArrivalTime);

    if (bookingDate) updates.bookingDate = bookingDate;
    if (!bookingDate && form.bookingDate === '') updates.bookingDate = null;

    if (estimatedArrivalTime) updates.estimatedArrivalTime = estimatedArrivalTime;
    if (!estimatedArrivalTime && form.estimatedArrivalTime === '') updates.estimatedArrivalTime = null;

    return updates;
  };

  const buildMainUpdatesForForm = (source) => {
    const tmp = { ...(source || {}) };
    const updates = {
      paymentStatus: cleanString(tmp.paymentStatus) || 'pending',
      paymentMethod: cleanString(tmp.paymentMethod),
      currency: cleanString(tmp.currency) || 'USD',

      totalAmount: parseNumberOrNull(tmp.totalAmount) ?? 0,
      totalServices: parseIntOrNull(tmp.totalServices) ?? 0,
      totalDuration: parseIntOrNull(tmp.totalDuration) ?? 0,

      commissionAmount: parseNumberOrNull(tmp.commissionAmount) ?? 0,
      payoutToProfessional: parseNumberOrNull(tmp.payoutToProfessional) ?? 0,
      isRefunded: tmp.isRefunded === true,
      refundAmount: parseNumberOrNull(tmp.refundAmount) ?? 0,
      isPaidOut: tmp.isPaidOut === true,

      serviceProviderUid: cleanString(tmp.serviceProviderUid),
      serviceProviderName: cleanString(tmp.serviceProviderName),
      providerStatus: cleanString(tmp.providerStatus),

      customerUid: cleanString(tmp.customerUid),
      customerName: cleanString(tmp.customerName),
      customerEmail: cleanString(tmp.customerEmail),
      customerPhone: cleanString(tmp.customerPhone),

      categoryId: cleanString(tmp.categoryId),
      categoryName: cleanString(tmp.categoryName),

      platform: cleanString(tmp.platform),
      appVersion: cleanString(tmp.appVersion),

      cancelledBy: cleanString(tmp.cancelledBy),
      cancellationReason: cleanString(tmp.cancellationReason),

      remainingDistance: parseNumberOrNull(tmp.remainingDistance),
      distance: parseNumberOrNull(tmp.distance),

      workspaceVerified: tmp.workspaceVerified === true,
      workspaceVerifiedBy: cleanString(tmp.workspaceVerifiedBy),
      workspaceRejectionReason: cleanString(tmp.workspaceRejectionReason),
    };

    const bookingDate = parseTimestampOrNull(tmp.bookingDate);
    const estimatedArrivalTime = parseTimestampOrNull(tmp.estimatedArrivalTime);

    if (bookingDate) updates.bookingDate = bookingDate;
    if (!bookingDate && tmp.bookingDate === '') updates.bookingDate = null;

    if (estimatedArrivalTime) updates.estimatedArrivalTime = estimatedArrivalTime;
    if (!estimatedArrivalTime && tmp.estimatedArrivalTime === '') updates.estimatedArrivalTime = null;

    return updates;
  };

  const statusDirty = useMemo(() => {
    if (!initialForm) return false;
    return (cleanString(form.status) || 'pending') !== (cleanString(initialForm.status) || 'pending');
  }, [form.status, initialForm]);

  const mainDirty = useMemo(() => {
    if (!initialForm) return false;
    const a = buildMainUpdatesForForm(initialForm);
    const b = buildMainUpdates();
    return JSON.stringify(a) !== JSON.stringify(b);
  }, [form, initialForm]);

  const handleSave = async () => {
    if (!bookingId) return;

    try {
      setSaving(true);
      setSaveResult(null);
      setError(null);

      const updates = buildMainUpdates();
      await bookingService.updateBooking(bookingId, updates);
      setSaveResult({ success: true, message: 'Saved' });
      setEditMode(false);
    } catch (e) {
      console.error('Failed to save booking:', e);
      setSaveResult({ success: false, message: 'Failed to save', error: e?.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!bookingId) return;

    try {
      setSavingStatus(true);
      setStatusSaveResult(null);
      setError(null);

      const updates = buildStatusUpdates();
      await bookingService.updateBooking(bookingId, updates);
      setStatusSaveResult({ success: true, message: 'Status saved' });
    } catch (e) {
      console.error('Failed to save booking status:', e);
      setStatusSaveResult({ success: false, message: 'Failed to save status', error: e?.message });
    } finally {
      setSavingStatus(false);
    }
  };

  const handleReset = () => {
    if (!booking) return;
    setSaveResult(null);
    setStatusSaveResult(null);
    setForm((prev) => ({ ...prev }));
    // Form will be re-synced via booking effect if you refresh; here we just hard reset by re-applying.
    setForm({
      status: booking.status || 'pending',
      paymentStatus: booking.paymentStatus || 'pending',
      paymentMethod: booking.paymentMethod || '',
      bookingDate: toInputDateTime(booking.bookingDate),
      estimatedArrivalTime: toInputDateTime(booking.estimatedArrivalTime),

      totalAmount: booking.totalAmount ?? '',
      currency: booking.currency || 'USD',
      totalServices: booking.totalServices ?? '',
      totalDuration: booking.totalDuration ?? '',

      commissionAmount: booking.commissionAmount ?? '',
      payoutToProfessional: booking.payoutToProfessional ?? '',
      isRefunded: booking.isRefunded === true,
      refundAmount: booking.refundAmount ?? '',
      isPaidOut: booking.isPaidOut === true,

      serviceProviderUid: booking.serviceProviderUid || '',
      serviceProviderName: booking.serviceProviderName || '',
      providerStatus: booking.providerStatus || '',

      customerUid: booking.customerUid || '',
      customerName: booking.customerName || '',
      customerEmail: booking.customerEmail || '',
      customerPhone: booking.customerPhone || '',

      categoryId: booking.categoryId || '',
      categoryName: booking.categoryName || '',

      platform: booking.platform || '',
      appVersion: booking.appVersion || '',

      cancelledBy: booking.cancelledBy || '',
      cancellationReason: booking.cancellationReason || '',

      remainingDistance: booking.remainingDistance ?? '',
      distance: booking.distance ?? '',

      workspaceVerified: booking.workspaceVerified === true,
      workspaceVerifiedBy: booking.workspaceVerifiedBy || '',
      workspaceRejectionReason: booking.workspaceRejectionReason || '',
    });
    setEditMode(false);
    setShowAdvanced(false);
  };

  if (!bookingId) {
    return (
      <div className="booking-detail-page">
        <div className="user-detail-empty">
          <p>Booking not found</p>
          <button onClick={onBack} className="back-btn">
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="booking-detail-page">
        <div className="booking-detail-loading">
          <Loader2 className="spin" size={22} /> Loading booking…
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="booking-detail-page">
        <div className="user-detail-empty">
          <p>Booking not found</p>
          <button onClick={onBack} className="back-btn">
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-detail-page">
      <div className="user-detail-header booking-detail-header">
        <button onClick={onBack} className="back-btn">
          <ArrowLeft size={20} />
          <span>Back to Bookings</span>
        </button>

        <div className="booking-detail-header-actions">
          <button
            type="button"
            className="bookings-action-btn"
            onClick={() => {
              setEditMode((prev) => !prev);
              setSaveResult(null);
            }}
            disabled={saving || savingStatus}
          >
            <span>{editMode ? 'Exit Edit' : 'Edit'}</span>
          </button>

          <button
            type="button"
            className="bookings-action-btn"
            onClick={handleReset}
            disabled={!editMode || saving || savingStatus}
          >
            <RefreshCcw size={16} />
            <span>Reset</span>
          </button>

          <button
            type="button"
            className="bookings-primary-btn"
            onClick={handleSave}
            disabled={!editMode || !mainDirty || saving || savingStatus}
          >
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            <span>{saving ? 'Saving…' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bookings-error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {saveResult && (
        <div className={saveResult.success ? 'booking-save-banner success' : 'booking-save-banner danger'}>
          <span>
            {saveResult.success ? (
              <>
                <CheckCircle size={16} /> {saveResult.message}
              </>
            ) : (
              <>
                <AlertCircle size={16} /> {saveResult.message}
              </>
            )}
          </span>
          {!saveResult.success && saveResult.error && (
            <span className="booking-save-banner__sub">{saveResult.error}</span>
          )}
        </div>
      )}

      <div className="booking-profile-card">
        <div className="booking-profile-header">
          <div className="booking-profile-icon">
            <Calendar size={28} />
          </div>
          <div className="booking-profile-info">
            <h1 className="booking-profile-name">Booking {booking.bookingId}</h1>
            <div className="booking-profile-badges">
              <span className={`booking-badge ${badgeClass(headerBadges.status)}`}>Status: {headerBadges.status}</span>
              <span className={`booking-badge ${badgeClass(headerBadges.paymentStatus)}`}>Payment: {headerBadges.paymentStatus}</span>
              <span className={`booking-badge ${booking.isRefunded === true ? 'danger' : 'neutral'}`}>{headerBadges.refund}</span>
              <span className={`booking-badge ${booking.isPaidOut === true ? 'success' : 'neutral'}`}>{headerBadges.payout}</span>
            </div>
            <div className="booking-meta">
              <div className="booking-meta-item">
                <span className="detail-label">Created</span>
                <span className="detail-value">{formatDateTime(booking.createdAt)}</span>
              </div>
              <div className="booking-meta-item">
                <span className="detail-label">Updated</span>
                <span className="detail-value">{formatDateTime(booking.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="booking-details-grid">
          <div className="detail-section">
            <h3 className="section-title">
              <Shield size={16} /> Status
            </h3>
            <div className="detail-items">
              <div className="detail-item">
                <span className="detail-label">Booking Status</span>
                <div className="booking-status-row">
                  <select className="booking-input" name="status" value={form.status} onChange={handleChange}>
                    <option value="pending">pending</option>
                    <option value="accepted">accepted</option>
                    <option value="completed">completed</option>
                    <option value="cancelled">cancelled</option>
                    <option value="declined">declined</option>
                  </select>
                  <button
                    type="button"
                    className="bookings-primary-btn booking-status-save"
                    onClick={handleSaveStatus}
                    disabled={!statusDirty || savingStatus || saving}
                  >
                    {savingStatus ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                    <span>{savingStatus ? 'Saving…' : 'Save'}</span>
                  </button>
                </div>
              </div>

              {statusSaveResult && (
                <div className={statusSaveResult.success ? 'booking-inline-result success' : 'booking-inline-result danger'}>
                  <span>
                    {statusSaveResult.success ? (
                      <>
                        <CheckCircle size={16} /> {statusSaveResult.message}
                      </>
                    ) : (
                      <>
                        <AlertCircle size={16} /> {statusSaveResult.message}
                      </>
                    )}
                  </span>
                  {!statusSaveResult.success && statusSaveResult.error && (
                    <span className="booking-inline-result__sub">{statusSaveResult.error}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="detail-section">
            <h3 className="section-title">
              <CreditCard size={16} /> Payment
            </h3>
            <div className="detail-items">
              <div className="detail-item">
                <span className="detail-label">Payment Status</span>
                {editMode ? (
                  <select className="booking-input" name="paymentStatus" value={form.paymentStatus} onChange={handleChange}>
                    <option value="pending">pending</option>
                    <option value="completed">completed</option>
                    <option value="failed">failed</option>
                  </select>
                ) : (
                  <span className="detail-value">{booking.paymentStatus || '-'}</span>
                )}
              </div>

              <div className="detail-item">
                <span className="detail-label">Payment Method</span>
                {editMode ? (
                  <input
                    className="booking-input"
                    name="paymentMethod"
                    value={form.paymentMethod}
                    onChange={handleChange}
                    placeholder="cash / card / stripe / etc"
                  />
                ) : (
                  <span className="detail-value">{booking.paymentMethod || '-'}</span>
                )}
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3 className="section-title">
              <DollarSign size={16} /> Money
            </h3>
            <div className="detail-items">
              <div className="detail-item">
                <span className="detail-label">Total Amount</span>
                {editMode ? (
                  <input
                    type="number"
                    className="booking-input"
                    name="totalAmount"
                    value={form.totalAmount}
                    onChange={handleChange}
                  />
                ) : (
                  <span className="detail-value">{booking.totalAmount ?? '-'}</span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Currency</span>
                {editMode ? (
                  <input className="booking-input" name="currency" value={form.currency} onChange={handleChange} />
                ) : (
                  <span className="detail-value">{booking.currency || '-'}</span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Commission Amount</span>
                {editMode ? (
                  <input
                    type="number"
                    className="booking-input"
                    name="commissionAmount"
                    value={form.commissionAmount}
                    onChange={handleChange}
                  />
                ) : (
                  <span className="detail-value">{booking.commissionAmount ?? '-'}</span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Provider Payout</span>
                {editMode ? (
                  <input
                    type="number"
                    className="booking-input"
                    name="payoutToProfessional"
                    value={form.payoutToProfessional}
                    onChange={handleChange}
                  />
                ) : (
                  <span className="detail-value">{booking.payoutToProfessional ?? '-'}</span>
                )}
              </div>
              <div className="detail-item booking-checkbox">
                {editMode ? (
                  <>
                    <label className="booking-check">
                      <input type="checkbox" name="isRefunded" checked={form.isRefunded} onChange={handleChange} />
                      Refunded
                    </label>
                    <input
                      type="number"
                      className="booking-input"
                      name="refundAmount"
                      value={form.refundAmount}
                      onChange={handleChange}
                      placeholder="Refund amount"
                    />
                  </>
                ) : (
                  <>
                    <span className="detail-value">{booking.isRefunded ? 'Yes' : 'No'}</span>
                    <span className="detail-value">{booking.refundAmount ?? '-'}</span>
                  </>
                )}
              </div>
              <div className="detail-item booking-checkbox">
                {editMode ? (
                  <label className="booking-check">
                    <input type="checkbox" name="isPaidOut" checked={form.isPaidOut} onChange={handleChange} />
                    Paid out
                  </label>
                ) : (
                  <span className="detail-value">{booking.isPaidOut ? 'Yes' : 'No'}</span>
                )}
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3 className="section-title">
              <User size={16} /> Customer
            </h3>
            <div className="detail-items">
              <div className="detail-item">
                <span className="detail-label">Customer UID</span>
                {editMode ? (
                  <input className="booking-input monospace" name="customerUid" value={form.customerUid} onChange={handleChange} />
                ) : (
                  <span className="detail-value monospace">{booking.customerUid || '-'}</span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Customer Name</span>
                {editMode ? (
                  <input className="booking-input" name="customerName" value={form.customerName} onChange={handleChange} />
                ) : (
                  <span className="detail-value">{booking.customerName || '-'}</span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Customer Email</span>
                {editMode ? (
                  <input className="booking-input" name="customerEmail" value={form.customerEmail} onChange={handleChange} />
                ) : (
                  <span className="detail-value">{booking.customerEmail || '-'}</span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Customer Phone</span>
                {editMode ? (
                  <input className="booking-input" name="customerPhone" value={form.customerPhone} onChange={handleChange} />
                ) : (
                  <span className="detail-value">{booking.customerPhone || '-'}</span>
                )}
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3 className="section-title">
              <Briefcase size={16} /> Provider
            </h3>
            <div className="detail-items">
              <div className="detail-item">
                <span className="detail-label">Provider UID</span>
                {editMode ? (
                  <input className="booking-input monospace" name="serviceProviderUid" value={form.serviceProviderUid} onChange={handleChange} />
                ) : (
                  <span className="detail-value monospace">{booking.serviceProviderUid || '-'}</span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Provider Name</span>
                {editMode ? (
                  <input className="booking-input" name="serviceProviderName" value={form.serviceProviderName} onChange={handleChange} />
                ) : (
                  <span className="detail-value">{booking.serviceProviderName || '-'}</span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Provider Status</span>
                {editMode ? (
                  <input className="booking-input" name="providerStatus" value={form.providerStatus} onChange={handleChange} placeholder="optional" />
                ) : (
                  <span className="detail-value">{booking.providerStatus || '-'}</span>
                )}
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3 className="section-title">
              <Calendar size={16} /> Timing
            </h3>
            <div className="detail-items">
              <div className="detail-item">
                <span className="detail-label">Booking Date</span>
                {editMode ? (
                  <input
                    type="datetime-local"
                    className="booking-input"
                    name="bookingDate"
                    value={form.bookingDate}
                    onChange={handleChange}
                  />
                ) : (
                  <span className="detail-value">{formatDateTime(booking.bookingDate)}</span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Estimated Arrival</span>
                {editMode ? (
                  <input
                    type="datetime-local"
                    className="booking-input"
                    name="estimatedArrivalTime"
                    value={form.estimatedArrivalTime}
                    onChange={handleChange}
                  />
                ) : (
                  <span className="detail-value">{formatDateTime(booking.estimatedArrivalTime)}</span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Total Services</span>
                {editMode ? (
                  <input
                    type="number"
                    className="booking-input"
                    name="totalServices"
                    value={form.totalServices}
                    onChange={handleChange}
                  />
                ) : (
                  <span className="detail-value">{booking.totalServices ?? '-'}</span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Total Duration (min)</span>
                {editMode ? (
                  <input
                    type="number"
                    className="booking-input"
                    name="totalDuration"
                    value={form.totalDuration}
                    onChange={handleChange}
                  />
                ) : (
                  <span className="detail-value">{booking.totalDuration ?? '-'}</span>
                )}
              </div>
            </div>
          </div>

          <div className="detail-section booking-advanced">
            <h3 className="section-title">
              <Shield size={16} /> Advanced
            </h3>
            <button
              type="button"
              className="bookings-action-btn booking-advanced-toggle"
              onClick={() => setShowAdvanced((p) => !p)}
              disabled={!editMode}
            >
              <span>{showAdvanced ? 'Hide Advanced Fields' : 'Show Advanced Fields'}</span>
            </button>

            {editMode && showAdvanced && (
              <div className="detail-items">
                <div className="detail-item">
                  <span className="detail-label">Category ID</span>
                  <input className="booking-input monospace" name="categoryId" value={form.categoryId} onChange={handleChange} />
                </div>
                <div className="detail-item">
                  <span className="detail-label">Category Name</span>
                  <input className="booking-input" name="categoryName" value={form.categoryName} onChange={handleChange} />
                </div>

                <div className="detail-item">
                  <span className="detail-label">Platform</span>
                  <input className="booking-input" name="platform" value={form.platform} onChange={handleChange} />
                </div>
                <div className="detail-item">
                  <span className="detail-label">App Version</span>
                  <input className="booking-input" name="appVersion" value={form.appVersion} onChange={handleChange} />
                </div>

                <div className="detail-item">
                  <span className="detail-label">Cancelled By</span>
                  <input className="booking-input" name="cancelledBy" value={form.cancelledBy} onChange={handleChange} placeholder="customer / serviceProvider" />
                </div>
                <div className="detail-item">
                  <span className="detail-label">Cancellation Reason</span>
                  <input className="booking-input" name="cancellationReason" value={form.cancellationReason} onChange={handleChange} placeholder="optional" />
                </div>

                <div className="detail-item">
                  <span className="detail-label">Remaining Distance</span>
                  <input type="number" className="booking-input" name="remainingDistance" value={form.remainingDistance} onChange={handleChange} />
                </div>
                <div className="detail-item">
                  <span className="detail-label">Distance</span>
                  <input type="number" className="booking-input" name="distance" value={form.distance} onChange={handleChange} />
                </div>

                <div className="detail-item booking-checkbox">
                  <label className="booking-check">
                    <input type="checkbox" name="workspaceVerified" checked={form.workspaceVerified} onChange={handleChange} />
                    Workspace Verified
                  </label>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Verified By</span>
                  <input className="booking-input" name="workspaceVerifiedBy" value={form.workspaceVerifiedBy} onChange={handleChange} />
                </div>
                <div className="detail-item">
                  <span className="detail-label">Rejection Reason</span>
                  <input className="booking-input" name="workspaceRejectionReason" value={form.workspaceRejectionReason} onChange={handleChange} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
