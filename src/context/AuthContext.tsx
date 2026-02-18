'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getFirebaseAuth, onAuthStateChanged, type User } from '@/lib/firebase';
import { upsertProfile } from '@/lib/queries';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      // No Firebase config yet — just stop loading
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          await upsertProfile({
            id: firebaseUser.uid,
            email: firebaseUser.email ?? '',
            display_name: firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'User',
          });
        } catch {
          // Non-fatal: profile upsert fails if Supabase env vars not set yet
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
