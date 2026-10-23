import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { processBorrowing } from '../../services/componentService';
import { useToast } from '../common/Toast';

export default function BorrowModal({ component, onClose, onSuccess }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    borrowerName: '',
    nim: '',
    quantity: '1',
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
    const trimmedName = formData.borrowerName.trim();
    const trimmedNim = formData.nim.trim();
    const qtyNum = Number(formData.quantity);
    const durationNum = Number(formData.durationDays);

    if (!trimmedName) {
      newErrors.borrowerName = 'Nama peminjam wajib diisi!';
    } else if (trimmedName.length < 3) {
      newErrors.borrowerName = 'Nama peminjam minimal 3 karakter!';
    }

    if (!trimmedNim) {
      newErrors.nim = 'NIM / ID Mahasiswa wajib diisi!';
    } else if (!/^\d+$/.test(trimmedNim)) {
      newErrors.nim = 'NIM harus berupa angka!';
    }

    if (!formData.quantity || isNaN(qtyNum) || qtyNum < 1) {
      newErrors.quantity = 'Jumlah pinjam minimal 1 unit!';
    } else if (qtyNum > component.stock) {
      newErrors.quantity = `Jumlah pinjam melebihi sisa stok (${component.stock} unit)!`;
    }

    if (!formData.borrowDate) {
      newErrors.borrowDate = 'Tanggal peminjaman wajib dipilih!';
    }

    if (!formData.durationDays || isNaN(durationNum) || durationNum <= 0) {
      newErrors.durationDays = 'Durasi peminjaman minimal 1 hari!';
    } else if (durationNum > 30) {
      newErrors.durationDays = 'Maksimal durasi peminjaman adalah 30 hari!';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const sanitizedPayload = {
        componentId: component.id,
        componentName: component.name,
        componentCode: component.code,
        borrowerName: formData.borrowerName.trim(),
        nim: formData.nim.trim(),
        quantity: Number(formData.quantity),
        borrowDate: formData.borrowDate,
        durationDays: Number(formData.durationDays),
        notes: formData.notes.trim()
      };

      const result = await processBorrowing(sanitizedPayload);
      if (result.success) {
        toast.success(`Peminjaman ${sanitizedPayload.quantity} unit ${component.name} berhasil dicatat!`);
        if (onSuccess) {
          onSuccess(result);
        }
        onClose();
      }
    } catch (err) {
      toast.error(err.message || 'Gagal memproses transaksi peminjaman.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!component) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-container">
        {/* Header Modal */}
        <div className="modal-header">
          <h3 id="modal-title" style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
            Form Peminjaman Komponen
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="toast-close-btn"
            aria-label="Tutup form peminjaman"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info Barang */}
        <div
          style={{
            marginBottom: '1.25rem',
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--color-bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)'
          }}
        >
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Barang yang dipinjam: <strong style={{ color: 'var(--color-text-main)' }}>{component.name}</strong> ({component.code})
          </p>
          <small style={{ color: 'var(--color-text-muted)' }}>
            Sisa stok tersedia: <strong>{component.stock} unit</strong> · Lokasi: {component.location || 'Lab IoT'}
          </small>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Nama Peminjam */}
          <div className="form-group">
            <label htmlFor="modal-borrowerName" className="form-label">
              Nama Lengkap Peminjam *
            </label>
            <input
              id="modal-borrowerName"
              type="text"
              name="borrowerName"
              value={formData.borrowerName}
              onChange={handleChange}
              placeholder="Masukkan nama lengkap peminjam"
              className={`form-input ${errors.borrowerName ? 'has-error' : ''}`}
              disabled={isSubmitting}
            />
            {errors.borrowerName && (
              <span className="error-text">
                <AlertCircle size={14} /> {errors.borrowerName}
              </span>
            )}
          </div>

          {/* NIM */}
          <div className="form-group">
            <label htmlFor="modal-nim" className="form-label">
              NIM / ID Mahasiswa *
            </label>
            <input
              id="modal-nim"
              type="text"
              name="nim"
              value={formData.nim}
              onChange={handleChange}
              placeholder="Contoh: 2210511045"
              className={`form-input ${errors.nim ? 'has-error' : ''}`}
              disabled={isSubmitting}
            />
            {errors.nim && (
              <span className="error-text">
                <AlertCircle size={14} /> {errors.nim}
              </span>
            )}
          </div>

          {/* Kuantitas Pinjam */}
          <div className="form-group">
            <label htmlFor="modal-quantity" className="form-label">
              Jumlah Pinjam (unit) *
            </label>
            <input
              id="modal-quantity"
              type="number"
              name="quantity"
              min="1"
              max={component.stock}
              value={formData.quantity}
              onChange={handleChange}
              className={`form-input ${errors.quantity ? 'has-error' : ''}`}
              disabled={isSubmitting}
            />
            {errors.quantity ? (
              <span className="error-text">
                <AlertCircle size={14} /> {errors.quantity}
              </span>
            ) : (
              <small style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem', fontSize: '0.75rem' }}>
                Maksimal {component.stock} unit sesuai sisa inventaris.
              </small>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
            {/* Tanggal Pinjam */}
            <div className="form-group">
              <label htmlFor="modal-borrowDate" className="form-label">
                Tanggal Pinjam *
              </label>
              <input
                id="modal-borrowDate"
                type="date"
                name="borrowDate"
                value={formData.borrowDate}
                onChange={handleChange}
                className={`form-input ${errors.borrowDate ? 'has-error' : ''}`}
                disabled={isSubmitting}
              />
              {errors.borrowDate && (
                <span className="error-text">
                  <AlertCircle size={14} /> {errors.borrowDate}
                </span>
              )}
            </div>

            {/* Durasi */}
            <div className="form-group">
              <label htmlFor="modal-durationDays" className="form-label">
                Durasi (Hari) *
              </label>
              <input
                id="modal-durationDays"
                type="number"
                name="durationDays"
                min="1"
                max="30"
                value={formData.durationDays}
                onChange={handleChange}
                className={`form-input ${errors.durationDays ? 'has-error' : ''}`}
                disabled={isSubmitting}
              />
              {errors.durationDays && (
                <span className="error-text">
                  <AlertCircle size={14} /> {errors.durationDays}
                </span>
              )}
            </div>
          </div>

          {/* Keperluan / Catatan */}
          <div className="form-group">
            <label htmlFor="modal-notes" className="form-label">
              Keperluan / Catatan Proyek
            </label>
            <textarea
              id="modal-notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Contoh: Untuk pengujian tugas praktikum IoT"
              rows="2"
              className="form-input"
              style={{ resize: 'vertical' }}
              disabled={isSubmitting}
            />
          </div>

          {/* Tombol Aksi */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
            <button
              type="button"
              className="btn-outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{ minWidth: '150px' }}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" style={{ marginRight: '0.5rem' }} /> Memproses...
                </>
              ) : (
                'Konfirmasi Pinjam'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}