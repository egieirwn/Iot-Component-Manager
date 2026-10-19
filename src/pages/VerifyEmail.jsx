import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';

export default function VerifyEmail() {
  const navigate = useNavigate();

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
              color: 'var(--color-text-secondary)'
            }}
          >
            <Mail size={28} />
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            Cek inbox
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '2rem' }}>
            Tautan verifikasi telah dikirim ke <strong>akira.tomoe@un.ac.id</strong>. Cek inbox atau folder spam untuk melanjutkan.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn-outline"
              style={{ width: '100%', padding: '0.75rem' }}
              onClick={() => alert('Email verifikasi baru telah dikirimkan ke kotak masuk Anda!')}
            >
              Kirim ulang email
            </button>

            <button
              type="button"
              className="btn-primary"
              style={{ width: '100%', padding: '0.75rem' }}
              onClick={() => navigate('/dashboard')}
            >
              Saya sudah verifikasi
            </button>
          </div>

          <p style={{ marginTop: '1.75rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Belum menerima email? Periksa alamat email kampus Anda.
          </p>
        </div>
      </div>
    </div>
  );
}
