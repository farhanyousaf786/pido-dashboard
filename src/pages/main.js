import React, { useState } from 'react';
import Header from '../components/header/Header';
import Footer from '../components/footer/Footer';
import Sidebar from '../components/sidebar/Sidebar';
import DashboardPage from './dashboard/Dashboard';
import UsersPage from './users/Users';
import UserDetailPage from './users/components/UserDetail.jsx';
import BookingsPage from './bookings/Bookings.jsx';
import BookingDetailPage from './bookings/BookingDetail.jsx';
import VerificationsPage from './verifications/Verifications';
import NotificationsPage from './notifications/Notifications';
import ReferralPage from './referral/Referral';
import SettingsPage from './settings/Settings';
import { useAuth } from '../core/auth/AuthContext';
import Login from './auth/Login';

const PAGES = {
  dashboard: 'dashboard',
  users: 'users',
  userDetail: 'userDetail',
  bookings: 'bookings',
  bookingDetail: 'bookingDetail',
  verifications: 'verifications',
  notifications: 'notifications',
  referral: 'referral',
  settings: 'settings',
  adminSettings: 'adminSettings',
};

function Main() {
  const { user, loading } = useAuth();
  const [activePage, setActivePage] = useState(PAGES.dashboard);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [usersInitialFilters, setUsersInitialFilters] = useState(null);

  const handleNavigate = (pageKey, user = null) => {
    if (pageKey === PAGES.userDetail && user) {
      setSelectedUser(user);
    }
    if (pageKey === PAGES.bookingDetail && user) {
      setSelectedBooking(user);
    }
    if (pageKey === PAGES.users) {
      setUsersInitialFilters(null);
    }
    setActivePage(pageKey);
    setSidebarOpen(false);
  };

  const handleNavigateToUsersWithFilters = (filters) => {
    setUsersInitialFilters(filters || {});
    setActivePage(PAGES.users);
    setSidebarOpen(false);
  };

  const renderPage = () => {
    switch (activePage) {
      case PAGES.users:
        return (
          <UsersPage
            onUserClick={(user) => handleNavigate(PAGES.userDetail, user)}
            initialFilters={usersInitialFilters}
          />
        );
      case PAGES.userDetail:
        return <UserDetailPage user={selectedUser} onBack={() => handleNavigate(PAGES.users)} />;
      case PAGES.bookings:
        return (
          <BookingsPage
            onBookingClick={(booking) => handleNavigate(PAGES.bookingDetail, booking)}
          />
        );
      case PAGES.bookingDetail:
        return (
          <BookingDetailPage
            bookingId={selectedBooking?.bookingId}
            onBack={() => handleNavigate(PAGES.bookings)}
          />
        );
      case PAGES.verifications:
        return <VerificationsPage />;
      case PAGES.notifications:
        return <NotificationsPage />;
      case PAGES.referral:
        return (
          <ReferralPage
            onOpenBooking={(booking) => handleNavigate(PAGES.bookingDetail, booking)}
          />
        );
      case PAGES.settings:
        return <SettingsPage />;
      case PAGES.adminSettings:
        return <SettingsPage />; // placeholder until dedicated admin settings page exists
      case PAGES.dashboard:
      default:
        return <DashboardPage onNavigateToUsers={handleNavigateToUsersWithFilters} />;
    }
  };

  if (loading) {
    return (
      <div className="auth-shell">
        <div className="auth-loading">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-root">
        <main className="app-content">
          <Login />
        </main>
      </div>
    );
  }

  return (
    <div className="app-root">
      <Header
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        onOpenAdminSettings={() => handleNavigate(PAGES.adminSettings)}
      />

      <div className="app-layout">
        <Sidebar
          activePage={activePage}
          onNavigate={handleNavigate}
          isOpen={sidebarOpen}
        />

        <main className="app-content">
          {renderPage()}
        </main>
      </div>

      <Footer />
    </div>
  );
}

export default Main;
