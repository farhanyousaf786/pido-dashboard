import { buildPidoEmailHtml } from '../utils/notify.js';

const WELCOME_TEMPLATES = {
  customer: {
    subject: 'Welcome to PIDO!',
    text: `Welcome to PIDO!

Thanks for joining as a customer. You can browse services, book trusted providers, and manage everything right from the app.

Welcome aboard,
The PIDO Team`,
    htmlBody: `
      <p>Thanks for joining PIDO as a <strong>customer</strong>.</p>
      <p>You can browse services, book trusted providers, and manage everything right from the app.</p>
      <p>Welcome aboard,<br/>The PIDO Team</p>
    `,
  },
  serviceProvider: {
    subject: 'Welcome to PIDO — Provider account',
    text: `Welcome to PIDO!

Thanks for joining as a service provider. Complete your profile and go online to start receiving booking requests.

Welcome aboard,
The PIDO Team`,
    htmlBody: `
      <p>Thanks for joining PIDO as a <strong>service provider</strong>.</p>
      <p>Complete your profile and go online to start receiving booking requests.</p>
      <p>Welcome aboard,<br/>The PIDO Team</p>
    `,
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

export function buildWelcomeEmail({ userType, recipientName }) {
  const key = normalizeUserType(userType);
  if (!key || !WELCOME_TEMPLATES[key]) return null;
  const template = WELCOME_TEMPLATES[key];
  return {
    subject: template.subject,
    text: template.text,
    html: buildPidoEmailHtml({
      title: key === 'customer' ? 'Welcome to PIDO!' : 'Welcome, Provider!',
      bodyHtml: template.htmlBody,
      recipientName,
    }),
  };
}
