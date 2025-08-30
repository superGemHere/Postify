import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export function useAuthSession() {
  const setUser = useAuthStore.setState;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        const user = data.session.user;
        setUser({
          user: { id: user.id, email: user.email ?? '' },
          token: data.session.access_token,
        });
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && session.user) {
        setUser({
          user: { id: session.user.id, email: session.user.email ?? '' },
          token: session.access_token,
        });
      } else {
        setUser({ user: null, token: null });
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);
}
