import { auth } from '../core/firebase/firebaseConfig.js';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const API_ENDPOINTS = {
  ADMIN: {
    NOTIFICATIONS_CUSTOMERS: `${API_BASE_URL}/admin/notifications/customers`,
    NOTIFICATIONS_TOPIC: `${API_BASE_URL}/admin/notifications/topic`,
    NOTIFICATIONS_CUSTOMER: `${API_BASE_URL}/admin/notifications/customer`,
    NOTIFICATIONS_USERS: `${API_BASE_URL}/admin/notifications/users`,
    NOTIFICATIONS_TEST: `${API_BASE_URL}/admin/notifications/test`,
  },
};

export async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) return {};

  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}
