import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { requireAdmin } from './middleware/requireAdmin.js';
import { notificationsRouter } from './routes/notifications.js';

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    credentials: false,
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/admin/notifications', requireAdmin, notificationsRouter);

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
app.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://${host}:${port}`);
});
