import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

export interface AppSession {
  id: string;
  email: string;
  nome: string;
  role: 'admin' | 'revenue_assurance' | 'viewer';
  avatar: string;
  metodo: string;
}

// Cache role per user to avoid repeated DB calls
const roleCache = new Map<string, { role: AppSession['role']; ts: number }>();
const ROLE_CACHE_TTL = 5 * 60 * 1000; // 5 min

function buildAppSessionSync(supaSession: Session, role: AppSession['role']): AppSession {
  const user = supaSession.user;
  const email = user.email ?? '';
  const nome = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0];
  const avatar = nome
    .split(' ')
    .map((w: string) => w[0]?.toUpperCase())
    .join('')
    .slice(0, 2);
  return { id: user.id, email, nome, role, avatar, metodo: user.app_metadata?.provider ?? 'email' };
}

async function fetchRole(userId: string): Promise<AppSession['role']> {
  const cached = roleCache.get(userId);
  if (cached && Date.now() - cached.ts < ROLE_CACHE_TTL) return cached.role;

  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  const role: AppSession['role'] = data?.role ?? 'viewer';
  roleCache.set(userId, { role, ts: Date.now() });
  return role;
}

export function useAuth() {
  const [session, setSession] = useState<AppSession | null>(null);
  const [loading, setLoading] = useState(true);
  const initialised = useRef(false);

  useEffect(() => {
    // 1. Get existing session first (fast, from local storage)
    supabase.auth.getSession().then(async ({ data: { session: supaSession } }) => {
      if (supaSession) {
        // Show UI immediately with default role, then upgrade
        const quickSession = buildAppSessionSync(supaSession, 'viewer');
        setSession(quickSession);
        setLoading(false);
        initialised.current = true;

        // Fetch real role in background
        const role = await fetchRole(supaSession.user.id);
        if (role !== 'viewer') {
          setSession(buildAppSessionSync(supaSession, role));
        }
      } else {
        setLoading(false);
        initialised.current = true;
      }
    });

    // 2. Listen for future changes (login/logout/token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, supaSession) => {
      if (!initialised.current) return; // skip initial duplicate fire

      if (supaSession) {
        const quickSession = buildAppSessionSync(supaSession, 'viewer');
        setSession(quickSession);
        setLoading(false);

        if (event === 'SIGNED_IN') {
          roleCache.delete(supaSession.user.id); // fresh login → refetch
        }
        const role = await fetchRole(supaSession.user.id);
        if (role !== 'viewer') {
          setSession(buildAppSessionSync(supaSession, role));
        }
      } else {
        setSession(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  return { session, loading, signOut };
}
