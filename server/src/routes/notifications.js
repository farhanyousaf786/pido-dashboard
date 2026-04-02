import express from 'express';
import { getAdminApp } from '../firebaseAdmin.js';

export const notificationsRouter = express.Router();

function normalizeData(data) {
  if (!data || typeof data !== 'object') return undefined;
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    out[String(k)] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  return Object.keys(out).length ? out : undefined;
}

notificationsRouter.post('/topic', async (req, res) => {
  try {
    const { topic, title, body, data, image } = req.body || {};
    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'title and body are required' });
    }

    const admin = getAdminApp();
    const message = {
      topic: topic || process.env.DEFAULT_TOPIC || 'Pido-all',
      notification: {
        title: String(title),
        body: String(body),
        ...(image ? { imageUrl: String(image) } : {}),
      },
      data: {
        type: 'topic',
        timestamp: new Date().toISOString(),
        ...(normalizeData(data) || {}),
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };

    const messageId = await admin.messaging().send(message);

    return res.json({
      success: true,
      message: 'Topic notification sent successfully',
      result: { messageId, topic: message.topic },
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: 'Failed to send topic notification',
      error: e?.message,
    });
  }
});

notificationsRouter.post('/users', async (req, res) => {
  try {
    const { userIds, fcmTokens, title, body, data, image } = req.body || {};

    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'title and body are required' });
    }

    const admin = getAdminApp();

    let tokens = Array.isArray(fcmTokens) ? fcmTokens : [];
    tokens = tokens.map((t) => (t || '').toString().trim()).filter(Boolean);

    const ids = Array.isArray(userIds) ? userIds : [];

    // If tokens not provided, resolve from Firestore users/{uid}.fcmToken
    if (tokens.length === 0 && ids.length > 0) {
      const reads = await Promise.all(
        ids.map(async (uid) => {
          const snap = await admin.firestore().collection('users').doc(String(uid)).get();
          if (!snap.exists) return null;
          const t = (snap.data()?.fcmToken || '').toString().trim();
          return t || null;
        })
      );
      tokens = reads.filter(Boolean);
    }

    if (tokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid FCM tokens found for selected users',
      });
    }

    const baseData = {
      type: 'users',
      timestamp: new Date().toISOString(),
      ...(normalizeData(data) || {}),
    };

    // Send individually to keep compatibility + clearer per-token results
    let successCount = 0;
    let failureCount = 0;
    const messageIds = [];

    for (const token of tokens) {
      try {
        const message = {
          token,
          notification: {
            title: String(title),
            body: String(body),
            ...(image ? { imageUrl: String(image) } : {}),
          },
          data: baseData,
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
              },
            },
          },
        };

        const messageId = await admin.messaging().send(message);
        messageIds.push(messageId);
        successCount++;
      } catch {
        failureCount++;
      }
    }

    return res.json({
      success: true,
      message: 'Users notification sent',
      result: {
        recipients: { total: tokens.length, success: successCount, failed: failureCount },
        messageIds,
      },
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: 'Failed to send users notification',
      error: e?.message,
    });
  }
});

notificationsRouter.post('/test', async (req, res) => {
  try {
    const { type = 'topic', target, title = 'Test Notification', body = 'Test message' } = req.body || {};

    const admin = getAdminApp();

    if (type === 'topic') {
      const messageId = await admin.messaging().send({
        topic: target || process.env.DEFAULT_TOPIC || 'Pido-all',
        notification: { title: String(title), body: String(body) },
        data: { type: 'test', timestamp: new Date().toISOString() },
      });
      return res.json({ success: true, message: 'Test notification sent', result: { messageId } });
    }

    // token test
    if (!target) {
      return res.status(400).json({ success: false, message: 'target is required for token test' });
    }

    const messageId = await admin.messaging().send({
      token: String(target),
      notification: { title: String(title), body: String(body) },
      data: { type: 'test', timestamp: new Date().toISOString() },
    });

    return res.json({ success: true, message: 'Test notification sent', result: { messageId } });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: e?.message,
    });
  }
});
