const { setGlobalOptions } = require('firebase-functions/v2');
const { onRequest } = require('firebase-functions/v2/https');
const { createApp } = require('./app');

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
