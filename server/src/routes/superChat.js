import express from 'express';
import { getAdminApp } from '../firebaseAdmin.js';
import { sendSuperChatPush } from '../utils/superChatNotify.js';

export const superChatRouter = express.Router();

const BULK_SUPER_CHAT_MAX = parseInt(process.env.BULK_SUPER_CHAT_MAX || '100', 10);

async function sendOneSuperChat(admin, reqUser, recipient, text) {
  const uid = String(recipient.userId || recipient.uid || '').trim();
  if (!uid) throw new Error('userId is required');

  const chatRef = admin.firestore().collection('superChats').doc(uid);
  const chatSnap = await chatRef.get();
  const userName = recipient.userName || recipient.fullName || 'User';
  const userEmail = recipient.userEmail || recipient.email || '';
  const userType = recipient.userType || '';

  if (!chatSnap.exists) {
    await chatRef.set({
      userId: uid,
      userName,
      userEmail,
      userType,
      status: 'open',
      adminUnreadCount: 0,
      userUnreadCount: 0,
      lastMessage: '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  const adminUid = reqUser?.uid || 'admin';
  const adminName = reqUser?.name || reqUser?.email || 'PIDO Admin';

  await chatRef.collection('messages').add({
    senderId: adminUid,
    senderRole: 'admin',
    senderName: adminName,
    message: text,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    isRead: false,
    type: 'text',
  });

  await chatRef.update({
    lastMessage: text,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    userUnreadCount: admin.firestore.FieldValue.increment(1),
    adminUnreadCount: 0,
    userName: userName || chatSnap.data()?.userName || 'User',
    userEmail: userEmail || chatSnap.data()?.userEmail || '',
    userType: userType || chatSnap.data()?.userType || '',
  });

  const pushResult = await sendSuperChatPush(admin, {
    userId: uid,
    chatId: uid,
    title: 'Message from PIDO',
    body: text,
  });

  return { chatId: uid, push: pushResult };
}

superChatRouter.post('/message', async (req, res) => {
  try {
    const { userId, userName, userEmail, userType, message } = req.body || {};
    const text = String(message || '').trim();
    const uid = String(userId || '').trim();

    if (!uid || !text) {
      return res.status(400).json({
        success: false,
        message: 'userId and message are required',
      });
    }

    const admin = getAdminApp();
    const result = await sendOneSuperChat(
      admin,
      req.user,
      { userId: uid, userName, userEmail, userType },
      text
    );

    return res.json({
      success: true,
      message: 'Super chat message sent',
      chatId: result.chatId,
      push: result.push,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e.message || 'Failed to send super chat message',
    });
  }
});

superChatRouter.post('/bulk', async (req, res) => {
  try {
    const { message, recipients } = req.body || {};
    const text = String(message || '').trim();
    const list = Array.isArray(recipients) ? recipients : [];

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'message is required',
      });
    }
    if (list.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Select at least one recipient',
      });
    }
    if (list.length > BULK_SUPER_CHAT_MAX) {
      return res.status(400).json({
        success: false,
        message: `Too many recipients (${list.length}). Max is ${BULK_SUPER_CHAT_MAX}.`,
      });
    }

    const admin = getAdminApp();
    let successCount = 0;
    let failureCount = 0;
    const failures = [];

    for (let i = 0; i < list.length; i++) {
      const recipient = list[i] || {};
      try {
        await sendOneSuperChat(admin, req.user, recipient, text);
        successCount++;
      } catch (err) {
        failureCount++;
        if (failures.length < 20) {
          failures.push({
            userId: recipient.userId || recipient.uid || null,
            error: err.message || 'failed',
          });
        }
      }
      if ((i + 1) % 10 === 0) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }

    return res.json({
      success: true,
      message:
        failureCount === 0
          ? `Sent successfully to ${successCount} user${successCount === 1 ? '' : 's'}`
          : `Finished: ${successCount} sent, ${failureCount} failed`,
      result: {
        totalRecipients: list.length,
        successCount,
        failureCount,
        failures,
      },
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e.message || 'Failed to send bulk super chat',
    });
  }
});
