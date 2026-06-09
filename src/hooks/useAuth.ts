import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string | null;
  clinic_name: string | null;
  contact: string | null;
  role: string | null;
  approved: boolean | null;
  status: string | null;
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
        .select('id, email, clinic_name, contact, role, approved, status')
        .eq('id', currentUser.id)
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
        email: currentUser.email || null,
        clinic_name: 'ChekaMeds Admin',
        contact: null,
        role: 'admin',
        approved: true,
        status: 'approved',
      } : null);
      return;
    }

    if (profileData) {
      setProfile(profileData as UserProfile);
      return;
    }

    if (userIsAdmin) {
      setProfile({
        id: currentUser.id,
        email: currentUser.email || null,
        clinic_name: 'ChekaMeds Admin',
        contact: null,
        role: 'admin',
        approved: true,
        status: 'approved',
      });
      return;
    }

    const fallbackClinicName = String(currentUser.user_metadata?.clinic_name || '').trim();
    if (fallbackClinicName) {
      setProfile({
        id: currentUser.id,
        email: currentUser.email || null,
        clinic_name: fallbackClinicName,
        contact: null,
        role: 'facility',
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
    setProfile(null);
    setIsAdmin(false);
  };

  return { user, session, profile, isAdmin, loading, signOut };
}
