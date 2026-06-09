import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  user_id: string;
  clinic_name: string;
  full_name: string | null;
  approved: boolean | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }

    const [{ data: profileData, error: profileError }, { data: adminRole, error: roleError }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, user_id, clinic_name, full_name, approved')
        .or(`user_id.eq.${currentUser.id},id.eq.${currentUser.id}`)
        .maybeSingle(),
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser.id)
        .eq('role', 'admin')
        .maybeSingle(),
    ]);

    if (roleError) {
      console.warn('Admin role lookup failed:', roleError.message);
    }

    const userIsAdmin = Boolean(adminRole);
    setIsAdmin(userIsAdmin);

    if (profileError) {
      console.error('Profile lookup failed:', profileError);
      setProfile(userIsAdmin ? {
        id: currentUser.id,
        user_id: currentUser.id,
        clinic_name: 'ChekaMeds Admin',
        full_name: currentUser.user_metadata?.full_name || currentUser.email || 'Admin',
        approved: true,
      } : null);
      return;
    }

    if (profileData?.clinic_name) {
      setProfile(profileData as UserProfile);
      return;
    }

    if (userIsAdmin) {
      setProfile({
        id: currentUser.id,
        user_id: currentUser.id,
        clinic_name: 'ChekaMeds Admin',
        full_name: currentUser.user_metadata?.full_name || currentUser.email || 'Admin',
        approved: true,
      });
      return;
    }

    const fallbackClinicName = String(currentUser.user_metadata?.clinic_name || '').trim();
    if (fallbackClinicName) {
      setProfile({
        id: currentUser.id,
        user_id: currentUser.id,
        clinic_name: fallbackClinicName,
        full_name: currentUser.user_metadata?.full_name || null,
        approved: false,
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
    setProfile(null);
    setIsAdmin(false);
  };

  return { user, session, profile, isAdmin, loading, signOut };
}
