import { useState, useEffect, useCallback } from 'react';
import { getSessao, logout as localLogout, type LocalSession } from '@/lib/localAuth';

export function useAuth() {
  const [session, setSession] = useState<LocalSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setSession(getSessao());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    // Listen for storage changes (e.g. login/logout in same tab)
    const handler = () => refresh();
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [refresh]);

  const signOut = useCallback(() => {
    localLogout();
    setSession(null);
  }, []);

  const setLoggedIn = useCallback((s: LocalSession) => {
    setSession(s);
  }, []);

  return { session, loading, signOut, setLoggedIn };
}
