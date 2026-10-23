import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

export default function BorrowModal({ component, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    borrowerName: '',
    nim: '',
    borrowDate: new Date().toISOString().split('T')[0],
    durationDays: '3',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.borrowerName.trim()) {
      newErrors.borrowerName = 'Nama peminjam wajib diisi!';
    } else if (formData.borrowerName.trim().length < 3) {
      newErrors.borrowerName = 'Nama minimal 3 karakter!';
    }

    if (!formData.nim.trim()) {
      newErrors.nim = 'NIM / ID Mahasiswa wajib diisi!';
    } else if (!/^\d+$/.test(formData.nim.trim())) {
      newErrors.nim = 'NIM harus berupa angka!';
    }

    if (!formData.borrowDate) {
      newErrors.borrowDate = 'Tanggal peminjaman wajib dipilih!';
    }

    if (!formData.durationDays || Number(formData.durationDays) <= 0) {
      newErrors.durationDays = 'Durasi peminjaman minimal 1 hari!';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    setTimeout(() => {
      const sanitizedData = {
        componentId: component.id,
        componentName: component.name,
        borrowerName: formData.borrowerName.trim(),
        nim: formData.nim.trim(),
        borrowDate: formData.borrowDate,
        durationDays: Number(formData.durationDays),
        notes: formData.notes.trim()
      };

      onSuccess(sanitizedData);
      setIsSubmitting(false);
      onClose();
    }, 600);
  };

  if (!component) return null;

  return (
    /* Latar Belakang Gelap Melayang (Overlay) */
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '1rem'
      }}
    >
      {/* Kotak Modal di Tengah Screen */}
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '500px',
          backgroundColor: 'var(--color-bg-surface, #ffffff)',
          borderRadius: 'var(--radius-lg, 12px)',
          padding: '1.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            borderBottom: '1px solid var(--color-border, #e2e8f0)',
            paddingBottom: '0.75rem'
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-main, #0f172a)' }}>
            Form Peminjaman Komponen
          </h3>
          <button
            onClick={onClose}
            type="button"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted, #64748b)',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Info Barang */}
        <div
          style={{
            marginBottom: '1.25rem',
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--color-bg-subtle, #f1f5f9)',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--color-border, #e2e8f0)'
          }}
        >
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary, #475569)' }}>
            Barang yang dipinjam: <strong style={{ color: 'var(--color-text-main, #0f172a)' }}>{component.name}</strong> ({component.code})
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Nama */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text-main)' }}>
              Nama Lengkap Peminjam *
            </label>
            <input
              type="text"
              name="borrowerName"
              value={formData.borrowerName}
              onChange={handleChange}
              placeholder="Masukkan nama lengkap"
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-md, 8px)',
                border: `1px solid ${errors.borrowerName ? '#EF4444' : 'var(--color-border, #cbd5e1)'}`,
                backgroundColor: errors.borrowerName ? '#FEF2F2' : 'var(--color-bg-subtle, #f8fafc)',
                outline: 'none'
              }}
            />
            {errors.borrowerName && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#DC2626', fontSize: '0.775rem', marginTop: '0.375rem' }}>
                <AlertCircle size={14} /> {errors.borrowerName}
              </span>
            )}
          </div>

          {/* NIM */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text-main)' }}>
              NIM / ID Mahasiswa *
            </label>
            <input
              type="text"
              name="nim"
              value={formData.nim}
              onChange={handleChange}
              placeholder="Contoh: 21120120140001"
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-md, 8px)',
                border: `1px solid ${errors.nim ? '#EF4444' : 'var(--color-border, #cbd5e1)'}`,
                backgroundColor: errors.nim ? '#FEF2F2' : 'var(--color-bg-subtle, #f8fafc)',
                outline: 'none'
              }}
            />
            {errors.nim && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#DC2626', fontSize: '0.775rem', marginTop: '0.375rem' }}>
                <AlertCircle size={14} /> {errors.nim}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Tanggal Pinjam */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text-main)' }}>
                Tanggal Pinjam *
              </label>
              <input
                type="date"
                name="borrowDate"
                value={formData.borrowDate}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: `1px solid ${errors.borrowDate ? '#EF4444' : 'var(--color-border, #cbd5e1)'}`,
                  backgroundColor: 'var(--color-bg-subtle, #f8fafc)',
                  outline: 'none'
                }}
              />
            </div>

            {/* Durasi */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text-main)' }}>
                Durasi (Hari) *
              </label>
              <input
                type="number"
                name="durationDays"
                min="1"
                max="14"
                value={formData.durationDays}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: `1px solid ${errors.durationDays ? '#EF4444' : 'var(--color-border, #cbd5e1)'}`,
                  backgroundColor: 'var(--color-bg-subtle, #f8fafc)',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Catatan */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text-main)' }}>
              Keperluan / Catatan
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Contoh: Untuk tugas praktikum IoT"
              rows="3"
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid var(--color-border, #cbd5e1)',
                backgroundColor: 'var(--color-bg-subtle, #f8fafc)',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Tombol Aksi */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn-outline" onClick={onClose} disabled={isSubmitting}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Proses Ajuan...' : 'Konfirmasi Pinjam'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}