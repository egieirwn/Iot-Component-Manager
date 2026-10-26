import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, User, Mail, Lock, ShieldCheck, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';

export default function Register() {
  const navigate = useNavigate();
  const toast = useToast();
  const { signUp, isConfigured } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [roleType, setRoleType] = useState('mahasiswa'); // 'mahasiswa' | 'dosen'
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // Password Requirement Indicators
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const hasNumberAndSymbol = hasNumber && hasSymbol;
  const isConfirmMatch = confirmPassword.length > 0 && confirmPassword === password;

  const validate = () => {
    const newErrors = {};
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      newErrors.fullName = 'Nama lengkap wajib diisi.';
    } else if (trimmedName.length < 3) {
      newErrors.fullName = 'Nama lengkap minimal 3 karakter.';
    }

    if (!trimmedEmail) {
      newErrors.email = 'Email kampus wajib diisi.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Format email tidak valid (contoh: nama@un.ac.id).';
    }

    if (!password) {
      newErrors.password = 'Kata sandi wajib diisi.';
    } else if (password.length < 8) {
      newErrors.password = 'Kata sandi minimal 8 karakter.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Ulangi kata sandi Anda.';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Kata sandi konfirmasi tidak cocok.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await signUp({
        email,
        password,
        fullName,
        requestedRole: roleType
      });

      if (error) {
        if (error.message?.toLowerCase().includes('already registered')) {
          setServerError('Alamat email ini sudah terdaftar. Silakan masuk atau gunakan fitur lupa kata sandi.');
        } else if (
          error.message?.toLowerCase().includes('rate limit') ||
          error.message?.toLowerCase().includes('security purposes') ||
          error.message?.toLowerCase().includes('over_email_send_rate_limit')
        ) {
          setServerError(
            'Batas pendaftaran Supabase tercapai (Rate Limit). Untuk testing bebas limit: matikan opsi "Confirm email" di Supabase Dashboard (Authentication > Providers > Email).'
          );
        } else {
          setServerError(error.message || 'Terjadi kesalahan saat pendaftaran akun.');
        }
        return;
      }

      toast.success('Pendaftaran akun berhasil! Silakan periksa email untuk verifikasi.');
      navigate(`/verify-email?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      setServerError(err.message || 'Gagal menghubungi server autentikasi.');
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

      {/* Register Card */}
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
            maxWidth: '500px',
            padding: '2.5rem',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Buat akun inventori IoT
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Daftar menggunakan email institusi kampus Anda.
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
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <AlertCircle size={18} />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleRegister} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {/* Nama Lengkap */}
            <div className="form-group">
              <label htmlFor="reg-name" className="form-label">
                Nama lengkap *
              </label>
              <input
                id="reg-name"
                type="text"
                placeholder="Contoh: Akira Tomoe"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
                }}
                className={`form-input ${errors.fullName ? 'has-error' : ''}`}
                disabled={isSubmitting}
              />
              {errors.fullName && (
                <span className="error-text">
                  <AlertCircle size={14} /> {errors.fullName}
                </span>
              )}
            </div>

            {/* Email Kampus */}
            <div className="form-group">
              <label htmlFor="reg-email" className="form-label">
                Email kampus *
              </label>
              <input
                id="reg-email"
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

            {/* Pilihan Peran Akun */}
            <div className="form-group">
              <label className="form-label">Tipe akun kampus *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setRoleType('mahasiswa')}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${roleType === 'mahasiswa' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    backgroundColor: roleType === 'mahasiswa' ? 'var(--color-primary-light)' : 'transparent',
                    color: roleType === 'mahasiswa' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    textAlign: 'center',
                    cursor: 'pointer'
                  }}
                >
                  Mahasiswa
                </button>
                <button
                  type="button"
                  onClick={() => setRoleType('dosen')}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${roleType === 'dosen' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    backgroundColor: roleType === 'dosen' ? 'var(--color-primary-light)' : 'transparent',
                    color: roleType === 'dosen' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    textAlign: 'center',
                    cursor: 'pointer'
                  }}
                >
                  Dosen / Peneliti
                </button>
              </div>
              {roleType === 'dosen' && (
                <p style={{ fontSize: '0.75rem', color: '#B45309', backgroundColor: '#FEF3C7', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem' }}>
                  ℹ️ Permintaan peran Dosen akan ditinjau oleh Administrator Lab sebelum hak akses khusus diaktifkan.
                </p>
              )}
            </div>

            {/* Kata Sandi */}
            <div className="form-group">
              <label htmlFor="reg-password" className="form-label">
                Kata sandi *
              </label>
              <input
                id="reg-password"
                type="password"
                placeholder="Minimal 8 karakter"
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
            </div>

            {/* Konfirmasi Kata Sandi */}
            <div className="form-group">
              <label htmlFor="reg-confirmPassword" className="form-label">
                Konfirmasi kata sandi *
              </label>
              <input
                id="reg-confirmPassword"
                type="password"
                placeholder="Ulangi kata sandi"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }}
                className={`form-input ${errors.confirmPassword ? 'has-error' : ''}`}
                disabled={isSubmitting}
              />
              {errors.confirmPassword && (
                <span className="error-text">
                  <AlertCircle size={14} /> {errors.confirmPassword}
                </span>
              )}
            </div>

            {/* Dynamic Password Requirements Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8125rem', marginTop: '-0.25rem', marginBottom: '0.25rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: hasMinLength ? '#16A34A' : 'var(--color-text-muted)',
                  fontWeight: hasMinLength ? 600 : 400,
                  transition: 'color 0.2s ease, font-weight 0.2s ease'
                }}
              >
                {hasMinLength ? (
                  <Check size={14} strokeWidth={2.5} color="#16A34A" />
                ) : (
                  <span style={{ display: 'inline-block', width: '14px', textAlign: 'center', fontSize: '0.75rem', lineHeight: 1 }}>○</span>
                )}
                <span>Minimal 8 karakter</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: hasNumberAndSymbol ? '#16A34A' : 'var(--color-text-muted)',
                  fontWeight: hasNumberAndSymbol ? 600 : 400,
                  transition: 'color 0.2s ease, font-weight 0.2s ease'
                }}
              >
                {hasNumberAndSymbol ? (
                  <Check size={14} strokeWidth={2.5} color="#16A34A" />
                ) : (
                  <span style={{ display: 'inline-block', width: '14px', textAlign: 'center', fontSize: '0.75rem', lineHeight: 1 }}>○</span>
                )}
                <span>Disarankan menyertakan angka dan simbol</span>
              </div>

              {confirmPassword.length > 0 && !errors.confirmPassword && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: isConfirmMatch ? '#16A34A' : '#DC2626',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    marginTop: '0.125rem',
                    transition: 'color 0.2s ease'
                  }}
                >
                  {isConfirmMatch ? (
                    <>
                      <Check size={14} strokeWidth={2.5} color="#16A34A" />
                      <span>Konfirmasi kata sandi cocok</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={14} color="#DC2626" />
                      <span>Konfirmasi kata sandi belum cocok</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '0.75rem' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" style={{ marginRight: '0.5rem' }} /> Memproses pendaftaran...
                </>
              ) : (
                'Daftar'
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Sudah punya akun?{' '}
            <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              Masuk
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
