import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Filter,
  Clock,
  RefreshCcw,
  Search,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Trash2,
} from 'lucide-react';
import { bookingService } from '../../core/services/bookingService.js';
import StatCard from '../dashboard/components/StatCard.jsx';

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

function formatDateOnlySmall(ts) {
  if (!ts) return '-';
  const d = ts instanceof Date ? ts : ts?.toDate ? ts.toDate() : null;
  if (!d) return '-';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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

export default function Bookings({ onBookingClick, initialFilters = null }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [visibleCount, setVisibleCount] = useState(BOOKINGS_PER_PAGE);
  const [searchQuery, setSearchQuery] = useState('');

  const [filters, setFilters] = useState({
    status: 'all',
    dateFilter: 'all',
    customStart: '',
    customEnd: '',
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
    if (!initialFilters || typeof initialFilters !== 'object') return;
    setFilters((prev) => ({
      ...prev,
      ...initialFilters,
    }));
  }, [initialFilters]);

  useEffect(() => {
    setVisibleCount(BOOKINGS_PER_PAGE);
  }, [searchQuery, filters]);

  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'pending_accepted') {
        result = result.filter((b) => {
          const s = String(b.status || '').toLowerCase();
          return s === 'pending' || s === 'accepted';
        });
      } else {
        result = result.filter((b) => String(b.status || '').toLowerCase() === filters.status);
      }
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

  const handleDeleteBooking = async (booking, e) => {
    e.stopPropagation();
    const id = booking?.bookingId;
    if (!id || deletingId) return;
    if (!window.confirm(`Delete this booking? This cannot be undone.`)) return;
    setDeletingId(id);
    setError(null);
    try {
      await bookingService.deleteBooking(id);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to delete booking.');
    } finally {
      setDeletingId(null);
    }
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const bookingStats = useMemo(() => {
    const total = filteredBookings.length;
    const pending = filteredBookings.filter((b) => String(b.status || '').toLowerCase() === 'pending').length;
    const accepted = filteredBookings.filter((b) => String(b.status || '').toLowerCase() === 'accepted').length;
    const active = filteredBookings.filter((b) => String(b.status || '').toLowerCase() === 'active').length;
    const completed = filteredBookings.filter((b) => String(b.status || '').toLowerCase() === 'completed').length;
    const cancelled = filteredBookings.filter((b) => String(b.status || '').toLowerCase() === 'cancelled').length;
    return {
      total,
      pending,
      accepted,
      active,
      activeBookings: pending + accepted + active,
      completed,
      cancelled,
    };
  }, [filteredBookings]);

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
              <option value="pending_accepted">Pending + accepted (in progress)</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="declined">Declined</option>
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
        </div>
      </div>

      <div className="bookings-stats-grid">
        <StatCard
          title="Total Bookings"
          value={bookingStats.total}
          subtitle={filters.dateFilter === 'all' ? 'All time bookings' : 'Filtered bookings'}
          icon={Calendar}
          color="blue"
        />
        <StatCard
          title="Active Bookings"
          value={bookingStats.activeBookings}
          subtitle={`${bookingStats.pending} pending · ${bookingStats.accepted} accepted · ${bookingStats.active} active`}
          icon={Clock}
          color="orange"
        />
        <StatCard
          title="Completed"
          value={bookingStats.completed}
          subtitle="Successfully finished"
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Cancelled"
          value={bookingStats.cancelled}
          subtitle="Cancelled bookings"
          icon={XCircle}
          color="red"
        />
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
                      <div className="bookings-strong">{b.customerName || '-'}</div>
                      <div className="bookings-sub monospace">{maskUid(b.customerUid)}</div>
                    </div>
                  </td>
                  <td>
                    <div className="bookings-sub bookings-booking-name">
                      {b.categoryName || '-'} · {b.platform || '-'}
                    </div>
                  </td>
                  <td>
                    <div className="bookings-strong">{formatMoney(b.totalAmount, b.currency || 'USD')}</div>
                  </td>
                  <td>
                    <span className="bookings-created-date">{formatDateOnlySmall(b.createdAt)}</span>
                  </td>
                  <td>
                    <div className="bookings-row-actions">
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
                      <button
                        type="button"
                        className="bookings-delete-btn"
                        disabled={deletingId === b.bookingId}
                        onClick={(e) => handleDeleteBooking(b, e)}
                        aria-label="Delete booking"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
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
