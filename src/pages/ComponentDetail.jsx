import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Bell, CheckCircle, AlertCircle } from 'lucide-react';
import StatusBadge from '../components/components/StatusBadge';
import { useToast } from '../components/common/Toast';
import { fetchComponentById } from '../services/componentService';

export default function ComponentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [component, setComponent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetchComponentById(id)
      .then((data) => {
        if (isMounted) {
          setComponent(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoading(false);
          navigate('/components');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  if (isLoading || !component) {
    return (
      <div className="component-detail-page" aria-busy="true">
        <div className="skeleton" style={{ width: '200px', height: '24px', marginBottom: '1.5rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '2rem' }}>
          <div className="skeleton-card" style={{ height: '380px' }}>
            <div className="skeleton" style={{ width: '60%', height: '32px' }} />
            <div className="skeleton" style={{ width: '100%', height: '200px' }} />
          </div>
          <div className="skeleton-card" style={{ height: '220px' }}>
            <div className="skeleton" style={{ width: '50%', height: '24px' }} />
            <div className="skeleton" style={{ width: '100%', height: '80px' }} />
          </div>
        </div>
      </div>
    );
  }

  const isAvailable = component.status === 'TERSEDIA' && component.stock > 0;

  return (
    <div className="component-detail-page">
      {/* Breadcrumb / Back Link */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link
          to="/components"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--color-text-secondary)',
            fontSize: '0.875rem',
            fontWeight: 500
          }}
        >
          <ArrowLeft size={16} /> Kembali ke Katalog Komponen
        </Link>
      </div>

      {/* Component Title Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2rem'
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
            {component.name}
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
            {component.code} · {component.category}
          </p>
        </div>

        <StatusBadge status={component.status} />
      </div>

      {/* Layout Grid: Left (About + Specs + Loan History), Right (Availability + Action) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Tentang komponen ini */}
          <div className="card">
            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <div
                style={{
                  backgroundColor: '#27272A',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '200px'
                }}
              >
                <img
                  src={component.image}
                  alt={component.name}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              </div>

              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                  Tentang komponen ini
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                  {component.description}
                </p>

                {/* Tags */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {component.tags?.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        padding: '0.2rem 0.6rem',
                        backgroundColor: 'var(--color-bg-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--color-text-secondary)'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                  <MapPin size={16} />
                  <span>Lokasi: {component.location}</span>
                </div>
              </div>
            </div>

            {/* Spesifikasi Sub-section */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
                Spesifikasi
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {component.specs &&
                  Object.entries(component.specs).map(([key, value]) => (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingBottom: '0.5rem',
                        borderBottom: '1px solid #F1F5F9',
                        fontSize: '0.875rem'
                      }}
                    >
                      <span style={{ color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                        {key}
                      </span>
                      <strong style={{ color: 'var(--color-text-main)' }}>{value}</strong>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Riwayat Peminjaman Card */}
          <div className="card">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>
              Riwayat peminjaman
            </h3>
            {(!component.loanHistory || component.loanHistory.length === 0) ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                Belum ada riwayat peminjaman untuk komponen ini.
              </p>
            ) : (
              <table className="custom-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th scope="col">Peminjam</th>
                    <th scope="col">Dipinjam</th>
                    <th scope="col">Dikembalikan</th>
                    <th scope="col">Kondisi</th>
                  </tr>
                </thead>
                <tbody>
                  {component.loanHistory.map((lh, idx) => (
                    <tr key={idx}>
                      <td><strong>{lh.borrower}</strong></td>
                      <td>{lh.borrowDate}</td>
                      <td>{lh.returnDate}</td>
                      <td>{lh.condition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Availability & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Card Ketersediaan */}
          <div className="card">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Ketersediaan
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9375rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Stok</span>
                <strong>{component.stock} unit</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9375rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Kondisi</span>
                <strong>{component.condition}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9375rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Status</span>
                <StatusBadge status={component.status} />
              </div>
            </div>

            {isAvailable ? (
              <Link
                to={`/borrow/${component.id}`}
                className="btn-primary"
                style={{ width: '100%', textAlign: 'center' }}
              >
                Ajukan Peminjaman
              </Link>
            ) : (
              <button
                type="button"
                className="btn-outline"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                onClick={() => toast.info(`Pengingat diset untuk ${component.name}. Anda akan diberitahu jika stok kembali tersedia.`)}
              >
                <Bell size={18} /> Ingatkan saat tersedia
              </button>
            )}
          </div>

          {/* Borrow Status Alert Info */}
          {!isAvailable && (
            <div
              style={{
                backgroundColor: 'var(--status-borrowed-bg)',
                border: '1px solid #FED7AA',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem'
              }}
            >
              <div style={{ marginBottom: '0.5rem' }}>
                <StatusBadge status="DIPINJAM" />
              </div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--status-borrowed-text)', marginBottom: '0.375rem' }}>
                Saat ini dipinjam oleh {component.borrowerInfo?.borrower || 'peminjam lain'}, jatuh tempo {component.borrowerInfo?.dueDate || 'segera'}
              </h4>
              <p style={{ fontSize: '0.8125rem', color: '#9A3412', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                {component.borrowerInfo?.notes || 'Belum tersedia untuk dipinjam. Jelajahi komponen lain yang tersedia.'}
              </p>
              <small style={{ color: '#9A3412' }}>
                Belum bisa diajukan peminjaman sampai komponen dikembalikan ke lab.
              </small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
