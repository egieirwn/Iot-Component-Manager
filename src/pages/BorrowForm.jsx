import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, ShieldAlert } from 'lucide-react';
import { getStoredComponents, getStoredUser } from '../services/componentService';

export default function BorrowForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [component, setComponent] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const user = getStoredUser();

  const [formData, setFormData] = useState({
    quantity: '1',
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
    setErrorMsg('');

    const qty = parseInt(formData.quantity, 10);

    // Validasi kuantitas
    if (isNaN(qty) || qty < 1) {
      setErrorMsg('Jumlah pinjam harus berupa angka minimal 1 unit.');
      return;
    }

    if (qty > component.stock) {
      setErrorMsg(`Jumlah pinjam (${qty} unit) melebihi stok tersedia (${component.stock} unit).`);
      return;
    }

    if (!formData.purpose.trim()) {
      setErrorMsg('Tujuan peminjaman / deskripsi proyek wajib diisi.');
      return;
    }

    if (!formData.returnDate) {
      setErrorMsg('Tanggal rencana pengembalian wajib ditentukan.');
      return;
    }

    if (!formData.agreeTerms) {
      setErrorMsg('Anda wajib menyetujui pernyataan tata tertib laboratorium.');
      return;
    }

    // Teruskan data beserta profil peminjam ke halaman konfirmasi
    navigate('/borrow-confirmation', {
      state: {
        component,
        borrowData: {
          ...formData,
          quantity: qty,
          borrowerName: user.name,
          borrowerNim: user.nim,
          borrowerEmail: user.email,
          borrowerMajor: user.major
        }
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
          marginBottom: '1.5rem',
          backgroundColor: 'var(--color-bg-subtle)'
        }}
      >
        <img
          src={component.image}
          alt={component.name}
          style={{
            width: '80px',
            height: '80px',
            objectFit: 'contain',
            backgroundColor: '#1E293B',
            borderRadius: 'var(--radius-sm)',
            padding: '0.5rem'
          }}
        />
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{component.name}</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            {component.code} · {component.category} · Stok tersedia: <strong>{component.stock} unit</strong>
          </p>
          <small style={{ color: 'var(--color-text-secondary)' }}>
            Lokasi: {component.location}
          </small>
        </div>
      </div>

      {/* Borrower Identity Card */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2rem',
          padding: '1rem 1.5rem',
          borderLeft: '4px solid var(--color-primary)'
        }}
      >
        <User size={24} color="var(--color-primary)" />
        <div>
          <strong style={{ fontSize: '0.9375rem' }}>Peminjam: {user.name}</strong>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            NIM: {user.nim} · {user.major} · {user.email}
          </p>
        </div>
      </div>

      {/* Error Alert if any */}
      {errorMsg && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#B91C1C',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.875rem'
          }}
        >
          <ShieldAlert size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form Card */}
      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label
              htmlFor="quantity"
              style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}
            >
              Jumlah Pinjam (unit):
            </label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min="1"
              max={component.stock}
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
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
            <label
              htmlFor="projectName"
              style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}
            >
              Nama Proyek / Mata Kuliah Praktikum:
            </label>
            <input
              id="projectName"
              name="projectName"
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
            <label
              htmlFor="purpose"
              style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}
            >
              Tujuan Peminjaman / Deskripsi Proyek:
            </label>
            <textarea
              id="purpose"
              name="purpose"
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
            <label
              htmlFor="returnDate"
              style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}
            >
              Tanggal Rencana Pengembalian:
            </label>
            <input
              id="returnDate"
              name="returnDate"
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
            <label
              htmlFor="notes"
              style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}
            >
              Catatan Tambahan (opsional):
            </label>
            <textarea
              id="notes"
              name="notes"
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
              name="agreeTerms"
              checked={formData.agreeTerms}
              onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
              required
              style={{ marginTop: '0.25rem' }}
            />
            <label
              htmlFor="agreeTerms"
              style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
            >
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
