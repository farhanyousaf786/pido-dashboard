import React, { useState, useEffect } from 'react';
import { getUsersList } from '../../core/services/dashboardService.js';
import { userFromFirestore } from '../../core/models/User.js';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../core/firebase/firebaseConfig.js';
import { Users as UsersIcon, AlertCircle } from 'lucide-react';

// Components
import UserRow from './components/UserRow.jsx';
import UserFilters from './components/UserFilters.jsx';
import UserStats from './components/UserStats.jsx';

export default function Users({ onUserClick, initialFilters = null }) {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [displayedUsers, setDisplayedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [visibleCount, setVisibleCount] = useState(20);

  const USERS_PER_PAGE = 20;
  const LOAD_MORE_COUNT = 20;

  useEffect(() => {
    if (!initialFilters) return;
    setFilters(initialFilters);
    setSearchQuery('');
    setVisibleCount(20);
  }, [initialFilters]);

  // Subscribe to real-time users updates
  useEffect(() => {
    setLoading(true);
    
    // Subscribe to all users (no filter - matches dashboard count)
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const usersList = snapshot.docs.map(doc => userFromFirestore(doc));
        // Sort by createdAt locally (puts users without createdAt at end)
        usersList.sort((a, b) => {
          if (!a.createdAt && !b.createdAt) return 0;
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return b.createdAt - a.createdAt;
        });
        setUsers(usersList);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching users:', err);
        setError('Failed to load users. Please try again.');
        setLoading(false);
      }
    );

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Apply filters and search
  useEffect(() => {
    let result = [...users];

    // Apply filters
    if (filters.userType) {
      result = result.filter(u => u.userType === filters.userType);
    }
    if (filters.isOnline !== undefined) {
      result = result.filter(u => u.isOnline === filters.isOnline);
    }
    if (filters.accountStatus) {
      result = result.filter(u => u.accountStatus === filters.accountStatus);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u => 
        (u.email && u.email.toLowerCase().includes(query)) ||
        (u.phoneNumber && u.phoneNumber.includes(query)) ||
        (u.uid && u.uid.toLowerCase().includes(query))
      );
    }

    setFilteredUsers(result);
    setDisplayedUsers(result.slice(0, visibleCount));
  }, [users, filters, searchQuery, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + LOAD_MORE_COUNT);
  };

  const hasMoreUsers = filteredUsers.length > displayedUsers.length;

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await getUsersList(filters);
      if (response.success) {
        setUsers(response.data);
        setError(null);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError('Failed to refresh users');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="users-page">
      {/* Header */}
      <div className="users-header">
        <div className="users-title-section">
          <UsersIcon size={28} className="users-icon" />
          <div>
            <h1>Users Management</h1>
            <p>Manage and view all platform users in real-time</p>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <UserStats users={users} loading={loading} />

      {/* Filters */}
      <UserFilters
        filters={filters}
        onFilterChange={setFilters}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        onRefresh={handleRefresh}
        loading={loading}
      />

      {/* Error State */}
      {error && (
        <div className="users-error">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={handleRefresh} className="retry-btn">Retry</button>
        </div>
      )}

      {/* Results Summary */}
      <div className="users-results-summary">
        <span>Showing {displayedUsers.length} of {filteredUsers.length} users</span>
        {loading && <span className="loading-text">Updating...</span>}
      </div>

      {/* Users Table */}
      <div className="users-table-container">
        {loading && users.length === 0 ? (
          <div className="users-table-skeleton">
            <div className="table-row-skeleton" />
            <div className="table-row-skeleton" />
            <div className="table-row-skeleton" />
            <div className="table-row-skeleton" />
            <div className="table-row-skeleton" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="users-empty">
            <UsersIcon size={48} className="empty-icon" />
            <h3>No users found</h3>
            <p>Try adjusting your filters or search query</p>
          </div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Type</th>
                <th>Status</th>
                <th>Online</th>
                <th>Contact</th>
                <th>Verification</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedUsers.map((user) => (
                <UserRow key={user.uid} user={user} onClick={() => onUserClick && onUserClick(user)} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Load More Button */}
      {hasMoreUsers && (
        <div className="load-more-container">
          <button 
            onClick={handleLoadMore} 
            className="load-more-btn"
            disabled={loading}
          >
            Load More ({Math.min(LOAD_MORE_COUNT, filteredUsers.length - displayedUsers.length)} more)
          </button>
        </div>
      )}
    </div>
  );
}
