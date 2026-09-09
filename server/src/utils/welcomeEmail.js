import { applyTemplate, buildPidoEmailHtml } from './notify.js';

export const WELCOME_TEMPLATE_DOC = 'emailTemplates/welcome';

export const DEFAULT_WELCOME_TEMPLATES = {
  customer: {
    subject: 'Welcome to PIDO!',
    title: 'Welcome to PIDO!',
    body: `Thanks for joining PIDO as a customer.

You can browse services, book trusted providers, and manage everything right from the app.

Get started:
- Set your location
- Browse service categories
- Book a provider near you

If you need help, open Help Center or Messages from PIDO in the app anytime.

Welcome aboard,
The PIDO Team`,
  },
  serviceProvider: {
    subject: 'Welcome to PIDO — Provider account',
    title: 'Welcome, Provider!',
    body: `Thanks for joining PIDO as a service provider.

Complete your profile, choose your services, and go online to start receiving booking requests.

Next steps:
- Complete your business profile
- Add your services and pricing
- Submit verification documents
- Go online when you're ready to work

We're excited to have you on the platform.

Welcome aboard,
The PIDO Team`,
  },
};

export function normalizeUserType(userType) {
  const t = String(userType || '').trim().toLowerCase();
  if (t === 'customer') return 'customer';
  if (t === 'serviceprovider' || t === 'service_provider' || t === 'provider') {
    return 'serviceProvider';
  }
  return null;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeTemplatePart(part, fallback) {
  const src = part && typeof part === 'object' ? part : {};
  return {
    subject: String(src.subject || fallback.subject || '').trim() || fallback.subject,
    title: String(src.title || fallback.title || '').trim() || fallback.title,
    body: String(src.body || src.text || fallback.body || '').trim() || fallback.body,
  };
}

export function mergeWelcomeTemplates(stored) {
  const data = stored && typeof stored === 'object' ? stored : {};
  return {
    customer: normalizeTemplatePart(data.customer, DEFAULT_WELCOME_TEMPLATES.customer),
    serviceProvider: normalizeTemplatePart(
      data.serviceProvider,
      DEFAULT_WELCOME_TEMPLATES.serviceProvider
    ),
  };
}

export async function loadWelcomeTemplates(admin) {
  try {
    const snap = await admin.firestore().doc(WELCOME_TEMPLATE_DOC).get();
    if (!snap.exists) return mergeWelcomeTemplates(null);
    return mergeWelcomeTemplates(snap.data());
  } catch (err) {
    console.error('[welcomeEmail] load templates failed:', err.message);
    return mergeWelcomeTemplates(null);
  }
}

export function buildWelcomeEmail({ userType, recipientName, templates }) {
  const key = normalizeUserType(userType);
  const merged = mergeWelcomeTemplates(templates);
  if (!key || !merged[key]) return null;

  const template = merged[key];
  const vars = { name: recipientName || '' };
  const subject = applyTemplate(template.subject, vars);
  const title = applyTemplate(template.title, vars);
  const text = applyTemplate(template.body, vars);
  const bodyHtml = escapeHtml(text).replace(/\n/g, '<br/>');

  return {
    subject,
    text,
    html: buildPidoEmailHtml({
      title,
      bodyHtml,
      recipientName,
    }),
  };
}

export async function recordWelcomeEmailSend(admin, payload) {
  const ref = admin.firestore().collection('welcomeEmailSends').doc();
  await ref.set({
    uid: payload.uid || null,
    email: payload.email || '',
    userType: payload.userType || '',
    recipientName: payload.recipientName || '',
    subject: payload.subject || '',
    source: payload.source || 'signup',
    status: payload.status || 'sent',
    error: payload.error || null,
    sentBy: payload.sentBy || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return ref.id;
}
