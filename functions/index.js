const { setGlobalOptions } = require('firebase-functions/v2');
const { onRequest } = require('firebase-functions/v2/https');
const { defineString } = require('firebase-functions/params');
const { createApp } = require('./app');
const { onUserWelcomeEmail } = require('./triggers/welcomeEmail');
const { onSuperChatMessageCreated } = require('./triggers/superChatPush');

// Bind SendGrid vars from functions/.env into the deployed function runtime.
// Values come from functions/.env at deploy time (do not use empty defaults —
// those can override real .env values).
defineString('SENDGRID_API_KEY');
defineString('SENDGRID_FROM_EMAIL');
defineString('SENDGRID_FROM_NAME');
defineString('NOTIFY_DISABLE_SENDS', { default: 'false' });

setGlobalOptions({
  region: 'us-central1',
  maxInstances: 10,
});

const app = createApp();

/**
 * HTTP API for admin FCM notifications.
 * Served at https://pido-app.web.app/admin/notifications/* via Hosting rewrites.
 * Also available at https://us-central1-pido-app.cloudfunctions.net/notificationsApi
 */
exports.notificationsApi = onRequest(
  {
    invoker: 'public',
  },
  app
);

exports.onUserWelcomeEmail = onUserWelcomeEmail;
exports.onSuperChatMessageCreated = onSuperChatMessageCreated;
