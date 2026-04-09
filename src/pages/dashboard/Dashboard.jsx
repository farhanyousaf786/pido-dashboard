import React, { useState, useEffect } from 'react';
import {
  getUserStats,
  getBookingStats,
  getBookingsChartData,
} from '../../core/services/dashboardService.js';
import {
  Users,
  UserCheck,
  UserX,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  TrendingUp,
  Briefcase,
  User,
  Shield,
  Wallet,
  HandCoins,
} from 'lucide-react';

// Dashboard components
import StatCard from './components/StatCard.jsx';
import SkeletonCard from './components/SkeletonCard.jsx';
import BookingsChart from './components/BookingsChart.jsx';
import RevenueChart from './components/RevenueChart.jsx';
import ErrorState from './components/ErrorState.jsx';
import InfoBox from './components/InfoBox.jsx';

export default function Dashboard({ onNavigateToUsers }) {
  const [userStats, setUserStats] = useState(null);
  const [bookingStats, setBookingStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revenueType, setRevenueType] = useState('app'); // 'overall' | 'app' | 'provider'

  const [dateFilter, setDateFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const getDateRange = () => {
    const now = new Date();
    const startOfDay = (d) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    };
    const addDays = (d, days) => {
      const x = new Date(d);
      x.setDate(x.getDate() + days);
      return x;
    };

    if (dateFilter === 'all') return null;

    if (dateFilter === 'today') {
      const start = startOfDay(now);
      const end = addDays(start, 1);
      return { start, end };
    }

    if (dateFilter === 'yesterday') {
      const end = startOfDay(now);
      const start = addDays(end, -1);
      return { start, end };
    }

    if (dateFilter === 'week') {
      const end = addDays(startOfDay(now), 1);
      const start = addDays(end, -7);
      return { start, end };
    }

    if (dateFilter === 'range') {
      if (!customStart || !customEnd) return null;
      const start = startOfDay(new Date(`${customStart}T00:00:00`));
      const endInclusive = startOfDay(new Date(`${customEnd}T00:00:00`));
      const end = addDays(endInclusive, 1);
      return { start, end };
    }

    return null;
  };

  const dateRange = getDateRange();

  const getDateLabel = () => {
    if (dateFilter === 'all') return 'All';
    if (dateFilter === 'today') return 'Today';
    if (dateFilter === 'yesterday') return 'Yesterday';
    if (dateFilter === 'week') return 'Last 7 Days';
    if (dateFilter === 'range') {
      if (customStart && customEnd) return `${customStart} to ${customEnd}`;
      return 'Custom Range';
    }
    return 'All';
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [users, bookings, chart] = await Promise.all([
          getUserStats(),
          getBookingStats(dateRange),
          getBookingsChartData(revenueType, dateRange),
        ]);
        setUserStats(users);
        setBookingStats(bookings);
        setChartData(chart);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [revenueType, dateFilter, customStart, customEnd]);

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Dashboard Overview</h1>
        <p>Real-time insights into your platform performance</p>
      </div>

      {/* User Stats Section */}
      <div className="dashboard-section">
        <h2 className="section-title">
          <Users size={20} />
          User Statistics
        </h2>
        <div className="stats-grid">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <StatCard
                title="Total Users"
                value={userStats?.totalUsers || 0}
                subtitle="Pido users"
                icon={Users}
                color="blue"
                onClick={() => onNavigateToUsers && onNavigateToUsers({})}
              />
              <StatCard
                title="Service Providers"
                value={userStats?.totalProviders || 0}
                subtitle="Verification queue (deduped, linked accounts)"
                icon={Briefcase}
                color="orange"
                onClick={() => onNavigateToUsers && onNavigateToUsers({ userType: 'serviceProvider' })}
              />
              <StatCard
                title="Customers"
                value={userStats?.totalCustomers || 0}
                subtitle="Registered clients"
                icon={User}
                color="purple"
                onClick={() => onNavigateToUsers && onNavigateToUsers({ userType: 'customer' })}
              />
              <StatCard
                title="Online Now"
                value={userStats?.onlineUsers || 0}
                subtitle="Active in last 5 minutes"
                icon={UserCheck}
                color="green"
                onClick={() => onNavigateToUsers && onNavigateToUsers({ isOnline: true })}
              />
              <StatCard
                title="Offline Users"
                value={userStats?.offlineUsers || 0}
                subtitle="Not currently active"
                icon={UserX}
                color="gray"
                onClick={() => onNavigateToUsers && onNavigateToUsers({ isOnline: false })}
              />
              
              <StatCard
                title="Pending Verifications"
                value={userStats?.pendingVerifications || 0}
                subtitle="Awaiting approval"
                icon={Shield}
                color="red"
                onClick={() => onNavigateToUsers && onNavigateToUsers({ accountStatus: 'pending_approval' })}
              />
            </>
          )}
        </div>
      </div>

      {/* Charts Section - Trends */}
      <div className="dashboard-section">
        <div className="section-header-with-filter">
          <h2 className="section-title">
            <TrendingUp size={20} />
            Trends ({dateFilter === 'all' ? 'Last 30 Days' : getDateLabel()})
          </h2>
          <div className="dashboard-filters">
            <div className="date-filter">
              <label>Date:</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="revenue-select"
              >
                <option value="all">All</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">Last 7 Days</option>
                <option value="range">Custom Range</option>
              </select>
            </div>

            {dateFilter === 'range' && (
              <div className="date-range">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="date-input"
                />
                <span className="date-sep">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="date-input"
                />
              </div>
            )}

            <div className="revenue-filter">
              <label>Revenue View:</label>
              <select
                value={revenueType}
                onChange={(e) => setRevenueType(e.target.value)}
                className="revenue-select"
              >
                <option value="app">App Revenue (15%)</option>
                <option value="overall">Total Revenue</option>
                <option value="provider">Provider Payout</option>
              </select>
            </div>
          </div>
        </div>
        <div className="charts-grid">
          <BookingsChart data={chartData} loading={loading} />
          <RevenueChart 
            data={chartData} 
            loading={loading} 
            title={revenueType === 'app' ? 'Daily App Revenue' : revenueType === 'provider' ? 'Daily Provider Payout' : 'Daily Total Revenue'}
          />
        </div>
      </div>

      {/* Booking Stats Section */}
      <div className="dashboard-section">
        <h2 className="section-title">
          <Calendar size={20} />
          Booking Statistics ({getDateLabel()})
        </h2>
        <div className="stats-grid">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <StatCard
                title="Total Bookings"
                value={bookingStats?.totalBookings || 0}
                subtitle={dateFilter === 'all' ? 'All time bookings' : 'Filtered bookings'}
                icon={Calendar}
                color="blue"
              />
              <StatCard
                title="Active Bookings"
                value={bookingStats?.activeBookings || 0}
                subtitle={`${bookingStats?.pendingBookings || 0} pending · ${(bookingStats?.activeBookings || 0) - (bookingStats?.pendingBookings || 0)} accepted`}
                icon={Clock}
                color="orange"
              />
              <StatCard
                title="Completed"
                value={bookingStats?.completedBookings || 0}
                subtitle="Successfully finished"
                icon={CheckCircle}
                color="green"
              />
              <StatCard
                title="Cancelled"
                value={bookingStats?.cancelledBookings || 0}
                subtitle="Cancelled bookings"
                icon={XCircle}
                color="red"
              />
              <StatCard
                title="App Revenue"
                value={`$${(bookingStats?.appRevenue || 0).toFixed(2)}`}
                subtitle="Pido app commission (15%)"
                icon={Wallet}
                color="orange"
              />
              <StatCard
                title="Total Revenue"
                value={`$${(bookingStats?.totalRevenue || 0).toFixed(2)}`}
                subtitle="Overall booking amounts"
                icon={DollarSign}
                color="green"
              />
              <StatCard
                title="Provider Payout"
                value={`$${(bookingStats?.providerPayout || 0).toFixed(2)}`}
                subtitle="Paid to service providers"
                icon={HandCoins}
                color="blue"
              />
            </>
          )}
        </div>
      </div>

      <InfoBox />
    </div>
  );
}
