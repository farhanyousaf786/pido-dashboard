const admin = require('firebase-admin');

function getAdminApp() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin;
}

module.exports = { getAdminApp };
