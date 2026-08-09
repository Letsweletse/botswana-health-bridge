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

    try {
      // Check admin via user_roles
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser.id)
        .eq('role', 'admin')
        .maybeSingle();

      const userIsAdmin = Boolean(adminRole);
      setIsAdmin(userIsAdmin);

      if (userIsAdmin) {
        setProfile({
          id: currentUser.id,
          email: currentUser.email || null,
          clinic_name: 'ChekaMeds Admin',
          contact: null,
          name: 'Admin',
          role: 'admin',
          approved: true,
          status: 'approved',
        });
        return;
      }

      // Load profile for non-admin
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, clinic_name, contact, name, role, approved, status')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile lookup failed:', profileError);
        // CRITICAL: if profile lookup fails, check if role=admin in profiles table directly
        // This prevents getting kicked out due to RLS issues
        const { data: profileRole } = await supabase
          .from('profiles')
          .select('role, approved')
          .eq('id', currentUser.id)
          .maybeSingle();
        
        if (profileRole?.role === 'admin') {
          setIsAdmin(true);
          setProfile({
            id: currentUser.id,
            email: currentUser.email || null,
            clinic_name: 'ChekaMeds Admin',
            contact: null,
            name: 'Admin',
            role: 'admin',
            approved: true,
            status: 'approved',
          });
        }
        return;
      }

      if (existingProfile) {
        // Also check if profile role is admin
        if (existingProfile.role === 'admin') {
          setIsAdmin(true);
        }
        setProfile(existingProfile);
        return;
      }

      // First sign-in: create pending profile
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
        .catch((e) => console.error('Registration notification failed:', e));

    } catch (err) {
      console.error('loadProfile error:', err);
    }
  };

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        await loadProfile(newSession?.user ?? null);
        if (mounted) setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      await loadProfile(currentSession?.user ?? null);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
  };

  const signInWithGoogle = async (redirectPath: string = '/dashboard') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${redirectPath}` },
    });
    if (error) throw error;
  };

  return { user, session, profile, isAdmin, loading, signOut, signInWithGoogle };
}
