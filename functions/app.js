const express = require('express');
const cors = require('cors');
const { requireAdmin } = require('./middleware/requireAdmin');
const { notificationsRouter } = require('./routes/notifications');

const DEFAULT_ORIGINS = ['http://localhost:5173', 'https://pido-app.web.app'];

function parseOrigins() {
  const raw = process.env.FRONTEND_ORIGIN;
  if (!raw || !String(raw).trim()) {
    return DEFAULT_ORIGINS;
  }
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function createApp() {
  const app = express();
  const allowed = parseOrigins();

  app.use(
    cors({
      origin: allowed,
      credentials: false,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/admin/notifications', requireAdmin, notificationsRouter);

  return app;
}

module.exports = { createApp };
