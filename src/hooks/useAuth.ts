import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string | null;
  clinic_name: string;
  contact: string | null;
  role: string | null;
  approved: boolean | null;
  status: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, clinic_name, contact, role, approved, status')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (error) {
      console.error('Profile lookup failed:', error);
      setProfile(null);
      return;
    }

    if (data?.clinic_name) {
      setProfile(data as UserProfile);
      return;
    }

    const fallbackClinicName = String(currentUser.user_metadata?.clinic_name || '').trim();
    if (fallbackClinicName) {
      setProfile({
        id: currentUser.id,
        email: currentUser.email || null,
        clinic_name: fallbackClinicName,
        contact: null,
        role: 'pharmacy',
        approved: false,
        status: 'pending',
      });
      return;
    }

    setProfile(null);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        setTimeout(async () => {
          await loadProfile(newSession?.user ?? null);
          setLoading(false);
        }, 0);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      await loadProfile(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, profile, loading, signOut };
}
