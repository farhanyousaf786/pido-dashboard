import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { requireAdmin } from './middleware/requireAdmin.js';
import { notificationsRouter } from './routes/notifications.js';
import { emailRouter } from './routes/email.js';
import { superChatRouter } from './routes/superChat.js';
import { getNotifyConfig } from './config/notify.js';

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

const customOrigins = String(process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...DEFAULT_ORIGINS, ...customOrigins])];

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return true;
  return false;
}

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: false,
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
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

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
app.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://${host}:${port}`);
  // eslint-disable-next-line no-console
  console.log(
    `Email: ${getNotifyConfig().emailReady ? 'ready' : 'NOT configured'} | CORS: local Vite ports + pido-app.web.app`
  );
});
