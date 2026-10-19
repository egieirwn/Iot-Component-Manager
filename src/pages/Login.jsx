import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('akira.tomoe@un.ac.id');
  const [password, setPassword] = useState('password123');

  const handleLogin = (e) => {
    e.preventDefault();
    navigate('/dashboard');
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
          <strong>Universitas</strong> Butuh bantuan? Hubungi lab support
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

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                Email kampus
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                Kata sandi
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  outline: 'none'
                }}
              />
              <div style={{ textAlign: 'right', marginTop: '0.375rem' }}>
                <Link to="/forgot-password" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)' }}>
                  Lupa kata sandi?
                </Link>
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
              Masuk
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
            Anda dapat mencoba lagi atau menghubungi lab support jika masalah berlanjut.
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
