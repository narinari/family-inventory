import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  connectAuthEmulator,
  signInWithCustomToken,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);

// Emulator 接続（e2e テスト用）
const useEmulator = process.env.NEXT_PUBLIC_USE_EMULATOR === 'true';
if (useEmulator && typeof window !== 'undefined') {
  connectAuthEmulator(auth, 'http://localhost:9099', {
    disableWarnings: true,
  });
  // e2e テスト用にグローバルに公開
  const e2eWindow = window as unknown as {
    __e2eAuth: typeof auth;
    __e2eSignInWithCustomToken: typeof signInWithCustomToken;
  };
  e2eWindow.__e2eAuth = auth;
  e2eWindow.__e2eSignInWithCustomToken = signInWithCustomToken;
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

export default app;
