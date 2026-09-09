const express = require('express');
const cors = require('cors');
const { requireAdmin } = require('./middleware/requireAdmin');
const { notificationsRouter } = require('./routes/notifications');
const { emailRouter } = require('./routes/email');
const { superChatRouter } = require('./routes/superChat');

const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5177',
  'https://pido-app.web.app',
  'https://pido-app.firebaseapp.com',
];

function parseOrigins() {
  const raw = process.env.FRONTEND_ORIGIN;
  if (!raw || !String(raw).trim()) {
    return DEFAULT_ORIGINS;
  }
  const custom = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  // Always keep defaults so local Vite ports keep working after deploy
  return [...new Set([...DEFAULT_ORIGINS, ...custom])];
}

function isAllowedOrigin(origin, allowed) {
  if (!origin) return true;
  if (allowed.includes(origin)) return true;
  // Any local Vite/dev port
  if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return true;
  return false;
}

function createApp() {
  const app = express();
  const allowed = parseOrigins();

  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedOrigin(origin, allowed)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: false,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    const { getNotifyConfig } = require('./config/notify');
    const cfg = getNotifyConfig();
    return res.json({
      ok: true,
      emailReady: cfg.emailReady === true,
      allowSends: cfg.allowSends === true,
      emailFrom: cfg.emailFrom || null,
    });
  });

  app.use('/admin/notifications', requireAdmin, notificationsRouter);
  app.use('/admin/email', requireAdmin, emailRouter);
  app.use('/admin/super-chat', requireAdmin, superChatRouter);

  return app;
}

module.exports = { createApp };
