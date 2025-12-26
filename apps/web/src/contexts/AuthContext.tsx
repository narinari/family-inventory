'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import type { User, LoginResponse } from '@family-inventory/shared';

interface AuthState {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  needsInviteCode: boolean;
}

interface AuthContextType extends AuthState {
  signInWithGoogle: () => Promise<LoginResponse | null>;
  signOut: () => Promise<void>;
  submitInviteCode: (code: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    user: null,
    loading: true,
    needsInviteCode: false,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const response = await fetchWithAuth('/auth/me');
          if (response.success) {
            setState({
              firebaseUser,
              user: response.data.user,
              loading: false,
              needsInviteCode: false,
            });
          } else if (response.error?.code === 'USER_NOT_FOUND') {
            setState({
              firebaseUser,
              user: null,
              loading: false,
              needsInviteCode: true,
            });
          }
        } catch {
          setState({
            firebaseUser,
            user: null,
            loading: false,
            needsInviteCode: true,
          });
        }
      } else {
        setState({
          firebaseUser: null,
          user: null,
          loading: false,
          needsInviteCode: false,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  async function fetchWithAuth(path: string, options: RequestInit = {}) {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
    });
    return response.json();
  }

  async function signInWithGoogle(): Promise<LoginResponse | null> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        if (data.data.needsInviteCode) {
          setState((prev) => ({
            ...prev,
            firebaseUser: result.user,
            needsInviteCode: true,
            loading: false,
          }));
        } else {
          setState({
            firebaseUser: result.user,
            user: data.data.user,
            loading: false,
            needsInviteCode: false,
          });
        }
        return data.data;
      }

      return null;
    } catch (error) {
      console.error('Google sign in error:', error);
      return null;
    }
  }

  async function signOut(): Promise<void> {
    await firebaseSignOut(auth);
    setState({
      firebaseUser: null,
      user: null,
      loading: false,
      needsInviteCode: false,
    });
  }

  async function submitInviteCode(code: string): Promise<boolean> {
    try {
      const response = await fetchWithAuth('/auth/join', {
        method: 'POST',
        body: JSON.stringify({ inviteCode: code }),
      });

      if (response.success) {
        setState((prev) => ({
          ...prev,
          user: response.data.user,
          needsInviteCode: false,
        }));
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  async function refreshUser(): Promise<void> {
    if (!state.firebaseUser) return;

    try {
      const response = await fetchWithAuth('/auth/me');
      if (response.success) {
        setState((prev) => ({
          ...prev,
          user: response.data.user,
        }));
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signInWithGoogle,
        signOut,
        submitInviteCode,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
