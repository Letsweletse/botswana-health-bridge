import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string | null;
  clinic_name: string | null;
  contact: string | null;
  name: string | null;
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
        name: null,
        role: 'admin',
        approved: true,
        status: 'verified_partner',
      });
      return;
    }

    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, clinic_name, contact, name, role, approved, status')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile lookup failed:', profileError);
      setProfile(null);
      return;
    }

    if (existingProfile) {
      setProfile(existingProfile);
      return;
    }

    // First sign-in: create a pending profile so an admin can review it.
    const clinicName = String(currentUser.user_metadata?.clinic_name || '').trim();
    const fullName = String(
      currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || ''
    ).trim();

    const { data: createdProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: currentUser.id,
        email: currentUser.email || null,
        clinic_name: clinicName || fullName || null,
        name: fullName || null,
        role: 'facility',
        approved: false,
        status: 'pending',
      })
      .select('id, email, clinic_name, contact, name, role, approved, status')
      .single();

    if (insertError) {
      console.error('Profile creation failed:', insertError);
      setProfile(null);
      return;
    }

    setProfile(createdProfile);

    supabase.functions
      .invoke('notify-facility-registration', {
        body: {
          clinicName: createdProfile.clinic_name || 'Unnamed facility',
          fullName: createdProfile.name || '',
          email: createdProfile.email || '',
        },
      })
      .then(({ error: notifyError }) => {
        if (notifyError) console.error('Registration notification email failed:', notifyError);
      });
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

  const signInWithGoogle = async (redirectPath: string = '/dashboard') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${redirectPath}`,
      },
    });
    if (error) throw error;
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
