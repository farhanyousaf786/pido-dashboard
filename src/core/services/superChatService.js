import {
  collection,
  doc,
  getDoc,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  limit,
} from 'firebase/firestore';
import { API_BASE_URL, getAuthHeaders } from '../../config/api.js';
import { db } from '../firebase/firebaseConfig.js';

const SUPER_CHAT_BASE = `${API_BASE_URL}/admin/super-chat`;

export const superChatService = {
  /** Live list of all super chat threads (newest first). */
  subscribeToChats(callback, { max = 100 } = {}) {
    const q = query(
      collection(db, 'superChats'),
      orderBy('updatedAt', 'desc'),
      limit(max)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const chats = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() || {};
          return {
            id: docSnap.id,
            userId: data.userId || docSnap.id,
            userName: data.userName || 'User',
            userEmail: data.userEmail || '',
            userType: data.userType || '',
            lastMessage: data.lastMessage || '',
            status: data.status || 'open',
            adminUnreadCount: Number(data.adminUnreadCount || 0),
            userUnreadCount: Number(data.userUnreadCount || 0),
            updatedAt: data.updatedAt?.toDate?.() || null,
            createdAt: data.createdAt?.toDate?.() || null,
          };
        });
        callback({ chats, error: null });
      },
      (error) => {
        console.error('superChatService.subscribeToChats:', error);
        callback({ chats: [], error: error.message });
      }
    );
  },

  subscribeToMessages(userId, callback) {
    const chatId = String(userId || '').trim();
    if (!chatId) return () => {};

    const q = query(
      collection(db, 'superChats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const messages = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        callback({ messages, error: null });
      },
      (error) => {
        console.error('superChatService.subscribeToMessages:', error);
        callback({ messages: [], error: error.message });
      }
    );
  },

  async markAdminRead(userId) {
    const chatId = String(userId || '').trim();
    if (!chatId) return;
    const chatRef = doc(db, 'superChats', chatId);
    const snap = await getDoc(chatRef);
    if (!snap.exists()) return;
    await updateDoc(chatRef, { adminUnreadCount: 0 });
  },

  async sendAdminMessage(user, text) {
    const message = String(text || '').trim();
    if (!message) throw new Error('Message is required');

    const headers = await getAuthHeaders();
    const res = await fetch(`${SUPER_CHAT_BASE}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        userId: user.uid,
        userName: user.fullName || user.displayName || user.userName || user.email || 'User',
        userEmail: user.email || user.userEmail || '',
        userType: user.userType || '',
        message,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `Super chat failed (${res.status})`);
    }

    return data;
  },

  async sendBulkAdminMessage(recipients, text) {
    const message = String(text || '').trim();
    if (!message) throw new Error('Message is required');
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new Error('Select at least one recipient');
    }

    const headers = await getAuthHeaders();
    const res = await fetch(`${SUPER_CHAT_BASE}/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        message,
        recipients: recipients.map((u) => ({
          userId: u.uid || u.userId,
          userName: u.fullName || u.userName || u.email || 'User',
          userEmail: u.email || u.userEmail || '',
          userType: u.userType || '',
        })),
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `Bulk super chat failed (${res.status})`);
    }
    return data;
  },
};
