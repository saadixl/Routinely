import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider } from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase } from 'firebase/database';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Sign-in must run on the same site the app is served from; otherwise browsers that partition
// third-party storage (Safari, Chrome) drop the result of the Google redirect. Firebase Hosting
// serves /__/auth/handler on every hosting domain, so use the current one when it's ours.
const HOSTED_DOMAINS = ['routinely.saadixl.com', 'routinely--app.web.app'];
function authDomain() {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  return HOSTED_DOMAINS.includes(host) ? host : 'routinely--app.firebaseapp.com';
}

// Firebase web config is safe to ship publicly; access is enforced by
// database.rules.json and the authorized domains in Firebase Auth.
const firebaseConfig = {
  apiKey: 'REDACTED_API_KEY',
  authDomain: authDomain(),
  databaseURL: 'https://routinely--app-default-rtdb.firebaseio.com',
  projectId: 'routinely--app',
  storageBucket: 'routinely--app.firebasestorage.app',
  messagingSenderId: 'REDACTED_SENDER_ID',
  appId: 'REDACTED_APP_ID',
  measurementId: 'REDACTED_MEASUREMENT_ID',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

// `npm run dev:emu` points the app at local Auth + RTDB emulators (see `npm run emulators`).
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectDatabaseEmulator(db, '127.0.0.1', 9000);
}

isSupported()
  .then((ok) => ok && getAnalytics(app))
  .catch(() => {});
