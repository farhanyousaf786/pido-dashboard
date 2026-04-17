import { API_BASE_URL, API_ENDPOINTS, getAuthHeaders } from '../../config/api.js';

function isLocalhostUrl(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(String(url || '').trim());
}

function isBrowserOnLiveHost() {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname || '';
  return h !== '' && h !== 'localhost' && h !== '127.0.0.1';
}

function liveApiHelpMessage() {
  return (
    'Production dashboards cannot call localhost. Deploy the folder `server/` to a public HTTPS host (Cloud Run, Render, Railway, etc.), ' +
    'set that URL as VITE_API_BASE_URL when you run npm run build, and set FRONTEND_ORIGIN on the server to this site’s URL. See README “Production (notifications)”.'
  );
}

async function apiRequest(url, options = {}) {
  if (!API_BASE_URL) {
    throw new Error(
      'Missing VITE_API_BASE_URL. For local dev set it in .env.local (e.g. http://localhost:3000) and restart Vite. For production, set it when building (see README).'
    );
  }

  if (isLocalhostUrl(API_BASE_URL) && isBrowserOnLiveHost()) {
    throw new Error(
      `This app was built with VITE_API_BASE_URL=${API_BASE_URL}, which does not work on the live site. Rebuild with your deployed API URL. ${liveApiHelpMessage()}`
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
      const hint = isBrowserOnLiveHost()
        ? ` Check that the API is deployed, HTTPS, and allows CORS from ${window.location.origin}. ${liveApiHelpMessage()}`
        : ' Start the notification server (cd server && npm install && npm run dev), match PORT in .env.local as VITE_API_BASE_URL, and restart Vite.';
      throw new Error(`Cannot reach API at ${API_BASE_URL}.${hint}`);
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
