import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Filter,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { bookingService } from '../../core/services/bookingService.js';

const BOOKINGS_PER_PAGE = 25;
const LOAD_MORE_COUNT = 25;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function getCreatedAtDate(booking) {
  const ts = booking?.createdAt;
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (ts?.toDate) return ts.toDate();
  return null;
}

function formatDateTime(ts) {
  if (!ts) return '-';
  const d = ts instanceof Date ? ts : ts?.toDate ? ts.toDate() : null;
  if (!d) return '-';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(amount, currency = 'USD') {
  const n = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(n)) return '-';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

function statusBadgeClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'completed') return 'success';
  if (s === 'accepted') return 'info';
  if (s === 'pending') return 'warning';
  if (s === 'cancelled' || s === 'declined') return 'danger';
  return 'neutral';
}

function maskUid(uid) {
  const s = String(uid || '').trim();
  if (!s) return '-';
  if (s.length <= 6) return s;
  return s.slice(-6);
}

export default function Bookings({ onBookingClick }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [visibleCount, setVisibleCount] = useState(BOOKINGS_PER_PAGE);
  const [searchQuery, setSearchQuery] = useState('');

  const [filters, setFilters] = useState({
    status: 'all',
    paymentStatus: 'all',
    paymentMethod: 'all',
    platform: 'all',
    refund: 'all',
    payout: 'all',
    dateFilter: 'all',
    customStart: '',
    customEnd: '',
    minAmount: '',
    maxAmount: '',
    providerQuery: '',
    customerQuery: '',
  });

  const dateRange = useMemo(() => {
    if (filters.dateFilter === 'all') return null;

    const now = new Date();
    if (filters.dateFilter === 'today') {
      const start = startOfDay(now);
      const end = addDays(start, 1);
      return { start, end };
    }
    if (filters.dateFilter === 'yesterday') {
      const end = startOfDay(now);
      const start = addDays(end, -1);
      return { start, end };
    }
    if (filters.dateFilter === 'week') {
      const end = addDays(startOfDay(now), 1);
      const start = addDays(end, -7);
      return { start, end };
    }
    if (filters.dateFilter === 'range') {
      if (!filters.customStart || !filters.customEnd) return null;
      const start = startOfDay(new Date(`${filters.customStart}T00:00:00`));
      const endInclusive = startOfDay(new Date(`${filters.customEnd}T00:00:00`));
      const end = addDays(endInclusive, 1);
      return { start, end };
    }

    return null;
  }, [filters.dateFilter, filters.customStart, filters.customEnd]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsub = bookingService.subscribeToBookings(
      { limitCount: 1000 },
      (next) => {
        setBookings(next);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching bookings:', err);
        setError('Failed to load bookings. Please try again.');
        setLoading(false);
      }
    );

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  useEffect(() => {
    setVisibleCount(BOOKINGS_PER_PAGE);
  }, [searchQuery, filters]);

  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    if (filters.status && filters.status !== 'all') {
      result = result.filter((b) => String(b.status || '').toLowerCase() === filters.status);
    }
    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
      result = result.filter(
        (b) => String(b.paymentStatus || '').toLowerCase() === filters.paymentStatus
      );
    }
    if (filters.paymentMethod && filters.paymentMethod !== 'all') {
      result = result.filter(
        (b) => String(b.paymentMethod || '').toLowerCase() === filters.paymentMethod
      );
    }
    if (filters.platform && filters.platform !== 'all') {
      result = result.filter((b) => String(b.platform || '').toLowerCase() === filters.platform);
    }
    if (filters.refund !== 'all') {
      const isRefunded = b => b?.isRefunded === true;
      result = result.filter((b) => (filters.refund === 'refunded' ? isRefunded(b) : !isRefunded(b)));
    }
    if (filters.payout !== 'all') {
      const isPaidOut = b => b?.isPaidOut === true;
      result = result.filter((b) => (filters.payout === 'paidout' ? isPaidOut(b) : !isPaidOut(b)));
    }

    if (dateRange?.start || dateRange?.end) {
      result = result.filter((b) => {
        const createdAt = getCreatedAtDate(b);
        if (!createdAt) return false;
        if (dateRange?.start && createdAt < dateRange.start) return false;
        if (dateRange?.end && createdAt >= dateRange.end) return false;
        return true;
      });
    }

    const minAmount = filters.minAmount !== '' ? Number(filters.minAmount) : null;
    const maxAmount = filters.maxAmount !== '' ? Number(filters.maxAmount) : null;
    if (minAmount != null && Number.isFinite(minAmount)) {
      result = result.filter((b) => (Number(b.totalAmount) || 0) >= minAmount);
    }
    if (maxAmount != null && Number.isFinite(maxAmount)) {
      result = result.filter((b) => (Number(b.totalAmount) || 0) <= maxAmount);
    }

    if (filters.providerQuery?.trim()) {
      const q = filters.providerQuery.trim().toLowerCase();
      result = result.filter((b) => {
        const uid = String(b.serviceProviderUid || '').toLowerCase();
        const name = String(b.serviceProviderName || '').toLowerCase();
        return uid.includes(q) || name.includes(q);
      });
    }

    if (filters.customerQuery?.trim()) {
      const q = filters.customerQuery.trim().toLowerCase();
      result = result.filter((b) => {
        const uid = String(b.customerUid || '').toLowerCase();
        const name = String(b.customerName || '').toLowerCase();
        const email = String(b.customerEmail || '').toLowerCase();
        return uid.includes(q) || name.includes(q) || email.includes(q);
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((b) => {
        const id = String(b.bookingId || '').toLowerCase();
        const intent = String(b.paymentIntentId || '').toLowerCase();
        const cat = String(b.categoryName || '').toLowerCase();
        return id.includes(q) || intent.includes(q) || cat.includes(q);
      });
    }

    return result;
  }, [bookings, dateRange, filters, searchQuery]);

  const displayedBookings = useMemo(
    () => filteredBookings.slice(0, visibleCount),
    [filteredBookings, visibleCount]
  );

  const hasMore = filteredBookings.length > displayedBookings.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + LOAD_MORE_COUNT);
  };

  const handleRefresh = () => {
    setError(null);
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const uniquePaymentMethods = useMemo(() => {
    const s = new Set();
    bookings.forEach((b) => {
      if (b.paymentMethod) s.add(String(b.paymentMethod).toLowerCase());
    });
    return Array.from(s).sort();
  }, [bookings]);

  const uniquePlatforms = useMemo(() => {
    const s = new Set();
    bookings.forEach((b) => {
      if (b.platform) s.add(String(b.platform).toLowerCase());
    });
    return Array.from(s).sort();
  }, [bookings]);

  return (
    <div className="bookings-page">
      <div className="bookings-header">
        <div className="bookings-title">
          <Calendar size={28} className="bookings-icon" />
          <div>
            <h1>Bookings</h1>
            <p>View and manage all bookings with powerful filters</p>
          </div>
        </div>
      </div>

      <div className="bookings-filters-card">
        <div className="bookings-filters-top">
          <div className="bookings-search">
            <Search size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by booking id, payment intent, category…"
            />
          </div>

          <div className="bookings-actions">
            <button type="button" className="bookings-action-btn" onClick={handleRefresh}>
              <RefreshCcw size={16} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="bookings-filters-grid">
          <div className="bookings-filter">
            <label>
              <Filter size={14} /> Status
            </label>
            <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="declined">Declined</option>
            </select>
          </div>

          <div className="bookings-filter">
            <label>
              <SlidersHorizontal size={14} /> Payment Status
            </label>
            <select
              value={filters.paymentStatus}
              onChange={(e) => updateFilter('paymentStatus', e.target.value)}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="bookings-filter">
            <label>Payment Method</label>
            <select
              value={filters.paymentMethod}
              onChange={(e) => updateFilter('paymentMethod', e.target.value)}
            >
              <option value="all">All</option>
              {uniquePaymentMethods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="bookings-filter">
            <label>Platform</label>
            <select value={filters.platform} onChange={(e) => updateFilter('platform', e.target.value)}>
              <option value="all">All</option>
              {uniquePlatforms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="bookings-filter">
            <label>Refund</label>
            <select value={filters.refund} onChange={(e) => updateFilter('refund', e.target.value)}>
              <option value="all">All</option>
              <option value="refunded">Refunded</option>
              <option value="not_refunded">Not refunded</option>
            </select>
          </div>

          <div className="bookings-filter">
            <label>Payout</label>
            <select value={filters.payout} onChange={(e) => updateFilter('payout', e.target.value)}>
              <option value="all">All</option>
              <option value="paidout">Paid out</option>
              <option value="not_paidout">Not paid out</option>
            </select>
          </div>

          <div className="bookings-filter">
            <label>Created Date</label>
            <select
              value={filters.dateFilter}
              onChange={(e) => updateFilter('dateFilter', e.target.value)}
            >
              <option value="all">All</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last 7 Days</option>
              <option value="range">Custom Range</option>
            </select>
          </div>

          {filters.dateFilter === 'range' && (
            <div className="bookings-filter bookings-filter--range">
              <label>Range</label>
              <div className="bookings-date-range">
                <input
                  type="date"
                  value={filters.customStart}
                  onChange={(e) => updateFilter('customStart', e.target.value)}
                />
                <span className="bookings-date-sep">to</span>
                <input
                  type="date"
                  value={filters.customEnd}
                  onChange={(e) => updateFilter('customEnd', e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="bookings-filter">
            <label>Min Amount</label>
            <input
              type="number"
              value={filters.minAmount}
              onChange={(e) => updateFilter('minAmount', e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="bookings-filter">
            <label>Max Amount</label>
            <input
              type="number"
              value={filters.maxAmount}
              onChange={(e) => updateFilter('maxAmount', e.target.value)}
              placeholder="1000"
            />
          </div>

          <div className="bookings-filter">
            <label>Provider</label>
            <input
              type="text"
              value={filters.providerQuery}
              onChange={(e) => updateFilter('providerQuery', e.target.value)}
              placeholder="Provider name or uid"
            />
          </div>

          <div className="bookings-filter">
            <label>Customer</label>
            <input
              type="text"
              value={filters.customerQuery}
              onChange={(e) => updateFilter('customerQuery', e.target.value)}
              placeholder="Customer name, email or uid"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bookings-error">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button type="button" onClick={handleRefresh} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      <div className="bookings-results-summary">
        <span>
          Showing {displayedBookings.length} of {filteredBookings.length} bookings
        </span>
        {loading && <span className="loading-text">Updating...</span>}
      </div>

      <div className="bookings-table-container">
        {loading && bookings.length === 0 ? (
          <div className="users-table-skeleton">
            <div className="table-row-skeleton" />
            <div className="table-row-skeleton" />
            <div className="table-row-skeleton" />
            <div className="table-row-skeleton" />
            <div className="table-row-skeleton" />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="users-empty">
            <Calendar size={48} className="empty-icon" />
            <h3>No bookings found</h3>
            <p>Try adjusting your filters or search query</p>
          </div>
        ) : (
          <table className="bookings-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Customer</th>
                <th>Booking</th>
                <th>Amount</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedBookings.map((b) => (
                <tr
                  key={b.bookingId}
                  className="bookings-row"
                  onClick={() => onBookingClick && onBookingClick(b)}
                >
                  <td>
                    <div className="bookings-cell-main">
                      <div className="bookings-strong">{b.serviceProviderName || '-'}</div>
                      <div className="bookings-sub monospace">{maskUid(b.serviceProviderUid)}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`booking-badge ${statusBadgeClass(b.status)}`}>{b.status || '-'}</span>
                  </td>
                  <td>
                    <div className="bookings-cell-main">
                      <span className={`booking-badge ${statusBadgeClass(b.paymentStatus)}`}>{b.paymentStatus || '-'}</span>
                      <div className="bookings-sub">{b.paymentMethod || '-'}</div>
                    </div>
                  </td>
                  <td>
                    <div className="bookings-cell-main">
                      <div className="bookings-strong">{b.customerName || '-'}</div>
                      <div className="bookings-sub monospace">{maskUid(b.customerUid)}</div>
                    </div>
                  </td>
                  <td>
                    <div className="bookings-cell-main">
                      <div className="bookings-id monospace">{b.bookingId}</div>
                      <div className="bookings-sub">{b.categoryName || '-'} · {b.platform || '-'}</div>
                    </div>
                  </td>
                  <td>
                    <div className="bookings-strong">{formatMoney(b.totalAmount, b.currency || 'USD')}</div>
                  </td>
                  <td>{formatDateTime(b.createdAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="bookings-view-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBookingClick && onBookingClick(b);
                      }}
                    >
                      View <ArrowRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {hasMore && (
        <div className="load-more-container">
          <button type="button" onClick={handleLoadMore} className="load-more-btn" disabled={loading}>
            Load More ({Math.min(LOAD_MORE_COUNT, filteredBookings.length - displayedBookings.length)} more)
          </button>
        </div>
      )}
    </div>
  );
}
