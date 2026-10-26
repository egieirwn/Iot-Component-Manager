import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Mail, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { refreshProfile, isConfigured } = useAuth();

  const emailParam = searchParams.get('email') || '';
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Resend verification email
  const handleResend = async () => {
    if (!emailParam) {
      toast.error('Alamat email tidak ditemukan. Silakan lakukan pendaftaran ulang.');
      return;
    }

    setIsResending(true);
    setMessage('');
    setErrorMsg('');

    try {
      if (!isConfigured) {
        setTimeout(() => {
          setIsResending(false);
          setMessage('Email verifikasi baru berhasil dikirimkan ke ' + emailParam);
          toast.success('Email verifikasi simulasi telah dikirim.');
        }, 500);
        return;
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailParam,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        if (error.message?.toLowerCase().includes('rate limit')) {
          setErrorMsg('Terlalu banyak permintaan kirim ulang. Silakan tunggu 1-2 menit sebelum mencoba lagi.');
        } else {
          setErrorMsg(error.message || 'Gagal mengirim ulang email verifikasi.');
        }
      } else {
        setMessage(`Tautan verifikasi baru telah dikirim ke ${emailParam}.`);
        toast.success('Email verifikasi berhasil dikirim ulang!');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsResending(false);
    }
  };

  // Check if user is now verified
  const handleCheckVerification = async () => {
    setIsChecking(true);
    setMessage('');
    setErrorMsg('');

    try {
      if (!isConfigured) {
        navigate('/dashboard');
        return;
      }

      // Refresh Supabase session
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        // Belum ada session, minta user login atau klik link email
        setErrorMsg('Akun belum terdeteksi aktif. Silakan buka tautan di email Anda terlebih dahulu, atau coba masuk.');
        return;
      }

      if (!user.email_confirmed_at) {
        setErrorMsg('Email Anda belum terkonfirmasi di sistem. Silakan periksa inbox email Anda.');
        return;
      }

      // Email terkonfirmasi! Ambil profil
      const updatedProfile = await refreshProfile();
      toast.success('Email berhasil diverifikasi!');

      if (!updatedProfile || !updatedProfile.profile_completed) {
        navigate('/complete-profile');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setErrorMsg('Gagal memeriksa status verifikasi: ' + err.message);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <header
        style={{
          padding: '1.25rem 3rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}
      >
        <div className="logo-badge">U</div>
        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          <strong>Campus IoT · Universitas</strong> Inventaris Laboratorium
        </span>
      </header>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}
      >
        <div
          className="card"
          style={{
            width: '100%',
            maxWidth: '480px',
            padding: '2.5rem',
            textAlign: 'center',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              color: 'var(--color-primary)',
              backgroundColor: 'var(--color-primary-light)'
            }}
          >
            <Mail size={32} />
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            Periksa Kotak Masuk Email Anda
          </h1>

          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Tautan konfirmasi verifikasi telah dikirimkan ke:
            <br />
            <strong style={{ color: 'var(--color-text-main)', fontSize: '0.9375rem' }}>
              {emailParam || 'alamat email kampus Anda'}
            </strong>
          </p>

          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', marginBottom: '1.75rem', lineHeight: 1.5 }}>
            Klik tautan verifikasi pada email tersebut untuk mengaktifkan akun Anda. Periksa juga folder Spam atau Promosi jika email belum muncul.
          </p>

          {message && (
            <div
              style={{
                backgroundColor: 'var(--status-available-bg)',
                color: 'var(--status-available-text)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                textAlign: 'left'
              }}
            >
              <CheckCircle size={16} />
              <span>{message}</span>
            </div>
          )}

          {errorMsg && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                textAlign: 'left'
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn-primary"
              style={{ width: '100%', padding: '0.75rem' }}
              onClick={handleCheckVerification}
              disabled={isChecking}
            >
              {isChecking ? (
                <>
                  <span className="spinner" style={{ marginRight: '0.5rem' }} /> Memeriksa status...
                </>
              ) : (
                'Saya sudah klik link verifikasi'
              )}
            </button>

            <button
              type="button"
              className="btn-outline"
              style={{ width: '100%', padding: '0.75rem' }}
              onClick={handleResend}
              disabled={isResending}
            >
              {isResending ? (
                <>
                  <span className="spinner spinner-primary" style={{ marginRight: '0.5rem' }} /> Mengirim ulang...
                </>
              ) : (
                'Kirim ulang email verifikasi'
              )}
            </button>
          </div>

          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              Salah memasukkan alamat email?{' '}
              <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                Daftar ulang
              </Link>
              {' · '}
              <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                Masuk
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
