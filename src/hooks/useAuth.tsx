import { useState, useEffect, useCallback } from 'react';
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

export function useAuth() {
  const [session, setSession] = useState<AppSession | null>(null);
  const [loading, setLoading] = useState(true);

  const buildAppSession = useCallback(async (supaSession: Session): Promise<AppSession> => {
    const user = supaSession.user;
    const email = user.email ?? '';
    const nome = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0];
    const avatar = nome
      .split(' ')
      .map((w: string) => w[0]?.toUpperCase())
      .join('')
      .slice(0, 2);

    // Fetch role from user_roles table
    let role: 'admin' | 'revenue_assurance' | 'viewer' = 'viewer';
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleData?.role) {
      role = roleData.role;
    }

    return { id: user.id, email, nome, role, avatar, metodo: supaSession.user.app_metadata?.provider ?? 'email' };
  }, []);

  useEffect(() => {
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, supaSession) => {
      if (supaSession) {
        const appSession = await buildAppSession(supaSession);
        setSession(appSession);
      } else {
        setSession(null);
      }
      setLoading(false);
    });

    // THEN check existing session
    supabase.auth.getSession().then(async ({ data: { session: supaSession } }) => {
      if (supaSession) {
        const appSession = await buildAppSession(supaSession);
        setSession(appSession);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [buildAppSession]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  return { session, loading, signOut };
}
