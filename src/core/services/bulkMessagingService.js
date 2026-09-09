import { API_BASE_URL, getAuthHeaders } from '../../config/api.js';

const EMAIL_BASE = `${API_BASE_URL}/admin/email`;

async function postJson(path, body) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${EMAIL_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

async function getJson(path) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${EMAIL_BASE}${path}`, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

export const bulkMessagingService = {
  async previewBulkEmail(audiencePayload) {
    return postJson('/bulk/preview', audiencePayload);
  },

  async sendBulkEmail(audiencePayload) {
    return postJson('/bulk/send', audiencePayload);
  },

  async getHistory(limit = 20) {
    return getJson(`/bulk/history?limit=${limit}`);
  },
};
