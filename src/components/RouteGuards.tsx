import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getProfile } from '../services/data';
import { useI18n } from '../i18n';

function Guard({ admin, children }: { admin?: boolean; children: ReactNode }) {
  const {t}=useI18n();
  const location = useLocation();
  const [state, setState] = useState<'loading'|'ok'|'no-auth'|'forbidden'>('loading');
  useEffect(() => {
    let active = true;
    (async () => {
      if (!supabase) { if (active) setState('forbidden'); return; }
      const { data } = await supabase.auth.getUser();
      if (!data.user) { if (active) setState('no-auth'); return; }
      if (admin) {
        const profile = await getProfile(data.user.id);
        if (!active) return;
        setState(profile?.role === 'admin' ? 'ok' : 'forbidden');
      } else if (active) setState('ok');
    })().catch(() => active && setState('forbidden'));
    return () => { active = false; };
  }, [admin]);
  if (state === 'loading') return <main className="section"><div className="container"><div className="surface loading-state">{t('guard.checking')}</div></div></main>;
  if (state === 'no-auth') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (state === 'forbidden') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function RequireAuth({ children }: { children: ReactNode }) { return <Guard>{children}</Guard>; }
export function RequireAdmin({ children }: { children: ReactNode }) { return <Guard admin>{children}</Guard>; }
