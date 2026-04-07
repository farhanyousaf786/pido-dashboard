import { API_BASE_URL, API_ENDPOINTS, getAuthHeaders } from '../../config/api.js';

async function apiRequest(url, options = {}) {
  if (!API_BASE_URL) {
    throw new Error(
      'Missing VITE_API_BASE_URL. Set it in .env.local to your Node backend base URL (e.g. http://localhost:3000) and restart the dev server.'
    );
  }

  const authHeaders = await getAuthHeaders();
  const headers = {
    ...authHeaders,
    ...(options.headers || {}),
  };

  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err) {
    const isNetwork =
      err?.name === 'TypeError' ||
      /Failed to fetch|NetworkError|load failed/i.test(String(err?.message || ''));
    if (isNetwork) {
      throw new Error(
        `Cannot reach API at ${API_BASE_URL}. Start the notification server (e.g. cd server && npm install && npm run dev) and ensure VITE_API_BASE_URL matches its PORT in .env.local, then restart Vite.`
      );
    }
    throw err;
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  let data = null;
  let rawText = '';

  try {
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      rawText = await res.text();
    }
  } catch {
    // ignore parse errors
  }

  if (!res.ok) {
    const baseMessage = `Request failed (${res.status})`;
    const serverMessage = data?.message || rawText || '';
    const serverError = data?.error || '';
    const details = [serverError, serverMessage].filter(Boolean).join(' - ');
    throw new Error(`${baseMessage} @ ${url}${details ? `: ${details}` : ''}`);
  }

  return data ?? (rawText ? { success: true, rawText } : null);
}

export const notificationService = {
  fetchCustomersForNotifications: async () => {
    return apiRequest(API_ENDPOINTS.ADMIN.NOTIFICATIONS_CUSTOMERS, {
      method: 'GET',
    });
  },

  sendTopicNotification: async ({ topic, title, body, data, image }) => {
    return apiRequest(API_ENDPOINTS.ADMIN.NOTIFICATIONS_TOPIC, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        title,
        body,
        data,
        image,
      }),
    });
  },

  sendCustomerNotification: async ({ customerIds, title, body, data, image }) => {
    return apiRequest(API_ENDPOINTS.ADMIN.NOTIFICATIONS_CUSTOMER, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerIds,
        title,
        body,
        data,
        image,
      }),
    });
  },

  sendUsersNotification: async ({ userIds, fcmTokens, title, body, data, image }) => {
    return apiRequest(API_ENDPOINTS.ADMIN.NOTIFICATIONS_USERS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userIds,
        fcmTokens,
        title,
        body,
        data,
        image,
      }),
    });
  },

  testNotification: async ({ type, target, title, body }) => {
    return apiRequest(API_ENDPOINTS.ADMIN.NOTIFICATIONS_TEST, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        target,
        title,
        body,
      }),
    });
  },
};
