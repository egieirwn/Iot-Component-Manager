import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getStoredComponents, getStoredUser } from '../services/componentService';

export default function BorrowForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [component, setComponent] = useState(null);
  const user = getStoredUser();

  const [formData, setFormData] = useState({
    quantity: 1,
    projectName: 'Praktikum Sistem Tertanam & IoT',
    purpose: '',
    returnDate: '',
    notes: '',
    agreeTerms: false
  });

  useEffect(() => {
    const list = getStoredComponents();
    const found = list.find((c) => c.id === id);
    if (found) {
      setComponent(found);
    } else {
      navigate('/components');
    }
  }, [id, navigate]);

  if (!component) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.agreeTerms) {
      alert('Harap setujui syarat dan tata tertib laboratorium.');
      return;
    }

    // Pass data via router state to confirmation page
    navigate('/borrow-confirmation', {
      state: {
        component,
        borrowData: formData
      }
    });
  };

  return (
    <div className="borrow-form-page" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          to={`/components/${component.id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--color-text-secondary)',
            fontSize: '0.875rem'
          }}
        >
          <ArrowLeft size={16} /> Batal dan Kembali ke Detail Komponen
        </Link>
      </div>

      <div className="dashboard-header-title" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Form Peminjaman Komponen</h1>
        <p>Lengkapi formulir permohonan peminjaman perangkat laboratorium di bawah ini.</p>
      </div>

      {/* Selected Component Summary Banner */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          marginBottom: '2rem',
          backgroundColor: 'var(--color-bg-subtle)'
        }}
      >
        <img
          src={component.image}
          alt={component.name}
          style={{ width: '80px', height: '80px', objectFit: 'contain', backgroundColor: '#1E293B', borderRadius: 'var(--radius-sm)', padding: '0.5rem' }}
        />
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{component.name}</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            {component.code} · {component.category} · Stok tersedia: <strong>{component.stock} unit</strong>
          </p>
          <small style={{ color: 'var(--color-text-secondary)' }}>
            Lokasi: {component.location}
          </small>
        </div>
      </div>

      {/* Form Card */}
      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Jumlah Pinjam (unit):
            </label>
            <input
              type="number"
              min="1"
              max={component.stock}
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              required
              style={{
                width: '100%',
                padding: '0.625rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                outline: 'none'
              }}
            />
            <small style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem', display: 'block' }}>
              Maksimal {component.stock} unit sesuai sisa stok inventaris.
            </small>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Nama Proyek / Mata Kuliah Praktikum:
            </label>
            <input
              type="text"
              placeholder="Contoh: Praktikum Sistem Tertanam & IoT"
              value={formData.projectName}
              onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '0.625rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Tujuan Peminjaman / Deskripsi Proyek:
            </label>
            <textarea
              rows="4"
              placeholder="Jelaskan kebutuhan pengujian atau perangkat keras yang akan dibangun..."
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '0.625rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Tanggal Rencana Pengembalian:
            </label>
            <input
              type="date"
              value={formData.returnDate}
              onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '0.625rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Catatan Tambahan (opsional):
            </label>
            <textarea
              rows="3"
              placeholder="Catatan kelengkapan kabel, pin header, atau modul pendukung..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={{
                width: '100%',
                padding: '0.625rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', paddingTop: '0.5rem' }}>
            <input
              type="checkbox"
              id="agreeTerms"
              checked={formData.agreeTerms}
              onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
              required
              style={{ marginTop: '0.25rem' }}
            />
            <label htmlFor="agreeTerms" style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              Saya menyatakan bertanggung jawab penuh atas pemeliharaan dan pengembalian komponen ini sesuai dengan tata tertib laboratorium.
            </label>
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
            Lanjut ke Konfirmasi
          </button>
        </form>
      </div>
    </div>
  );
}
