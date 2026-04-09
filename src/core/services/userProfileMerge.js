import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig.js';

/** Fields from `users/{uid}/profile/userinfo` (mobile app shape). */
export async function fetchProfileUserinfo(uid) {
  const u = String(uid || '').trim();
  if (!u) return null;
  try {
    const snap = await getDoc(doc(db, 'users', u, 'profile', 'userinfo'));
    if (!snap.exists()) return {};
    return snap.data() || {};
  } catch (e) {
    console.error('fetchProfileUserinfo', u, e);
    return {};
  }
}

/**
 * Root `users/{uid}` plus `profile/userinfo`, profile fields overlay root (Referrals, admin hydration).
 */
export async function fetchMergedUserProfile(uid) {
  const u = String(uid || '').trim();
  if (!u) return null;
  try {
    const [rootSnap, profileSnap] = await Promise.all([
      getDoc(doc(db, 'users', u)),
      getDoc(doc(db, 'users', u, 'profile', 'userinfo')),
    ]);
    const root = rootSnap.exists() ? rootSnap.data() || {} : {};
    const profile = profileSnap.exists() ? profileSnap.data() || {} : {};
    if (!rootSnap.exists() && !profileSnap.exists()) return null;
    return { ...root, ...profile };
  } catch (e) {
    console.error('fetchMergedUserProfile', u, e);
    return null;
  }
}
