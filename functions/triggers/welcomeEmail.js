const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { getAdminApp } = require('../firebaseAdmin');
const { sendEmail } = require('../utils/notify');
const { buildWelcomeEmail, normalizeUserType } = require('../utils/welcomeEmail');

async function resolveUserEmail(admin, uid, userData) {
  const direct = String(userData?.email || '').trim();
  if (direct.includes('@')) return direct;

  try {
    const profileSnap = await admin
      .firestore()
      .collection('users')
      .doc(uid)
      .collection('profile')
      .doc('userinfo')
      .get();
    const profileEmail = String(profileSnap.data()?.email || '').trim();
    if (profileEmail.includes('@')) return profileEmail;
  } catch (_) {
    // ignore profile lookup errors
  }

  try {
    const authUser = await admin.auth().getUser(uid);
    const authEmail = String(authUser.email || '').trim();
    if (authEmail.includes('@')) return authEmail;
  } catch (_) {
    // ignore auth lookup errors
  }

  return '';
}

async function resolveUserName(admin, uid, userData) {
  const fromDoc =
    String(userData?.fullName || userData?.displayName || userData?.firstName || '').trim();
  if (fromDoc) return fromDoc;

  try {
    const profileSnap = await admin
      .firestore()
      .collection('users')
      .doc(uid)
      .collection('profile')
      .doc('userinfo')
      .get();
    const profileName = String(profileSnap.data()?.fullName || '').trim();
    if (profileName) return profileName;
  } catch (_) {
    // ignore
  }

  return 'there';
}

function isSignupComplete(data) {
  const userType = normalizeUserType(data.userType);
  if (!userType) return false;

  const hasUserInformation = data.userInformation === true;

  if (userType === 'customer') {
    // Customer signup is complete after personal info step.
    return hasUserInformation;
  }

  if (userType === 'serviceProvider') {
    // Provider signup is complete after profile/documents step.
    return hasUserInformation && data.isProfileComplete === true;
  }

  return false;
}

const onUserWelcomeEmail = onDocumentWritten('users/{uid}', async (event) => {
  const after = event.data?.after;
  if (!after?.exists) return;

  const uid = event.params.uid;
  const data = after.data() || {};
  const userType = normalizeUserType(data.userType);
  if (!userType) return;
  if (data.welcomeEmailSent === true) return;
  if (!isSignupComplete(data)) return;

  const admin = getAdminApp();
  const email = await resolveUserEmail(admin, uid, data);
  if (!email) {
    console.log(`[welcomeEmail] skip ${uid}: no email yet`);
    return;
  }

  const recipientName = await resolveUserName(admin, uid, data);
  const welcome = buildWelcomeEmail({ userType, recipientName });
  if (!welcome) return;

  try {
    await sendEmail({
      to: email,
      subject: welcome.subject,
      text: welcome.text,
      html: welcome.html,
      recipientName,
    });

    await admin.firestore().collection('users').doc(uid).set(
      {
        welcomeEmailSent: true,
        welcomeEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`[welcomeEmail] sent to ${uid} (${userType})`);
  } catch (err) {
    console.error(`[welcomeEmail] failed for ${uid}:`, err.message);
  }
});

module.exports = { onUserWelcomeEmail };
