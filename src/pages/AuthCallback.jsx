import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const { refreshProfile } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let mounted = true;

    const processAuth = async () => {
      try {
        if (!isSupabaseConfigured()) {
          navigate('/dashboard', { replace: true });
          return;
        }

        // Cek tipe alur (misal recovery password)
        const type = searchParams.get('type');
        const hash = window.location.hash;

        if (type === 'recovery' || hash.includes('type=recovery')) {
          navigate('/reset-password', { replace: true });
          return;
        }

        // Ambil session dari URL jika ada code exchange atau hash token
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!session?.user) {
          // Tunggu sebentar untuk onAuthStateChange jika Supabase sedang memproses URL hash
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            if (currentSession?.user) {
              subscription.unsubscribe();
              const profile = await refreshProfile();
              if (profile?.profile_completed) {
                toast.success('Autentikasi berhasil! Selamat datang.');
                navigate('/dashboard', { replace: true });
              } else {
                toast.info('Email terverifikasi. Silakan lengkapi data profil kampus Anda.');
                navigate('/complete-profile', { replace: true });
              }
            }
          });

          // Timeout 4 detik jika token tidak valid atau expired
          setTimeout(() => {
            if (mounted && !errorMsg) {
              setErrorMsg('Sesi autentikasi tidak ditemukan atau tautan verifikasi telah kedaluwarsa.');
            }
          }, 4000);
          return;
        }

        // Session valid
        const profile = await refreshProfile();
        if (profile?.profile_completed) {
          toast.success('Autentikasi berhasil! Selamat datang kembali.');
          navigate('/dashboard', { replace: true });
        } else {
          toast.info('Email berhasil diverifikasi! Silakan lengkapi data profil kampus Anda.');
          navigate('/complete-profile', { replace: true });
        }
      } catch (err) {
        if (mounted) {
          setErrorMsg(err.message || 'Gagal memproses tautan autentikasi.');
        }
      }
    };

    processAuth();

    return () => {
      mounted = false;
    };
  }, [navigate, searchParams, refreshProfile, toast]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg-app)',
        padding: '2rem'
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '460px',
          width: '100%',
          textAlign: 'center',
          padding: '2.5rem',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {errorMsg ? (
          <div>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem'
              }}
            >
              <AlertCircle size={32} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              Autentikasi Gagal
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              {errorMsg}
            </p>
            <button
              type="button"
              className="btn-primary"
              style={{ width: '100%' }}
              onClick={() => navigate('/login', { replace: true })}
            >
              Kembali ke Halaman Masuk
            </button>
          </div>
        ) : (
          <div>
            <span
              className="spinner spinner-primary"
              style={{ width: '2.5rem', height: '2.5rem', marginBottom: '1.25rem' }}
            />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Memverifikasi Akun Anda...
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              Harap tunggu sebentar, kami sedang menyiapkan sesi aman Anda.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
