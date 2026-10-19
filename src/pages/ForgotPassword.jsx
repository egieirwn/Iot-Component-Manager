import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('akira.tomoe@un.ac.id');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
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
            maxWidth: '460px',
            padding: '2.5rem',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Atur ulang kata sandi
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
            Masukkan email kampus Universitas untuk menerima tautan reset yang aman.
          </p>

          {submitted ? (
            <div
              style={{
                backgroundColor: 'var(--status-available-bg)',
                color: 'var(--status-available-text)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                marginBottom: '1.5rem',
                lineHeight: 1.5
              }}
            >
              Tautan reset telah dikirimkan ke <strong>{email}</strong>. Silakan periksa kotak masuk email Anda.
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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

              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
                Kirim tautan reset
              </button>
            </form>
          )}

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
            <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              Kembali ke halaman masuk
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
