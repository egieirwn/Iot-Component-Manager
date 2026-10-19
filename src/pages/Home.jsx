import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
      {/* Landing Navbar */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 4rem',
          borderBottom: '1px solid var(--color-border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="logo-badge">U</div>
          <strong style={{ fontSize: '1.125rem' }}>Campus IoT Inventory</strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/login" className="btn-outline">
            Masuk
          </Link>
          <Link to="/register" className="btn-primary">
            Daftar
          </Link>
        </div>
      </nav>

      {/* Hero Content */}
      <main
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '4rem 2rem',
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '3rem',
          alignItems: 'center'
        }}
      >
        <div>
          <span
            style={{
              display: 'inline-block',
              padding: '0.25rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-bg-subtle)',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--color-text-secondary)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '1.5rem'
            }}
          >
            Sistem Inventaris Laboratorium
          </span>

          <h1
            style={{
              fontSize: '2.75rem',
              fontWeight: 800,
              lineHeight: 1.15,
              color: 'var(--color-text-main)',
              marginBottom: '1.25rem'
            }}
          >
            Cari, pinjam, dan kembalikan komponen IoT dengan mudah.
          </h1>

          <p
            style={{
              fontSize: '1.125rem',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              marginBottom: '2rem'
            }}
          >
            Instrumen, sensor, mikrokontroler, dan peralatan lab terpusat untuk mahasiswa dan
            dosen Universitas.
          </p>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
            <Link to="/dashboard" className="btn-primary" style={{ padding: '0.75rem 2rem' }}>
              Masuk ke Dashboard
            </Link>
            <Link to="/components" className="btn-outline" style={{ padding: '0.75rem 2rem' }}>
              Jelajahi Komponen
            </Link>
          </div>

          <div style={{ display: 'flex', gap: '2rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Check size={16} color="var(--color-primary)" /> Ketersediaan langsung
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Check size={16} color="var(--color-primary)" /> Verifikasi kampus
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Check size={16} color="var(--color-primary)" /> Pengembalian mudah
            </span>
          </div>
        </div>

        {/* Hero Card */}
        <div
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div
            style={{
              backgroundColor: '#1E293B',
              padding: '2.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img
              src="/assets/images/arduino.png"
              alt="Arduino Uno R3"
              style={{ maxWidth: '100%', maxHeight: '280px', objectFit: 'contain' }}
            />
          </div>
          <div
            style={{
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)'
            }}
          >
            <span>Arduino Uno R3 · Foto produk resmi</span>
            <strong style={{ color: 'var(--color-text-main)' }}>8 jenis · 68 unit</strong>
          </div>
        </div>
      </main>
    </div>
  );
}
