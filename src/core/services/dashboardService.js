// Dashboard service - fetches stats from Firestore
import { db } from '../firebase/firebaseConfig.js';
import { userFromFirestore } from '../models/User.js';
import { bookingFromFirestore, BookingHelpers } from '../models/Booking.js';
import {
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { verificationService } from './verificationService.js';

// Collection references
const usersRef = collection(db, 'users');
const bookingsRef = collection(db, 'bookings');
const adminUsersRef = collection(db, 'adminUsers');

function applyCreatedAtRange(q, dateRange) {
  if (!dateRange?.start && !dateRange?.end) return q;

  let next = q;
  if (dateRange?.start) {
    const startTs = dateRange.start instanceof Timestamp ? dateRange.start : Timestamp.fromDate(dateRange.start);
    next = query(next, where('createdAt', '>=', startTs));
  }
  if (dateRange?.end) {
    const endTs = dateRange.end instanceof Timestamp ? dateRange.end : Timestamp.fromDate(dateRange.end);
    next = query(next, where('createdAt', '<', endTs));
  }
  return next;
}

function bookingInvolvesTestUser(booking, testUidSet) {
  const c = booking.customerUid || '';
  const p = booking.serviceProviderUid || '';
  if (c && testUidSet.has(c)) return true;
  if (p && testUidSet.has(p)) return true;
  return false;
}

export async function fetchTestUserUidSet() {
  const q = query(usersRef, where('isTestUser', '==', true));
  const snap = await getDocs(q);
  return new Set(snap.docs.map((d) => d.id));
}

function aggregateBookingStatsFromList(list) {
  let activeBookings = 0;
  let pendingBookings = 0;
  let completedBookings = 0;
  let cancelledBookings = 0;
  let totalRevenue = 0;
  let appRevenue = 0;
  let providerPayout = 0;

  for (const booking of list) {
    const s = (booking.status || '').toString().toLowerCase();
    if (s === 'pending' || s === 'accepted') activeBookings += 1;
    if (s === 'pending') pendingBookings += 1;
    if (s === 'completed') completedBookings += 1;
    if (s === 'cancelled') cancelledBookings += 1;
    const pay = (booking.paymentStatus || '').toString().toLowerCase();
    if (s === 'completed' && pay === 'completed') {
      totalRevenue += BookingHelpers.getOverallRevenue(booking);
      appRevenue += BookingHelpers.getAppRevenue(booking);
      providerPayout += BookingHelpers.getProviderPayout(booking);
    }
  }

  return {
    totalBookings: list.length,
    activeBookings,
    pendingBookings,
    completedBookings,
    cancelledBookings,
    totalRevenue,
    appRevenue,
    providerPayout,
  };
}

// Get user stats
export async function getUserStats(options = {}) {
  const { excludeTestUsers = false } = options;
  try {
    // Total users count
    const totalSnapshot = await getCountFromServer(usersRef);
    const totalUsers = totalSnapshot.data().count;

    // Service providers — same basis as Verifications → Providers total (deduped queue + linked user)
    let totalProviders = 0;
    try {
      const verificationRequestsList = await verificationService.fetchVerificationRequestsList();
      totalProviders = await verificationService.countLinkedDedupedProviders(verificationRequestsList, {
        excludeTestUsers,
      });
    } catch (e) {
      console.error('Dashboard provider verification count:', e);
      totalProviders = 0;
    }

    // Customers
    const customersQuery = query(usersRef, where('userType', '==', 'customer'));
    const customersSnapshot = await getCountFromServer(customersQuery);
    const totalCustomers = customersSnapshot.data().count;

    // Online users (users with isOnline = true)
    const onlineQuery = query(
      usersRef,
      where('isOnline', '==', true)
    );
    const onlineSnapshot = await getCountFromServer(onlineQuery);
    const onlineUsers = onlineSnapshot.data().count;

    // Pending verification users
    const pendingQuery = query(
      usersRef,
      where('accountStatus', '==', 'pending_approval')
    );
    const pendingSnapshot = await getCountFromServer(pendingQuery);
    const pendingVerifications = pendingSnapshot.data().count;

    if (!excludeTestUsers) {
      return {
        totalUsers,
        totalProviders,
        totalCustomers,
        onlineUsers,
        offlineUsers: totalUsers - onlineUsers,
        pendingVerifications,
      };
    }

    const testSnap = await getDocs(query(usersRef, where('isTestUser', '==', true)));
    const testUsers = testSnap.docs.map((d) => userFromFirestore(d));
    const testUserCount = testUsers.length;
    const testCustomerCount = testUsers.filter((u) => u.userType === 'customer').length;
    const testOnlineCount = testUsers.filter((u) => u.isOnline === true).length;
    const testPendingCount = testUsers.filter(
      (u) => (u.accountStatus || '').toString() === 'pending_approval'
    ).length;

    const totalUsersAdj = Math.max(0, totalUsers - testUserCount);
    const onlineUsersAdj = Math.max(0, onlineUsers - testOnlineCount);

    return {
      totalUsers: totalUsersAdj,
      totalProviders,
      totalCustomers: Math.max(0, totalCustomers - testCustomerCount),
      onlineUsers: onlineUsersAdj,
      offlineUsers: Math.max(0, totalUsersAdj - onlineUsersAdj),
      pendingVerifications: Math.max(0, pendingVerifications - testPendingCount),
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return {
      totalUsers: 0,
      totalProviders: 0,
      totalCustomers: 0,
      onlineUsers: 0,
      offlineUsers: 0,
      pendingVerifications: 0,
    };
  }
}

const emptyBookingStats = {
  totalBookings: 0,
  activeBookings: 0,
  pendingBookings: 0,
  completedBookings: 0,
  cancelledBookings: 0,
  totalRevenue: 0,
  appRevenue: 0,
  providerPayout: 0,
};

// Get booking stats
export async function getBookingStats(dateRange, options = {}) {
  const { excludeTestUsers = false } = options;

  if (excludeTestUsers) {
    try {
      const testUidSet = await fetchTestUserUidSet();
      const snapshot = await getDocs(applyCreatedAtRange(bookingsRef, dateRange));
      const list = snapshot.docs
        .map((d) => bookingFromFirestore(d))
        .filter((b) => !bookingInvolvesTestUser(b, testUidSet));
      return aggregateBookingStatsFromList(list);
    } catch (error) {
      console.error('Error fetching booking stats:', error);
      return { ...emptyBookingStats };
    }
  }

  try {
    // Total bookings
    const totalSnapshot = await getCountFromServer(applyCreatedAtRange(bookingsRef, dateRange));
    const totalBookings = totalSnapshot.data().count;

    // Active bookings (pending or accepted)
    const activeQuery = applyCreatedAtRange(
      query(bookingsRef, where('status', 'in', ['pending', 'accepted'])),
      dateRange
    );
    const activeSnapshot = await getCountFromServer(activeQuery);
    const activeBookings = activeSnapshot.data().count;

    // Pending bookings specifically
    const pendingQuery = applyCreatedAtRange(query(bookingsRef, where('status', '==', 'pending')), dateRange);
    const pendingSnapshot = await getCountFromServer(pendingQuery);
    const pendingBookings = pendingSnapshot.data().count;

    // Completed bookings
    const completedQuery = applyCreatedAtRange(query(bookingsRef, where('status', '==', 'completed')), dateRange);
    const completedSnapshot = await getCountFromServer(completedQuery);
    const completedBookings = completedSnapshot.data().count;

    // Cancelled bookings
    const cancelledQuery = applyCreatedAtRange(query(bookingsRef, where('status', '==', 'cancelled')), dateRange);
    const cancelledSnapshot = await getCountFromServer(cancelledQuery);
    const cancelledBookings = cancelledSnapshot.data().count;

    // Calculate both overall and app revenue from completed bookings using Booking model
    const revenueQuery = applyCreatedAtRange(
      query(bookingsRef, where('status', '==', 'completed'), where('paymentStatus', '==', 'completed')),
      dateRange
    );
    const revenueSnapshot = await getDocs(revenueQuery);
    let totalRevenue = 0;
    let appRevenue = 0;
    let providerPayout = 0;
    const completedBookingsList = revenueSnapshot.docs.map(doc => bookingFromFirestore(doc));
    completedBookingsList.forEach((booking) => {
      totalRevenue += BookingHelpers.getOverallRevenue(booking);
      appRevenue += BookingHelpers.getAppRevenue(booking);
      providerPayout += BookingHelpers.getProviderPayout(booking);
    });

    return {
      totalBookings,
      activeBookings,
      pendingBookings,
      completedBookings,
      cancelledBookings,
      totalRevenue,
      appRevenue,
      providerPayout,
    };
  } catch (error) {
    console.error('Error fetching booking stats:', error);
    return { ...emptyBookingStats };
  }
}

// Get bookings data for charts (last 30 days) using Booking model
// revenueType: 'overall' | 'app' | 'provider'
export async function getBookingsChartData(revenueType = 'overall', dateRange, options = {}) {
  const { excludeTestUsers = false } = options;
  try {
    const now = new Date();
    const effectiveStart = dateRange?.start
      ? (dateRange.start instanceof Date ? dateRange.start : dateRange.start.toDate())
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const effectiveEnd = dateRange?.end
      ? (dateRange.end instanceof Date ? dateRange.end : dateRange.end.toDate())
      : new Date(now.getTime() + 1);

    const chartQuery = applyCreatedAtRange(bookingsRef, {
      start: effectiveStart,
      end: effectiveEnd,
    });
    const snapshot = await getDocs(chartQuery);

    // Parse all bookings using model
    let bookings = snapshot.docs.map(doc => bookingFromFirestore(doc));
    if (excludeTestUsers) {
      const testUidSet = await fetchTestUserUidSet();
      bookings = bookings.filter((b) => !bookingInvolvesTestUser(b, testUidSet));
    }

    // Group by date
    const dailyData = {};
    const startDate = new Date(effectiveStart);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(effectiveEnd);
    endDate.setHours(0, 0, 0, 0);

    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const dateStr = cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyData[dateStr] = { date: dateStr, bookings: 0, revenue: 0 };
      cursor.setDate(cursor.getDate() + 1);
    }

    bookings.forEach((booking) => {
      const createdAt = booking.createdAt;
      if (createdAt) {
        const date = createdAt instanceof Date ? createdAt : createdAt.toDate();
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (dailyData[dateStr]) {
          dailyData[dateStr].bookings += 1;
          
          // Calculate revenue based on selected type
          let revenue = 0;
          if (revenueType === 'app') {
            revenue = BookingHelpers.getAppRevenue(booking);
          } else if (revenueType === 'provider') {
            revenue = BookingHelpers.getProviderPayout(booking);
          } else {
            // overall (default)
            revenue = BookingHelpers.getOverallRevenue(booking);
          }
          dailyData[dateStr].revenue += revenue;
        }
      }
    });

    return Object.values(dailyData);
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return [];
  }
}

// Subscribe to real-time stats updates with User model parsing
export function subscribeToStats(callback) {
  const unsubscribers = [];

  // Subscribe to users with model parsing
  const usersUnsub = onSnapshot(usersRef, (snapshot) => {
    const users = snapshot.docs.map(doc => userFromFirestore(doc));
    const onlineUsers = users.filter(u => u.isOnline === true).length;
    
    callback((prev) => ({ 
      ...prev, 
      totalUsers: snapshot.size,
      onlineUsers: onlineUsers,
      offlineUsers: snapshot.size - onlineUsers,
      users: users // Full user models for detailed display
    }));
  });
  unsubscribers.push(usersUnsub);

  // Subscribe to bookings count
  const bookingsUnsub = onSnapshot(bookingsRef, (snapshot) => {
    callback((prev) => ({ ...prev, totalBookings: snapshot.size }));
  });
  unsubscribers.push(bookingsUnsub);

  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}

// Fetch users list with full User model parsing
export async function getUsersList(options = {}) {
  try {
    const { userType, isOnline, accountStatus, limit = 100 } = options;
    
    let q = query(usersRef);
    
    if (userType) {
      q = query(q, where('userType', '==', userType));
    }
    if (isOnline !== undefined) {
      q = query(q, where('isOnline', '==', isOnline));
    }
    if (accountStatus) {
      q = query(q, where('accountStatus', '==', accountStatus));
    }
    
    const snapshot = await getDocs(q);
    const users = snapshot.docs.map(doc => userFromFirestore(doc));
    
    return {
      success: true,
      data: users,
      count: users.length,
    };
  } catch (error) {
    console.error('Error fetching users list:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      count: 0,
    };
  }
}
