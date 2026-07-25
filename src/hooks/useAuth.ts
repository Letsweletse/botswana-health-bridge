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

    const { data: adminRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.warn('Admin role lookup failed:', roleError.message);
    }

    const userIsAdmin = Boolean(adminRole);
    setIsAdmin(userIsAdmin);

    if (userIsAdmin) {
      setProfile({
        id: currentUser.id,
        email: currentUser.email || null,
        clinic_name: 'ChekaMeds Admin',
        contact: null,
        role: 'admin',
        approved: true,
        status: 'verified_partner',
      });
      return;
    }

    // Load facility by exact ID
    const { data: facilityData, error: facilityError } = await supabase
      .from('facilities')
      .select('id, email, name, status')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (facilityError) {
      console.error('Facility lookup failed:', facilityError);
      setProfile(null);
      return;
    }

    if (facilityData) {
      setProfile({
        id: facilityData.id,
        email: facilityData.email,
        clinic_name: facilityData.name,
        contact: null,
        role: 'facility',
        approved:
          facilityData.status === 'verified_partner' ||
          facilityData.status === 'claimed_listing',
        status: facilityData.status,
      });
      return;
    }

    // Google OAuth users — no facility yet, treat as new user
    const isGoogleUser = currentUser.app_metadata?.provider === 'google';
    if (isGoogleUser) {
      setProfile({
        id: currentUser.id,
        email: currentUser.email || null,
        clinic_name: currentUser.user_metadata?.full_name || null,
        contact: null,
        role: 'facility',
        approved: false,
        status: 'pending',
      });
      return;
    }

    // Fallback if account has no facility yet
    const fallbackClinicName = String(
      currentUser.user_metadata?.clinic_name || ''
    ).trim();

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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
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

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      console.error('Google sign-in error:', error.message);
    }
  };

  return {
    user,
    session,
    profile,
    isAdmin,
    loading,
    signOut,
    signInWithGoogle,
  };
}
