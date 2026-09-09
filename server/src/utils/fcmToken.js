export async function resolveUserFcmToken(admin, userId) {
  const uid = String(userId || '').trim();
  if (!uid) return '';

  const db = admin.firestore();
  const userSnap = await db.collection('users').doc(uid).get();
  let token = String(userSnap.data()?.fcmToken || '').trim();
  if (token) return token;

  const profileSnap = await db
    .collection('users')
    .doc(uid)
    .collection('profile')
    .doc('userinfo')
    .get();
  token = String(profileSnap.data()?.fcmToken || '').trim();
  return token;
}
