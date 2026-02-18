import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null;
  if (!firebaseConfig.apiKey) return null;
  if (getApps().length > 0) return getApps()[0];
  return initializeApp(firebaseConfig);
}

function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  return getAuth(app);
}

// Lazily accessed auth — only valid in browser with real env vars
export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    const a = getFirebaseAuth();
    if (!a) throw new Error('Firebase Auth not initialized. Add env vars to .env.local');
    return (a as unknown as Record<string | symbol, unknown>)[prop];
  },
});

const googleProvider = new GoogleAuthProvider();

export { onAuthStateChanged, updateProfile, getFirebaseAuth };
export type { User };

export async function signInWithEmail(email: string, password: string) {
  const a = getFirebaseAuth();
  if (!a) throw new Error('Firebase not initialized');
  return signInWithEmailAndPassword(a, email, password);
}

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const a = getFirebaseAuth();
  if (!a) throw new Error('Firebase not initialized');
  const credential = await createUserWithEmailAndPassword(a, email, password);
  await updateProfile(credential.user, { displayName });
  return credential;
}

export async function signInWithGoogle() {
  const a = getFirebaseAuth();
  if (!a) throw new Error('Firebase not initialized');
  return signInWithPopup(a, googleProvider);
}

export async function signOut() {
  const a = getFirebaseAuth();
  if (!a) return;
  return firebaseSignOut(a);
}
