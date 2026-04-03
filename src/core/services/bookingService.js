import { db } from '../firebase/firebaseConfig.js';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { bookingFromFirestore } from '../models/Booking.js';

const bookingsRef = collection(db, 'bookings');

export const bookingService = {
  subscribeToBookings({ limitCount = 1000 } = {}, callback, onError) {
    const q = query(bookingsRef, orderBy('createdAt', 'desc'), limit(limitCount));

    return onSnapshot(
      q,
      (snapshot) => {
        const next = snapshot.docs.map((d) => bookingFromFirestore(d));
        callback(next);
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  },

  subscribeToBooking(bookingId, callback, onError) {
    if (!bookingId) throw new Error('bookingId is required');

    const ref = doc(db, 'bookings', bookingId);
    return onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          callback(null);
          return;
        }
        callback(bookingFromFirestore(snap));
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  },

  async updateBooking(bookingId, updates) {
    if (!bookingId) throw new Error('bookingId is required');
    if (!updates || typeof updates !== 'object') throw new Error('updates object is required');

    const ref = doc(db, 'bookings', bookingId);
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  },
};
