import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { signIn, refreshProfile } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [unconfirmedEmail, setUnconfirmedEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      newErrors.email = 'Email kampus wajib diisi.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Format email tidak valid (contoh: nama@un.ac.id).';
    }

    if (!password) {
      newErrors.password = 'Kata sandi wajib diisi.';
    } else if (password.length < 6) {
      newErrors.password = 'Kata sandi minimal 6 karakter.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setServerError('');
    setUnconfirmedEmail('');

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await signIn({
        email,
        password
      });

      if (error) {
        const msg = error.message?.toLowerCase() || '';
        if (msg.includes('email not confirmed')) {
          setUnconfirmedEmail(email.trim());
          setServerError('Alamat email belum diverifikasi. Silakan periksa inbox email Anda.');
        } else if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
          setServerError('Email atau kata sandi yang Anda masukkan salah. Silakan coba lagi.');
        } else {
          setServerError(error.message || 'Gagal masuk ke akun.');
        }
        return;
      }

      // Login berhasil, periksa kelengkapan profil
      const profile = await refreshProfile();
      toast.success('Selamat datang kembali! Berhasil masuk ke inventaris.');

      const targetPath = location.state?.from?.pathname || '/dashboard';
      if (profile && !profile.profile_completed) {
        navigate('/complete-profile', { replace: true });
      } else {
        navigate(targetPath, { replace: true });
      }
    } catch (err) {
      setServerError(err.message || 'Terjadi gangguan jaringan saat menghubungkan ke server.');
    } finally {
      setIsSubmitting(false);
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
      {/* Top Header */}
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

      {/* Login Card */}
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
            maxWidth: '460px',
            padding: '2.5rem',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Masuk ke inventori IoT
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
            Gunakan akun kampus Universitas untuk mengakses komponen IoT.
          </p>

          {serverError && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.375rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={18} />
                <span>{serverError}</span>
              </div>
              {unconfirmedEmail && (
                <Link
                  to={`/verify-email?email=${encodeURIComponent(unconfirmedEmail)}`}
                  style={{
                    color: 'var(--color-primary)',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    fontSize: '0.8125rem',
                    marginLeft: '1.625rem'
                  }}
                >
                  Buka halaman verifikasi email &raquo;
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleLogin} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label htmlFor="login-email" className="form-label">
                Email kampus *
              </label>
              <input
                id="login-email"
                type="email"
                placeholder="nama@un.ac.id"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                className={`form-input ${errors.email ? 'has-error' : ''}`}
                disabled={isSubmitting}
              />
              {errors.email && (
                <span className="error-text">
                  <AlertCircle size={14} /> {errors.email}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="form-label">
                Kata sandi *
              </label>
              <input
                id="login-password"
                type="password"
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                }}
                className={`form-input ${errors.password ? 'has-error' : ''}`}
                disabled={isSubmitting}
              />
              {errors.password && (
                <span className="error-text">
                  <AlertCircle size={14} /> {errors.password}
                </span>
              )}
              <div style={{ textAlign: 'right', marginTop: '0.375rem' }}>
                <Link to="/forgot-password" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)' }}>
                  Lupa kata sandi?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '0.75rem' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" style={{ marginRight: '0.5rem' }} /> Memvalidasi...
                </>
              ) : (
                'Masuk'
              )}
            </button>
          </form>

          <div
            style={{
              backgroundColor: 'var(--color-bg-subtle)',
              padding: '0.875rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              color: 'var(--color-text-secondary)',
              marginTop: '1.5rem',
              lineHeight: 1.4
            }}
          >
            Peminjaman komponen IoT memerlukan akun terverifikasi dengan profil lengkap.
          </div>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Belum punya akun?{' '}
            <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              Daftar untuk mengakses inventori IoT
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
