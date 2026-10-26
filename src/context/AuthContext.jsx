import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { currentUser as mockUser } from '../data/mockData';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isSupabaseConfigured();

  // Ambil profil dari database Supabase
  const fetchProfile = useCallback(async (userId, userMetadata = {}) => {
    if (!isConfigured || !userId) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Gagal mengambil data profil:', error.message);
      }

      if (data) {
        setProfile(data);
        return data;
      }

      // Jika data profil belum ada (misal pendaftaran baru sebelum trigger selesai)
      const fallbackProfile = {
        id: userId,
        full_name: userMetadata?.full_name || '',
        role: 'mahasiswa',
        requested_role: userMetadata?.requested_role || null,
        role_request_status: userMetadata?.requested_role === 'dosen' ? 'pending' : 'none',
        identity_number: '',
        study_program: '',
        faculty: '',
        phone: '',
        profile_completed: false
      };

      const { data: insertedData, error: insertError } = await supabase
        .from('profiles')
        .insert(fallbackProfile)
        .select()
        .maybeSingle();

      if (insertError) {
        console.warn('Fallback insert profile notice (trigger mungkin sudah membuat profile):', insertError.message);
        // Jika insert gagal karena trigger handle_new_user sudah selesai di background, ambil ulang data
        const { data: retryProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (retryProfile) {
          setProfile(retryProfile);
          return retryProfile;
        }
      }

      const finalProfile = insertedData || fallbackProfile;
      setProfile(finalProfile);
      return finalProfile;
    } catch (err) {
      console.error('Error saat fetchProfile:', err);
      return null;
    }
  }, [isConfigured]);

  // Inisialisasi Auth & Listener
  useEffect(() => {
    if (!isConfigured) {
      // Mode offline / demo lokal ketika Supabase belum dikonfigurasi
      const localProfile = {
        id: 'local-mock-user-001',
        full_name: mockUser.name,
        email: mockUser.email,
        identity_number: mockUser.nim,
        study_program: mockUser.major,
        faculty: 'Fakultas Ilmu Komputer',
        phone: '081234567890',
        role: 'mahasiswa',
        role_request_status: 'none',
        profile_completed: true
      };
      setUser({ id: 'local-mock-user-001', email: mockUser.email });
      setProfile(localProfile);
      setLoading(false);
      return;
    }

    let mounted = true;

    // 1. Ambil session aktif saat ini
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user || null);

      if (currentSession?.user) {
        fetchProfile(currentSession.user.id, currentSession.user.user_metadata).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // 2. Pasang auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user || null);

      if (currentSession?.user) {
        await fetchProfile(currentSession.user.id, currentSession.user.user_metadata);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isConfigured, fetchProfile]);

  // Method Registrasi
  const signUp = async ({ email, password, fullName, requestedRole = 'mahasiswa' }) => {
    if (!isConfigured) {
      return { data: { user: { email } }, error: null };
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          requested_role: requestedRole
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    return { data, error };
  };

  // Method Login
  const signIn = async ({ email, password }) => {
    if (!isConfigured) {
      return { data: { user: { email } }, error: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (data?.user) {
      await fetchProfile(data.user.id, data.user.user_metadata);
    }

    return { data, error };
  };

  // Method Logout
  const signOut = async () => {
    if (isConfigured) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  // Perbarui Data Profil di Database
  const updateUserProfile = async (updates) => {
    if (!isConfigured) {
      setProfile((prev) => ({ ...prev, ...updates }));
      return { data: { ...profile, ...updates }, error: null };
    }

    if (!user) {
      return { data: null, error: new Error('User belum terautentikasi') };
    }

    // Hindari pembaruan field sensitif role melalui client update biasa
    const { role, requested_role, role_request_status, ...safeUpdates } = updates;

    const { data, error } = await supabase
      .from('profiles')
      .update(safeUpdates)
      .eq('id', user.id)
      .select()
      .maybeSingle();

    if (!error && data) {
      setProfile(data);
    }

    return { data, error };
  };

  // Perbarui Email Akun
  const updateUserEmail = async (newEmail) => {
    if (!isConfigured) {
      setProfile((prev) => ({ ...prev, email: newEmail }));
      return { data: {}, error: null };
    }

    const { data, error } = await supabase.auth.updateUser(
      { email: newEmail.trim() },
      { emailRedirectTo: `${window.location.origin}/auth/callback` }
    );

    return { data, error };
  };

  // Permintaan Reset Password
  const resetPassword = async (email) => {
    if (!isConfigured) {
      return { data: {}, error: null };
    }

    const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`
    });

    return { data, error };
  };

  // Perbarui Password Baru (setelah recovery redirect)
  const updatePassword = async (newPassword) => {
    if (!isConfigured) {
      return { data: {}, error: null };
    }

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    return { data, error };
  };

  const refreshProfile = async () => {
    if (user) {
      return await fetchProfile(user.id, user.user_metadata);
    }
    return null;
  };

  const value = {
    session,
    user,
    profile,
    loading,
    isConfigured,
    signUp,
    signIn,
    signOut,
    updateUserProfile,
    updateUserEmail,
    resetPassword,
    updatePassword,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
