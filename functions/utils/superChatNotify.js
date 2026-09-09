const { resolveUserFcmToken } = require('./fcmToken');

async function persistSuperChatNotification(admin, { userId, chatId, title, body }) {
  const db = admin.firestore();
  const notifRef = db.collection('notifications').doc();
  const payload = {
    title: String(title),
    body: String(body),
    type: 'super_chat',
    receiverUid: String(userId),
    chatId: String(chatId),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    isRead: false,
    status: 'sent',
  };

  const batch = db.batch();
  batch.set(notifRef, payload);
  batch.set(
    db.collection('users').doc(String(userId)).collection('notifications').doc(notifRef.id),
    payload
  );
  await batch.commit();
  return notifRef.id;
}

/**
 * Send super chat push the same way as POST /admin/notifications/users —
 * direct FCM in the HTTP handler, not via a Firestore trigger.
 */
async function sendSuperChatPush(admin, { userId, chatId, title, body }) {
  const uid = String(userId || '').trim();
  const cid = String(chatId || uid).trim();
  const pushTitle = String(title || 'Message from PIDO');
  const pushBody = String(body || 'You have a new message from PIDO').slice(0, 180);

  const fcmToken = await resolveUserFcmToken(admin, uid);
  if (!fcmToken) {
    console.log(`[superChatNotify] no FCM token for ${uid}`);
    return { sent: false, reason: 'no_token' };
  }

  try {
    const messageId = await admin.messaging().send({
      token: fcmToken,
      notification: { title: pushTitle, body: pushBody },
      data: {
        type: 'super_chat',
        action: 'super_chat',
        chatId: cid,
        userId: uid,
        title: pushTitle,
        body: pushBody,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        timestamp: new Date().toISOString(),
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'chat_channel',
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    });

    const firestoreId = await persistSuperChatNotification(admin, {
      userId: uid,
      chatId: cid,
      title: pushTitle,
      body: pushBody,
    });

    console.log(`[superChatNotify] sent to ${uid} messageId=${messageId}`);
    return { sent: true, messageId, firestoreId };
  } catch (err) {
    console.error(`[superChatNotify] push failed for ${uid}:`, err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendSuperChatPush, persistSuperChatNotification };
