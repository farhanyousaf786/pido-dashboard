function getNotifyConfig() {
  const apiKey = (process.env.SENDGRID_API_KEY || '').trim();
  const fromEmail = (process.env.SENDGRID_FROM_EMAIL || process.env.NOTIFY_FROM_EMAIL || '').trim();
  const fromName = (process.env.SENDGRID_FROM_NAME || 'PIDO').trim();
  const allowSends = String(process.env.NOTIFY_DISABLE_SENDS || '').toLowerCase() !== 'true';

  return {
    allowSends,
    emailReady: Boolean(apiKey && fromEmail),
    emailFrom: fromEmail,
    emailFromName: fromName,
    apiKey,
  };
}

module.exports = { getNotifyConfig };
