'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const storageKey = 'skillbridge-auth';

export function AuthProvider({ children }) {
  const [session, setSession] = useState({ token: '', user: null, hydrated: false });

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      setSession((current) => ({ ...current, hydrated: true }));
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      setSession({ ...parsed, hydrated: true });
    } catch {
      setSession({ token: '', user: null, hydrated: true });
    }
  }, []);

  const value = useMemo(
    () => ({
      ...session,
      login(nextSession) {
        window.localStorage.setItem(storageKey, JSON.stringify(nextSession));
        setSession({ ...nextSession, hydrated: true });
      },
      logout() {
        window.localStorage.removeItem(storageKey);
        setSession({ token: '', user: null, hydrated: true });
      }
    }),
    [session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
