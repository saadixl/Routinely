import { createContext, useContext, useEffect, useState } from 'react';
import { getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const AuthContext = createContext(null);

// Pop-ups are unreliable in iOS home-screen apps and some in-app browsers; use a full-page redirect there.
const preferRedirect = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

const POPUP_UNAVAILABLE = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
]);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still resolving
  const [redirectError, setRedirectError] = useState(null);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u ?? null)), []);
  useEffect(() => {
    getRedirectResult(auth).catch((e) => setRedirectError(e));
  }, []);

  const signIn = async () => {
    if (preferRedirect()) return signInWithRedirect(auth, googleProvider);
    try {
      return await signInWithPopup(auth, googleProvider);
    } catch (e) {
      if (POPUP_UNAVAILABLE.has(e.code)) return signInWithRedirect(auth, googleProvider);
      throw e;
    }
  };

  const value = {
    user,
    loading: user === undefined,
    redirectError,
    signIn,
    signOut: () => signOut(auth),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
