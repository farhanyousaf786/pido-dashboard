const sgMail = require('@sendgrid/mail');
const { getNotifyConfig } = require('../config/notify');

function assertSendsAllowed() {
  const { allowSends } = getNotifyConfig();
  if (!allowSends) {
    const err = new Error('Sending is disabled (NOTIFY_DISABLE_SENDS=true)');
    err.statusCode = 503;
    throw err;
  }
}

function applyTemplate(template, vars = {}) {
  return String(template || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    if (vars[key] == null) return '';
    return String(vars[key]);
  });
}

function buildPidoEmailHtml({ title, bodyHtml, recipientName }) {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,';
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #FF6B35; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">PIDO</h1>
      </div>
      <div style="padding: 30px; background-color: #f9f9f9;">
        <p>${greeting}</p>
        ${title ? `<h2 style="color: #333; margin-top: 0;">${title}</h2>` : ''}
        <div style="white-space: pre-wrap; color: #333; line-height: 1.6;">${bodyHtml}</div>
      </div>
      <div style="padding: 20px; text-align: center; background-color: #333; color: #999;">
        <p style="margin: 0; font-size: 12px;">You're receiving this email because you're a registered PIDO user.</p>
        <p style="margin: 10px 0 0 0; font-size: 12px;">PIDO - On-Demand Services</p>
      </div>
    </div>
  `.trim();
}

async function sendEmail({ to, subject, text, html, recipientName }) {
  assertSendsAllowed();
  const config = getNotifyConfig();
  if (!config.emailReady) {
    const err = new Error(
      'Email is not configured. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL.'
    );
    err.statusCode = 503;
    throw err;
  }
  if (!to || !String(to).includes('@')) {
    const err = new Error('A valid recipient email is required');
    err.statusCode = 400;
    throw err;
  }

  const recipient = String(to).trim().toLowerCase();
  const messageHtml =
    html ||
    buildPidoEmailHtml({
      title: '',
      bodyHtml: String(text || '').replace(/\n/g, '<br/>'),
      recipientName,
    });

  sgMail.setApiKey(config.apiKey);
  const [response] = await sgMail.send({
    to: recipient,
    from: { email: config.emailFrom, name: config.emailFromName },
    subject: String(subject || '').trim(),
    text: String(text || ''),
    html: messageHtml,
  });

  return {
    provider: 'sendgrid',
    messageId: response?.headers?.['x-message-id'] || null,
    to: recipient,
    statusCode: response?.statusCode ?? null,
  };
}

module.exports = { sendEmail, applyTemplate, buildPidoEmailHtml, assertSendsAllowed };
