import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig.js';

export const verificationService = {
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
  approveRequest: async (requestId, adminNotes = '') => {
    try {
      const requestRef = doc(db, 'verificationRequests', requestId);
      await updateDoc(requestRef, {
        status: 'approved',
        adminNotes: adminNotes,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Also update the user's account status
      const requestDoc = await getDoc(requestRef);
      if (requestDoc.exists()) {
        const data = requestDoc.data();
        if (data.userId) {
          const userRef = doc(db, 'users', data.userId);
          await updateDoc(userRef, {
            accountStatus: 'approved',
            updatedAt: serverTimestamp(),
          });
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error approving request:', error);
      return { success: false, error: error.message };
    }
  },

  // Reject provider/customer
  rejectRequest: async (requestId, rejectionReason, adminNotes = '') => {
    try {
      const requestRef = doc(db, 'verificationRequests', requestId);
      await updateDoc(requestRef, {
        status: 'rejected',
        rejectionReason: rejectionReason,
        adminNotes: adminNotes,
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Also update the user's account status
      const requestDoc = await getDoc(requestRef);
      if (requestDoc.exists()) {
        const data = requestDoc.data();
        if (data.userId) {
          const userRef = doc(db, 'users', data.userId);
          await updateDoc(userRef, {
            accountStatus: 'rejected',
            updatedAt: serverTimestamp(),
          });
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error rejecting request:', error);
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
};
