import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import { createAdminModel } from '../models/Admin';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const value = useMemo(
    () => ({ user, adminProfile, loading, error, login, logout, setError }),
    [user, adminProfile, loading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
