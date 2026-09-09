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
    throw new Error(data.message || `Email request failed (${res.status})`);
  }
  return data;
}

async function getJson(path) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${EMAIL_BASE}${path}`, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Email request failed (${res.status})`);
  }
  return data;
}

async function putJson(path, body) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${EMAIL_BASE}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Email request failed (${res.status})`);
  }
  return data;
}

export const emailService = {
  async getStatus() {
    const headers = await getAuthHeaders();
    if (!headers.Authorization) {
      throw new Error('Not signed in');
    }
    const res = await fetch(`${EMAIL_BASE}/status`, { headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `Status check failed (${res.status})`);
    }
    return data;
  },

  async sendEmail({ to, subject, message, recipientName }) {
    return postJson('/send', { to, subject, message, recipientName });
  },

  async sendWelcomeEmail({ uid, email, userType, recipientName }) {
    return postJson('/welcome', { uid, email, userType, recipientName });
  },

  async getWelcomeTemplate() {
    return getJson('/welcome/template');
  },

  async saveWelcomeTemplate(templates) {
    return putJson('/welcome/template', { templates });
  },

  async getWelcomeHistory(limit = 30) {
    return getJson(`/welcome/history?limit=${limit}`);
  },
};
