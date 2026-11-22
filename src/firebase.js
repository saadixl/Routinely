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
  return HOSTED_DOMAINS.includes(host) ? host : import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
}

// Project config comes from .env.local (git-ignored); see .env.example for the keys.
// Note: these values still end up in the built JS that browsers download. Access is enforced by
// database.rules.json, the authorized domains in Firebase Auth, and the API key's referrer limits.
const env = import.meta.env;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: authDomain(),
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
};

const missing = Object.entries(firebaseConfig).filter(([k, v]) => !v && k !== 'measurementId').map(([k]) => k);
if (missing.length) {
  throw new Error(`Missing Firebase config: ${missing.join(', ')}. Copy .env.example to .env.local and fill it in.`);
}

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
