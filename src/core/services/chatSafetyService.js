import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  limit,
  updateDoc,
  deleteDoc,
  deleteField,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig.js';
import { mapChatModerationEvent } from '../models/ChatModerationEvent.js';

export const chatSafetyService = {
  /** Single orderBy query — no composite index required; filter status client-side. */
  subscribeToEvents(callback) {
    const q = query(
      collection(db, 'chatModerationEvents'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const events = snapshot.docs.map((docSnap) =>
          mapChatModerationEvent(docSnap.id, docSnap.data())
        );
        callback({ events, error: null });
      },
      (error) => {
        console.error('chatSafetyService subscribeToEvents:', error);
        callback({ events: [], error: error.message });
      }
    );
  },

  subscribeToEvent(eventId, callback) {
    if (!eventId) return () => {};
    return onSnapshot(
      doc(db, 'chatModerationEvents', eventId),
      (snap) => {
        callback(
          snap.exists() ? mapChatModerationEvent(snap.id, snap.data()) : null
        );
      },
      (error) => {
        console.error('chatSafetyService subscribeToEvent:', error);
        callback(null);
      }
    );
  },

  async updateEventStatus(eventId, { status, adminNote, reviewedBy }) {
    if (!eventId) return { success: false, error: 'Missing event id' };
    try {
      await updateDoc(doc(db, 'chatModerationEvents', eventId), {
        status,
        adminNote: adminNote ?? '',
        reviewedBy: reviewedBy ?? null,
        reviewedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('chatSafetyService updateEventStatus:', error);
      return { success: false, error: error.message };
    }
  },

  async fetchRecentMessages(chatType, chatId, max = 10) {
    if (!chatId) return [];
    try {
      const root =
        chatType === 'support'
          ? collection(db, 'supportChats', chatId, 'messages')
          : collection(db, 'chats', chatId, 'messages');

      const q = query(root, orderBy('timestamp', 'desc'), limit(max));
      const snap = await getDocs(q);

      return snap.docs
        .map((docSnap) => {
          const data = docSnap.data();
          const content =
            data.content ??
            data.message ??
            (data.type === 'image' ? '[Image]' : '[Message]');
          return {
            id: docSnap.id,
            senderId: data.senderId ?? '',
            senderName: data.senderName ?? data.senderId ?? 'Unknown',
            content,
            timestamp: data.timestamp ?? null,
          };
        })
        .reverse();
    } catch (error) {
      console.error('chatSafetyService fetchRecentMessages:', error);
      return [];
    }
  },

  async fetchUserModerationStats(userId) {
    if (!userId) {
      return {
        violationCount: 0,
        chatSuspendedUntil: null,
        accountStatus: null,
        suspendedUntil: null,
      };
    }
    try {
      const userSnap = await getDoc(doc(db, 'users', userId));
      const data = userSnap.exists() ? userSnap.data() : {};
      return {
        violationCount: data.offPlatformViolationCount ?? 0,
        chatSuspendedUntil: data.chatSuspendedUntil ?? null,
        accountStatus: data.accountStatus ?? null,
        suspendedUntil: data.suspendedUntil ?? null,
      };
    } catch (error) {
      console.error('chatSafetyService fetchUserModerationStats:', error);
      return {
        violationCount: 0,
        chatSuspendedUntil: null,
        accountStatus: null,
        suspendedUntil: null,
      };
    }
  },

  async deleteEventAndResetUser(eventId, { resetUserModeration = true } = {}) {
    if (!eventId) return { success: false, error: 'Missing event id' };
    try {
      const eventRef = doc(db, 'chatModerationEvents', eventId);
      const eventSnap = await getDoc(eventRef);
      const senderId = eventSnap.exists() ? eventSnap.data()?.senderId : null;

      await deleteDoc(eventRef);

      if (resetUserModeration && senderId) {
        await updateDoc(doc(db, 'users', senderId), {
          offPlatformViolationCount: 0,
          chatSuspendedUntil: deleteField(),
          lastOffPlatformViolationAt: deleteField(),
        });
      }

      return { success: true };
    } catch (error) {
      console.error('chatSafetyService deleteEventAndResetUser:', error);
      return { success: false, error: error.message };
    }
  },

  async suspendUserChat(userId, durationMs, { reason = '', adminEmail = '' } = {}) {
    if (!userId) return { success: false, error: 'Missing user id' };
    try {
      const until = Timestamp.fromDate(new Date(Date.now() + durationMs));
      await updateDoc(doc(db, 'users', userId), {
        chatSuspendedUntil: until,
        chatSuspendReason: reason,
        chatSuspendedBy: adminEmail,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('chatSafetyService suspendUserChat:', error);
      return { success: false, error: error.message };
    }
  },

  async suspendAccount(userId, durationDays, { reason = '', adminEmail = '' } = {}) {
    if (!userId) return { success: false, error: 'Missing user id' };
    try {
      const until = Timestamp.fromDate(
        new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      );
      await updateDoc(doc(db, 'users', userId), {
        accountStatus: 'suspended',
        suspendedUntil: until,
        suspensionReason: reason,
        suspendedBy: adminEmail,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('chatSafetyService suspendAccount:', error);
      return { success: false, error: error.message };
    }
  },

  async banAccount(userId, { reason = '', adminEmail = '' } = {}) {
    if (!userId) return { success: false, error: 'Missing user id' };
    try {
      await updateDoc(doc(db, 'users', userId), {
        accountStatus: 'banned',
        bannedAt: serverTimestamp(),
        banReason: reason,
        bannedBy: adminEmail,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('chatSafetyService banAccount:', error);
      return { success: false, error: error.message };
    }
  },

  async clearAccountRestrictions(userId) {
    if (!userId) return { success: false, error: 'Missing user id' };
    try {
      await updateDoc(doc(db, 'users', userId), {
        accountStatus: 'approved',
        chatSuspendedUntil: deleteField(),
        suspendedUntil: deleteField(),
        suspensionReason: deleteField(),
        banReason: deleteField(),
        bannedAt: deleteField(),
        offPlatformViolationCount: 0,
        lastOffPlatformViolationAt: deleteField(),
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('chatSafetyService clearAccountRestrictions:', error);
      return { success: false, error: error.message };
    }
  },
};
