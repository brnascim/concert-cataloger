import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'revenue_assurance' | 'viewer';

export interface Permissions {
  import: boolean;
  search: boolean;
  export_excel: boolean;
  export_csv: boolean;
  view_reports: boolean;
  manage_users: boolean;
  view_quarantine: boolean;
  delete_records: boolean;
  edit_records: boolean;
}

const ROLE_PERMISSIONS: Record<AppRole, Permissions> = {
  admin: {
    import: true, search: true, export_excel: true, export_csv: true,
    view_reports: true, manage_users: true, view_quarantine: true,
    delete_records: true, edit_records: true,
  },
  revenue_assurance: {
    import: true, search: true, export_excel: true, export_csv: true,
    view_reports: true, manage_users: false, view_quarantine: true,
    delete_records: false, edit_records: false,
  },
  viewer: {
    import: false, search: true, export_excel: false, export_csv: true,
    view_reports: false, manage_users: false, view_quarantine: false,
    delete_records: false, edit_records: false,
  },
};

export function useUserRole() {
  const { session } = useAuth();
  const [role, setRole] = useState<AppRole>('viewer');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) {
      setRole('viewer');
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .limit(1)
        .maybeSingle();

      if (data?.role) {
        setRole(data.role as AppRole);
      } else {
        setRole('viewer');
      }
      setLoading(false);
    };

    fetchRole();
  }, [session?.user?.id]);

  const permissions = ROLE_PERMISSIONS[role];

  const hasPermission = (action: keyof Permissions): boolean => {
    return permissions[action] === true;
  };

  return { role, permissions, hasPermission, loading };
}
