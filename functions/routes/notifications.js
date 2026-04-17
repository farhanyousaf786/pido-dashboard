const express = require('express');
const { getAdminApp } = require('../firebaseAdmin');

const notificationsRouter = express.Router();

function normalizeData(data) {
  if (!data || typeof data !== 'object') return undefined;
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    out[String(k)] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  return Object.keys(out).length ? out : undefined;
}

/** Deep-clone JSON-serializable payload for Firestore (keeps numbers/bools/maps). */
function cloneDataForFirestore(data) {
  if (!data || typeof data !== 'object') return {};
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    return {};
  }
}

async function resolveUserRecipients(admin, userIds) {
  const ids = Array.isArray(userIds) ? userIds.map((u) => String(u || '').trim()).filter(Boolean) : [];
  if (ids.length === 0) return [];

  const snaps = await Promise.all(
    ids.map((uid) => admin.firestore().collection('users').doc(uid).get())
  );

  const out = [];
  for (let i = 0; i < ids.length; i++) {
    const uid = ids[i];
    const snap = snaps[i];
    if (!snap.exists) continue;
    const token = (snap.data()?.fcmToken || '').toString().trim();
    if (!token) continue;
    out.push({ uid, token, userDoc: snap.data() || {} });
  }
  return out;
}

/**
 * Writes the same in-app record the mobile app expects: top-level `notifications`
 * and mirror `users/{uid}/notifications` (same doc id).
 */
async function persistDirectMessageRecord(admin, { uid, title, body, requestData, userDoc }) {
  const db = admin.firestore();
  const dataMap = cloneDataForFirestore(requestData);
  delete dataMap.type;
  delete dataMap.status;
  delete dataMap.userType;

  const bookingId =
    dataMap.bookingId != null && String(dataMap.bookingId).trim() !== ''
      ? String(dataMap.bookingId)
      : undefined;

  const rootStatus =
    requestData && typeof requestData.status === 'string' && requestData.status.trim() !== ''
      ? String(requestData.status).trim()
      : 'sent';

  const fromDoc =
    userDoc?.userType != null && String(userDoc.userType).trim() !== ''
      ? String(userDoc.userType).trim()
      : '';
  const fromPayload =
    requestData?.userType != null && String(requestData.userType).trim() !== ''
      ? String(requestData.userType).trim()
      : '';
  const userType = fromDoc || fromPayload || undefined;

  const docRef = db.collection('notifications').doc();
  const payload = {
    title: String(title),
    body: String(body),
    type: 'direct_message',
    receiverUid: String(uid),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    isRead: false,
    status: rootStatus,
    ...(bookingId ? { bookingId } : {}),
    ...(userType ? { userType } : {}),
    ...(Object.keys(dataMap).length > 0 ? { data: dataMap } : {}),
  };

  const batch = db.batch();
  batch.set(docRef, payload);
  batch.set(db.collection('users').doc(String(uid)).collection('notifications').doc(docRef.id), payload);
  await batch.commit();
  return docRef.id;
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

    const ids = Array.isArray(userIds) ? userIds : [];
    let recipients = [];

    if (ids.length > 0) {
      recipients = await resolveUserRecipients(admin, ids);
    } else {
      let tokens = Array.isArray(fcmTokens) ? fcmTokens : [];
      tokens = tokens.map((t) => (t || '').toString().trim()).filter(Boolean);
      recipients = tokens.map((token) => ({ uid: null, token, userDoc: {} }));
    }

    if (recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid FCM tokens found for selected users',
      });
    }

    const baseData = {
      type: 'direct_message',
      timestamp: new Date().toISOString(),
      ...(normalizeData(data) || {}),
    };

    let successCount = 0;
    let failureCount = 0;
    const messageIds = [];
    const firestoreIds = [];

    for (const { uid, token, userDoc } of recipients) {
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

        if (uid) {
          try {
            const fid = await persistDirectMessageRecord(admin, {
              uid,
              title,
              body,
              requestData: data && typeof data === 'object' ? data : {},
              userDoc,
            });
            firestoreIds.push(fid);
          } catch {
            // Push succeeded; in-app history write failed — still count as sent
          }
        }
      } catch {
        failureCount++;
      }
    }

    return res.json({
      success: true,
      message: 'Users notification sent',
      result: {
        recipients: { total: recipients.length, success: successCount, failed: failureCount },
        messageIds,
        ...(firestoreIds.length > 0 ? { firestoreNotificationIds: firestoreIds } : {}),
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

module.exports = { notificationsRouter };
