import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  where,
  limit,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig.js';
import { dedupeVerificationRequests } from './verificationRequestDedupe.js';

export const verificationService = {
  resolveUserIdFromRequestData: async (data, requestId) => {
    const directUserId =
      data?.userId ||
      data?.uid ||
      data?.userUid ||
      data?.customerUid ||
      data?.providerUid;

    if (directUserId) return directUserId;

    const phoneNumber = (data?.phoneNumber ?? '').toString().trim();
    if (phoneNumber) {
      const q = query(collection(db, 'users'), where('phoneNumber', '==', phoneNumber), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) return snap.docs[0].id;
    }

    const email = (data?.email ?? '').toString().trim();
    if (email) {
      const q = query(collection(db, 'users'), where('email', '==', email), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) return snap.docs[0].id;
    }

    return requestId || null;
  },

  subscribeToVerificationRequestDoc: (requestId, callback) => {
    if (!requestId) {
      callback(null);
      return () => {};
    }

    const requestRef = doc(db, 'verificationRequests', requestId);
    return onSnapshot(
      requestRef,
      (snap) => {
        callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      },
      (error) => {
        console.error('Error subscribing to verification request:', error);
        callback(null);
      }
    );
  },

  updateUserAccountStatus: async (userId, accountStatus) => {
    if (!userId) return { success: false, error: 'Missing userId' };
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        accountStatus: accountStatus,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating user account status:', error);
      return { success: false, error: error.message };
    }
  },

  getUserAccountStatus: async (userId) => {
    if (!userId) return { success: false, error: 'Missing userId', accountStatus: null };
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        return { success: false, error: 'User not found', accountStatus: null };
      }
      return { success: true, accountStatus: userSnap.data()?.accountStatus ?? null };
    } catch (error) {
      console.error('Error reading user account status:', error);
      return { success: false, error: error.message, accountStatus: null };
    }
  },

  subscribeToUserDoc: (userId, callback) => {
    if (!userId) {
      callback(null);
      return () => {};
    }

    const userRef = doc(db, 'users', userId);
    return onSnapshot(
      userRef,
      (snap) => {
        callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      },
      (error) => {
        console.error('Error subscribing to user doc:', error);
        callback(null);
      }
    );
  },

  // Subscribe to all verification requests (real-time)
  subscribeToVerificationRequests: (callback) => {
    const q = query(
      collection(db, 'verificationRequests'),
      orderBy('submittedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const requests = [];
      snapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() });
      });
      callback(requests);
    }, (error) => {
      console.error('Error fetching verification requests:', error);
      callback([]);
    });
  },

  // Get single verification request
  getVerificationRequest: async (requestId) => {
    try {
      const docRef = doc(db, 'verificationRequests', requestId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          success: true,
          data: { id: docSnap.id, ...docSnap.data() },
        };
      } else {
        return {
          success: false,
          error: 'Verification request not found',
        };
      }
    } catch (error) {
      console.error('Error fetching request:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Approve provider/customer
  approveRequest: async (requestId, adminNotes = '', userIdOverride = null) => {
    try {
      const requestRef = doc(db, 'verificationRequests', requestId);
      await updateDoc(requestRef, {
        status: 'approved',
        adminNotes: adminNotes,
        approvedAt: serverTimestamp(),
        rejectedAt: null,
        rejectionReason: null,
        updatedAt: serverTimestamp(),
      });

      // Also update the user's account status
      const requestDoc = await getDoc(requestRef);
      if (requestDoc.exists()) {
        const data = requestDoc.data();
        const userId =
          userIdOverride ||
          (await verificationService.resolveUserIdFromRequestData(data, requestId));

        const userResult = await verificationService.updateUserAccountStatus(userId, 'approved');
        return {
          success: true,
          userId,
          userUpdateSuccess: userResult.success,
          userUpdateError: userResult.success ? null : userResult.error,
        };
      }

      return { success: true, userId: null, userUpdateSuccess: false, userUpdateError: 'Request not found' };
    } catch (error) {
      console.error('Error approving request:', error);
      return { success: false, error: error.message };
    }
  },

  // Reject provider/customer
  rejectRequest: async (requestId, rejectionReason, adminNotes = '', userIdOverride = null) => {
    try {
      const requestRef = doc(db, 'verificationRequests', requestId);
      await updateDoc(requestRef, {
        status: 'rejected',
        rejectionReason: rejectionReason,
        adminNotes: adminNotes,
        rejectedAt: serverTimestamp(),
        approvedAt: null,
        updatedAt: serverTimestamp(),
      });

      // Also update the user's account status
      const requestDoc = await getDoc(requestRef);
      if (requestDoc.exists()) {
        const data = requestDoc.data();
        const userId =
          userIdOverride ||
          (await verificationService.resolveUserIdFromRequestData(data, requestId));

        const userResult = await verificationService.updateUserAccountStatus(userId, 'rejected');
        return {
          success: true,
          userId,
          userUpdateSuccess: userResult.success,
          userUpdateError: userResult.success ? null : userResult.error,
        };
      }

      return { success: true, userId: null, userUpdateSuccess: false, userUpdateError: 'Request not found' };
    } catch (error) {
      console.error('Error rejecting request:', error);
      return { success: false, error: error.message };
    }
  },

  setPendingRequest: async (requestId, adminNotes = '', userIdOverride = null) => {
    try {
      const requestRef = doc(db, 'verificationRequests', requestId);
      await updateDoc(requestRef, {
        status: 'pending',
        adminNotes: adminNotes,
        rejectionReason: null,
        approvedAt: null,
        rejectedAt: null,
        updatedAt: serverTimestamp(),
      });

      const requestDoc = await getDoc(requestRef);
      if (requestDoc.exists()) {
        const data = requestDoc.data();
        const userId =
          userIdOverride ||
          (await verificationService.resolveUserIdFromRequestData(data, requestId));

        const userResult = await verificationService.updateUserAccountStatus(userId, 'pending_approval');
        return {
          success: true,
          userId,
          userUpdateSuccess: userResult.success,
          userUpdateError: userResult.success ? null : userResult.error,
        };
      }

      return { success: true, userId: null, userUpdateSuccess: false, userUpdateError: 'Request not found' };
    } catch (error) {
      console.error('Error setting request to pending:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete verification request
  deleteRequest: async (requestId) => {
    try {
      await deleteDoc(doc(db, 'verificationRequests', requestId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting request:', error);
      return { success: false, error: error.message };
    }
  },

  // Bulk delete
  deleteMultipleRequests: async (requestIds) => {
    try {
      const promises = requestIds.map(id => deleteDoc(doc(db, 'verificationRequests', id)));
      await Promise.all(promises);
      return { 
        success: true, 
        message: `Successfully deleted ${requestIds.length} verification request(s)` 
      };
    } catch (error) {
      console.error('Error deleting requests:', error);
      return { success: false, error: error.message };
    }
  },

  /** Same query as subscribeToVerificationRequests (no realtime). */
  fetchVerificationRequestsList: async () => {
    try {
      const q = query(collection(db, 'verificationRequests'), orderBy('submittedAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('Error fetching verification requests list:', error);
      return [];
    }
  },

  /**
   * Count on Verifications → Providers matches displayedStats.total: deduped provider requests
   * that resolve to an existing users/{uid} doc (non-orphan), same as the stats bar pipeline.
   */
  countLinkedDedupedProviders: async (requests) => {
    if (!requests?.length) return 0;
    const deduped = dedupeVerificationRequests(requests);
    const providers = deduped.filter((r) => r.userType === 'serviceProvider');
    const results = await Promise.all(
      providers.map(async (req) => {
        try {
          const userId = await verificationService.resolveUserIdFromRequestData(req, req.id);
          if (!userId) return false;
          const userSnap = await getDoc(doc(db, 'users', userId));
          return userSnap.exists();
        } catch {
          return false;
        }
      })
    );
    return results.filter(Boolean).length;
  },
};
