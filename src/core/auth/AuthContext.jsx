import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import { createAdminModel } from '../models/Admin';
import {
  ADMIN_TEST_MODE_STORAGE_KEY,
  readAdminTestModeFromStorage,
  writeAdminTestModeToStorage,
} from '../adminTestModeStorage.js';

const AuthContext = createContext(null);

function mapAuthPasswordError(e) {
  const code = e?.code || '';
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Current password is incorrect.';
  }
  if (code === 'auth/weak-password') {
    return 'Password is too weak. Use at least 6 characters.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Try again later.';
  }
  if (code === 'auth/requires-recent-login') {
    return 'For security, sign out and sign in again, then change your password.';
  }
  return e?.message || 'Something went wrong.';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminTestMode, setAdminTestModeState] = useState(false);
  const adminProfileRef = useRef(null);
  adminProfileRef.current = adminProfile;

  useEffect(() => {
    setAdminTestModeState(readAdminTestModeFromStorage());
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.storageArea !== localStorage) return;
      if (e.key != null && e.key !== ADMIN_TEST_MODE_STORAGE_KEY) return;
      setAdminTestModeState(readAdminTestModeFromStorage());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setAdminTestMode = useCallback((enabled) => {
    const next = Boolean(enabled);
    writeAdminTestModeToStorage(next);
    setAdminTestModeState(next);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setAdminProfile(null);
        setLoading(false);
        return;
      }

      try {
        const adminsRef = collection(db, 'adminUsers');
        const q = query(adminsRef, where('uid', '==', firebaseUser.uid));

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          console.warn('Admin guard: no admin profile found for uid', firebaseUser.uid);
          setError('No admin profile found for this account.');
          await signOut(auth);
          setUser(null);
          setAdminProfile(null);
        } else {
          const docSnap = snapshot.docs[0];
          const data = docSnap.data();

          const role = data.role || '';
          const isActive = data.isActive !== false; // default true when missing

          if (role !== 'admin') {
            console.warn('Admin guard: profile role is not admin', role);
            setError('Your account is not an admin.');
            await signOut(auth);
            setUser(null);
            setAdminProfile(null);
          } else if (!isActive) {
            console.warn('Admin guard: admin profile is not active');
            setError('Your admin account is disabled.');
            await signOut(auth);
            setUser(null);
            setAdminProfile(null);
          } else {
            setUser(firebaseUser);
            setAdminProfile(
              createAdminModel({
                firestoreDocId: docSnap.id,
                uid: data.uid || firebaseUser.uid,
                email: data.email || firebaseUser.email,
                name: data.name || firebaseUser.displayName || '',
                role,
                permissions: data.permissions || {},
                isActive,
              }),
            );
          }
        }
      } catch (e) {
        console.error('Admin guard: error while verifying admin access', e);
        setError('Failed to verify admin access. Please try again later.');
        await signOut(auth);
        setUser(null);
        setAdminProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const login = async (email, password) => {
    setError('');
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const changeAdminPassword = useCallback(async (currentPassword, newPassword) => {
    const u = auth.currentUser;
    if (!u?.email) {
      return { success: false, error: 'Not signed in.' };
    }
    try {
      const cred = EmailAuthProvider.credential(u.email, currentPassword);
      await reauthenticateWithCredential(u, cred);
      await updatePassword(u, newPassword);
      return { success: true };
    } catch (e) {
      return { success: false, error: mapAuthPasswordError(e) };
    }
  }, []);

  const sendAdminPasswordResetEmail = useCallback(async () => {
    const u = auth.currentUser;
    const em = u?.email;
    if (!em) {
      return { success: false, error: 'No email on file.' };
    }
    try {
      await sendPasswordResetEmail(auth, em);
      return { success: true };
    } catch (e) {
      return { success: false, error: mapAuthPasswordError(e) };
    }
  }, []);

  const updateAdminName = useCallback(async (name) => {
    const trimmed = (name ?? '').toString().trim();
    setError('');
    const profile = adminProfileRef.current;
    if (!profile?.firestoreDocId) {
      setError('Admin profile is not ready. Try again in a moment.');
      return { success: false, error: 'Missing admin document' };
    }
    try {
      const ref = doc(db, 'adminUsers', profile.firestoreDocId);
      await updateDoc(ref, {
        name: trimmed,
        updatedAt: serverTimestamp(),
      });
      setAdminProfile((prev) => (prev ? { ...prev, name: trimmed } : null));
      return { success: true };
    } catch (e) {
      const msg = e?.message || 'Failed to update name';
      setError(msg);
      return { success: false, error: msg };
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      adminProfile,
      adminTestMode,
      setAdminTestMode,
      loading,
      error,
      login,
      logout,
      setError,
      updateAdminName,
      changeAdminPassword,
      sendAdminPasswordResetEmail,
    }),
    [
      user,
      adminProfile,
      adminTestMode,
      loading,
      error,
      updateAdminName,
      changeAdminPassword,
      sendAdminPasswordResetEmail,
      setAdminTestMode,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
