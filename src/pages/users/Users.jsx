import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getUsersList } from '../../core/services/dashboardService.js';
import { userFromFirestore, UserHelpers } from '../../core/models/User.js';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../core/firebase/firebaseConfig.js';
import { Users as UsersIcon, AlertCircle } from 'lucide-react';
import { fetchProfileUserinfo } from '../../core/services/userProfileMerge.js';
import { verificationService } from '../../core/services/verificationService.js';

// Components
import UserRow from './components/UserRow.jsx';
import UserFilters from './components/UserFilters.jsx';
import UserStats from './components/UserStats.jsx';
import { useAuth } from '../../core/auth/AuthContext';

export default function Users({ onUserClick, initialFilters = null }) {
  const { adminTestMode } = useAuth();
  const excludeTestUsers = !adminTestMode;
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [displayedUsers, setDisplayedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [visibleCount, setVisibleCount] = useState(20);
  const [profileByUid, setProfileByUid] = useState({});
  const profileCacheRef = useRef({});
  const [providerVerificationTotal, setProviderVerificationTotal] = useState(null);
  const [providerVerificationLoading, setProviderVerificationLoading] = useState(true);

  const USERS_PER_PAGE = 20;
  const LOAD_MORE_COUNT = 20;

  const usersWithProfile = useMemo(
    () =>
      users.map((u) => ({
        ...u,
        ...(profileByUid[u.uid] || {}),
        uid: u.uid,
      })),
    [users, profileByUid]
  );

  useEffect(() => {
    let cancelled = false;
    setProviderVerificationLoading(true);
    (async () => {
      try {
        const list = await verificationService.fetchVerificationRequestsList();
        const n = await verificationService.countLinkedDedupedProviders(list, {
          excludeTestUsers,
        });
        if (!cancelled) setProviderVerificationTotal(n);
      } catch (e) {
        console.error('Users page provider verification count:', e);
        if (!cancelled) setProviderVerificationTotal(null);
      } finally {
        if (!cancelled) setProviderVerificationLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [excludeTestUsers]);

  const usersForStats = useMemo(() => {
    if (!excludeTestUsers) return users;
    return users.filter((u) => u.isTestUser !== true);
  }, [users, excludeTestUsers]);

  useEffect(() => {
    let cancelled = false;
    const uidList = users.map((u) => u.uid).filter(Boolean);
    const cache = profileCacheRef.current;

    for (const uid of Object.keys(cache)) {
      if (!uidList.includes(uid)) delete cache[uid];
    }

    const missing = uidList.filter((uid) => !(uid in cache));
    if (missing.length === 0) {
      setProfileByUid({ ...cache });
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      for (let i = 0; i < missing.length; i += 20) {
        const chunk = missing.slice(i, i + 20);
        const rows = await Promise.all(chunk.map((uid) => fetchProfileUserinfo(uid)));
        if (cancelled) return;
        chunk.forEach((uid, j) => {
          cache[uid] = rows[j] || {};
        });
      }
      if (!cancelled) setProfileByUid({ ...cache });
    })();

    return () => {
      cancelled = true;
    };
  }, [users]);

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
    let result = [...usersWithProfile];

    if (excludeTestUsers) {
      if (filters.isTestUser === true) {
        result = result.filter((u) => u.isTestUser === true);
      } else {
        result = result.filter((u) => u.isTestUser !== true);
      }
    } else {
      if (filters.isTestUser === true) {
        result = result.filter((u) => u.isTestUser === true);
      }
      if (filters.isTestUser === false) {
        result = result.filter((u) => u.isTestUser !== true);
      }
    }

    if (filters.userType) {
      result = result.filter(u => u.userType === filters.userType);
    }
    if (filters.isOnline !== undefined) {
      result = result.filter(u => u.isOnline === filters.isOnline);
    }
    if (filters.accountStatus === 'unverified') {
      result = result.filter((u) => {
        const s = u.accountStatus;
        return s !== 'approved' && s !== 'pending_approval' && s !== 'rejected';
      });
    } else if (filters.accountStatus) {
      result = result.filter((u) => u.accountStatus === filters.accountStatus);
    }

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((u) => {
        const name = UserHelpers.personName(u).toLowerCase();
        return (
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.phoneNumber && u.phoneNumber.toLowerCase().includes(q)) ||
          (u.uid && u.uid.toLowerCase().includes(q)) ||
          (name && name.includes(q)) ||
          (u.fullName && String(u.fullName).toLowerCase().includes(q))
        );
      });
    }

    setFilteredUsers(result);
    setDisplayedUsers(result.slice(0, visibleCount));
  }, [usersWithProfile, filters, searchQuery, visibleCount, excludeTestUsers]);

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
      <UserStats
        users={usersForStats}
        loading={loading}
        providerVerificationTotal={providerVerificationTotal}
        providerVerificationLoading={providerVerificationLoading}
      />

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
