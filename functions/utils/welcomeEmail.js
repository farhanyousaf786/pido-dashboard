const { applyTemplate, buildPidoEmailHtml } = require('./notify');

const WELCOME_TEMPLATES = {
  customer: {
    subject: 'Welcome to PIDO!',
    text: `Welcome to PIDO!

Thanks for joining as a customer. You can browse services, book trusted providers, and manage everything right from the app.

Get started:
- Set your location
- Browse service categories
- Book a provider near you

If you need help, open Help Center in the app anytime.

Welcome aboard,
The PIDO Team`,
    htmlBody: `
      <p>Thanks for joining PIDO as a <strong>customer</strong>.</p>
      <p>You can browse services, book trusted providers, and manage everything right from the app.</p>
      <ul>
        <li>Set your location</li>
        <li>Browse service categories</li>
        <li>Book a provider near you</li>
      </ul>
      <p>If you need help, open <strong>Help Center</strong> or <strong>Messages from PIDO</strong> in the app anytime.</p>
      <p>Welcome aboard,<br/>The PIDO Team</p>
    `,
  },
  serviceProvider: {
    subject: 'Welcome to PIDO — Provider account',
    text: `Welcome to PIDO!

Thanks for joining as a service provider. Complete your profile, choose your services, and go online to start receiving booking requests.

Next steps:
- Complete your business profile
- Add your services and pricing
- Submit verification documents
- Go online when you're ready to work

We're excited to have you on the platform.

Welcome aboard,
The PIDO Team`,
    htmlBody: `
      <p>Thanks for joining PIDO as a <strong>service provider</strong>.</p>
      <p>Complete your profile, choose your services, and go online to start receiving booking requests.</p>
      <ul>
        <li>Complete your business profile</li>
        <li>Add your services and pricing</li>
        <li>Submit verification documents</li>
        <li>Go online when you're ready to work</li>
      </ul>
      <p>We're excited to have you on the platform.</p>
      <p>Welcome aboard,<br/>The PIDO Team</p>
    `,
  },
};

function normalizeUserType(userType) {
  const t = String(userType || '').trim().toLowerCase();
  if (t === 'customer') return 'customer';
  if (t === 'serviceprovider' || t === 'service_provider' || t === 'provider') {
    return 'serviceProvider';
  }
  return null;
}

function buildWelcomeEmail({ userType, recipientName }) {
  const key = normalizeUserType(userType);
  if (!key || !WELCOME_TEMPLATES[key]) return null;

  const template = WELCOME_TEMPLATES[key];
  const vars = { name: recipientName || '' };

  return {
    subject: applyTemplate(template.subject, vars),
    text: applyTemplate(template.text, vars),
    html: buildPidoEmailHtml({
      title: key === 'customer' ? 'Welcome to PIDO!' : 'Welcome, Provider!',
      bodyHtml: template.htmlBody,
      recipientName,
    }),
  };
}

module.exports = { buildWelcomeEmail, normalizeUserType, WELCOME_TEMPLATES };
