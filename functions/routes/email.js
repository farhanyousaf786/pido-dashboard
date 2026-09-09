const express = require('express');
const { getAdminApp } = require('../firebaseAdmin');
const { sendEmail, buildPidoEmailHtml } = require('../utils/notify');
const { buildWelcomeEmail } = require('../utils/welcomeEmail');
const { collectAudienceRecipients, normalizeAudienceInput } = require('../utils/userContact');

const emailRouter = express.Router();

const BULK_EMAIL_MAX = parseInt(process.env.BULK_EMAIL_MAX_RECIPIENTS || '500', 10);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function maskEmail(email) {
  const e = String(email || '');
  const [local, domain] = e.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

function normalizeAudiencePayload(body) {
  return normalizeAudienceInput({
    audienceMode: body?.audienceMode,
    includeUserIds: body?.includeUserIds,
    excludeUserIds: body?.excludeUserIds,
    extraEmails: body?.extraEmails,
    filters: body?.filters,
  });
}

/** Firestore rejects `undefined` — strip it recursively before writes. */
function sanitizeForFirestore(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined);
  }
  if (typeof value === 'object' && !(value instanceof Date) && typeof value.toDate !== 'function') {
    if (value.constructor && value.constructor.name === 'FieldValue') return value;
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      const cleaned = sanitizeForFirestore(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }
  return value;
}

emailRouter.get('/status', (_req, res) => {
  const { getNotifyConfig } = require('../config/notify');
  const cfg = getNotifyConfig();
  return res.json({
    success: true,
    data: {
      emailReady: cfg.emailReady,
      allowSends: cfg.allowSends,
      from: cfg.emailFrom,
    },
  });
});

emailRouter.post('/send', async (req, res) => {
  try {
    const { to, subject, message, recipientName, html } = req.body || {};
    if (!to || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'to, subject, and message are required',
      });
    }

    const result = await sendEmail({
      to,
      subject,
      text: message,
      html:
        html ||
        buildPidoEmailHtml({
          title: subject,
          bodyHtml: String(message).replace(/\n/g, '<br/>'),
          recipientName,
        }),
      recipientName,
    });

    return res.json({
      success: true,
      message: 'Email sent',
      result,
    });
  } catch (e) {
    return res.status(e.statusCode || 500).json({
      success: false,
      message: e.message || 'Failed to send email',
    });
  }
});

emailRouter.post('/welcome', async (req, res) => {
  try {
    const { uid, email, userType, recipientName } = req.body || {};
    if (!uid || !email || !userType) {
      return res.status(400).json({
        success: false,
        message: 'uid, email, and userType are required',
      });
    }

    const welcome = buildWelcomeEmail({ userType, recipientName });
    if (!welcome) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported userType for welcome email',
      });
    }

    const result = await sendEmail({
      to: email,
      subject: welcome.subject,
      text: welcome.text,
      html: welcome.html,
      recipientName,
    });

    const admin = getAdminApp();
    await admin.firestore().collection('users').doc(String(uid)).set(
      {
        welcomeEmailSent: true,
        welcomeEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.json({
      success: true,
      message: 'Welcome email sent',
      result,
    });
  } catch (e) {
    return res.status(e.statusCode || 500).json({
      success: false,
      message: e.message || 'Failed to send welcome email',
    });
  }
});

emailRouter.post('/bulk/preview', async (req, res) => {
  try {
    const admin = getAdminApp();
    const audience = normalizeAudiencePayload(req.body);
    const recipients = await collectAudienceRecipients(admin, audience, 'email');

    const LIST_LIMIT = 250;
    const list = recipients.slice(0, LIST_LIMIT).map((r) => ({
      uid: r.uid,
      name: r.name,
      email: r.manual ? r.email : maskEmail(r.email),
      rawEmail: r.email,
      manual: r.manual === true,
      userType: r.userType,
    }));

    return res.json({
      success: true,
      data: {
        channel: 'email',
        totalRecipients: recipients.length,
        audienceMode: audience.audienceMode,
        filters: audience.filters,
        includeCount: audience.includeUserIds.length + audience.extraEmails.length,
        excludeCount: audience.excludeUserIds.length,
        recipients: list,
        truncated: recipients.length > LIST_LIMIT,
        note:
          'Only users with a real email address are included (phone-placeholder emails are excluded).',
      },
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e.message || 'Failed to preview bulk email audience',
    });
  }
});

emailRouter.post('/bulk/send', async (req, res) => {
  try {
    const { subject, message, recipientName } = req.body || {};
    const text = String(message || '').trim();
    const subj = String(subject || '').trim();

    if (!subj || !text) {
      return res.status(400).json({
        success: false,
        message: 'subject and message are required',
      });
    }

    const admin = getAdminApp();
    const audience = normalizeAudiencePayload(req.body);

    if (
      audience.audienceMode === 'only_selected' &&
      audience.includeUserIds.length === 0 &&
      audience.extraEmails.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Select at least one user or add an email for "Only selected users" mode',
      });
    }

    let recipients = await collectAudienceRecipients(admin, audience, 'email');

    if (recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No eligible recipients for the selected filters',
      });
    }

    if (recipients.length > BULK_EMAIL_MAX) {
      return res.status(400).json({
        success: false,
        message: `Too many recipients (${recipients.length}). Max per send is ${BULK_EMAIL_MAX}. Narrow your filters.`,
      });
    }

    const adminUid = req.user?.uid || 'admin';
    const campaignRef = admin.firestore().collection('bulkMessageCampaigns').doc();

    let successCount = 0;
    let failureCount = 0;
    const failures = [];

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      try {
        await sendEmail({
          to: r.email,
          subject: subj,
          text,
          html: buildPidoEmailHtml({
            title: subj,
            bodyHtml: text.replace(/\n/g, '<br/>'),
            recipientName: recipientName || r.name,
          }),
          recipientName: r.name,
        });
        successCount++;
      } catch (err) {
        failureCount++;
        if (failures.length < 20) {
          failures.push({ uid: r.uid, email: maskEmail(r.email), error: err.message });
        }
      }

      if ((i + 1) % 10 === 0) {
        await sleep(250);
      }
    }

    const resultPayload = sanitizeForFirestore({
      channel: 'email',
      subject: subj,
      messagePreview: text.slice(0, 280),
      audienceMode: audience.audienceMode,
      filters: audience.filters,
      includeUserIds: audience.includeUserIds,
      excludeUserIds: audience.excludeUserIds,
      extraEmails: audience.extraEmails,
      totalRecipients: recipients.length,
      successCount,
      failureCount,
      failures: failures.map((f) => ({
        uid: f.uid || null,
        email: f.email || null,
        error: f.error || 'unknown',
      })),
      sentBy: adminUid,
      status: failureCount === 0 ? 'completed' : 'completed_with_errors',
    });

    await campaignRef.set({
      ...resultPayload,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      message:
        failureCount === 0
          ? `Sent successfully to ${successCount} recipient${successCount === 1 ? '' : 's'}`
          : `Finished: ${successCount} sent, ${failureCount} failed`,
      campaignId: campaignRef.id,
      result: {
        ...resultPayload,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    return res.status(e.statusCode || 500).json({
      success: false,
      message: e.message || 'Failed to send bulk email',
    });
  }
});

emailRouter.get('/bulk/history', async (req, res) => {
  try {
    const admin = getAdminApp();
    const limit = Math.min(parseInt(req.query.limit || '20', 10) || 20, 50);
    const snap = await admin
      .firestore()
      .collection('bulkMessageCampaigns')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const campaigns = snap.docs.map((doc) => {
      const d = doc.data() || {};
      const createdAt = d.createdAt?.toDate?.()
        ? d.createdAt.toDate().toISOString()
        : d.createdAt || null;
      return {
        id: doc.id,
        channel: d.channel || 'email',
        subject: d.subject || '',
        messagePreview: d.messagePreview || '',
        audienceMode: d.audienceMode || 'filters',
        totalRecipients: d.totalRecipients || 0,
        successCount: d.successCount || 0,
        failureCount: d.failureCount || 0,
        status: d.status || 'completed',
        sentBy: d.sentBy || null,
        extraEmails: d.extraEmails || [],
        createdAt,
      };
    });

    return res.json({
      success: true,
      data: { campaigns },
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e.message || 'Failed to load email history',
    });
  }
});

emailRouter.delete('/bulk/history/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) {
      return res.status(400).json({ success: false, message: 'Campaign id is required' });
    }
    const admin = getAdminApp();
    const ref = admin.firestore().collection('bulkMessageCampaigns').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    await ref.delete();
    return res.json({ success: true, message: 'Removed from history', data: { id } });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e.message || 'Failed to delete email history item',
    });
  }
});

module.exports = { emailRouter };
