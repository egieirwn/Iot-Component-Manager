import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, AlertCircle } from 'lucide-react';
import { fetchComponentById } from '../services/componentService';
import { useAuth } from '../context/AuthContext';

export default function BorrowForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [component, setComponent] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    quantity: '1',
    projectName: 'Praktikum Sistem Tertanam & IoT',
    purpose: '',
    returnDate: '',
    notes: '',
    agreeTerms: false
  });

  useEffect(() => {
    let active = true;
    fetchComponentById(id)
      .then((comp) => {
        if (active) {
          if (comp) setComponent(comp);
          else navigate('/components');
        }
      })
      .catch(() => {
        if (active) navigate('/components');
      });

    return () => {
      active = false;
    };
  }, [id, navigate]);

  if (!component) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const qtyNum = parseInt(formData.quantity, 10);
    const trimmedProject = formData.projectName.trim();
    const trimmedPurpose = formData.purpose.trim();

    // 1. Validasi kuantitas
    if (isNaN(qtyNum) || qtyNum < 1) {
      newErrors.quantity = 'Jumlah pinjam harus berupa angka minimal 1 unit.';
    } else if (qtyNum > component.stock) {
      newErrors.quantity = `Jumlah pinjam (${qtyNum} unit) melebihi sisa stok (${component.stock} unit).`;
    }

    // 2. Validasi nama proyek
    if (!trimmedProject) {
      newErrors.projectName = 'Nama proyek atau mata kuliah praktikum wajib diisi.';
    } else if (trimmedProject.length < 3) {
      newErrors.projectName = 'Nama proyek minimal 3 karakter.';
    }

    // 3. Validasi tujuan peminjaman
    if (!trimmedPurpose) {
      newErrors.purpose = 'Tujuan peminjaman / deskripsi proyek wajib diisi.';
    } else if (trimmedPurpose.length < 5) {
      newErrors.purpose = 'Tujuan peminjaman minimal 5 karakter agar diverifikasi laboran.';
    }

    // 4. Validasi tanggal pengembalian
    if (!formData.returnDate) {
      newErrors.returnDate = 'Tanggal rencana pengembalian wajib ditentukan.';
    } else {
      const today = new Date().toISOString().split('T')[0];
      if (formData.returnDate < today) {
        newErrors.returnDate = 'Tanggal pengembalian tidak boleh sebelum hari ini.';
      }
    }

    // 5. Validasi persetujuan tata tertib
    if (!formData.agreeTerms) {
      newErrors.agreeTerms = 'Anda wajib menyetujui pernyataan tata tertib laboratorium.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    const qty = parseInt(formData.quantity, 10);

    setTimeout(() => {
      // Teruskan data tersanitasi ke halaman konfirmasi
      navigate('/borrow-confirmation', {
        state: {
          component,
          borrowData: {
            quantity: qty,
            projectName: formData.projectName.trim(),
            purpose: formData.purpose.trim(),
            returnDate: formData.returnDate,
            notes: formData.notes.trim(),
            borrowerName: profile?.full_name || user?.email || 'Mahasiswa',
            borrowerNim: profile?.identity_number || '-',
            borrowerEmail: user?.email || profile?.email || '',
            borrowerMajor: profile?.study_program || profile?.faculty || 'Teknik Informatika'
          }
        }
      });
      setIsSubmitting(false);
    }, 200);
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
          <strong style={{ fontSize: '0.9375rem' }}>Peminjam: {profile?.full_name || 'Akun Kampus'}</strong>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            {profile?.role === 'dosen' ? 'NIP' : 'NIM'}: {profile?.identity_number || '-'} · {profile?.study_program || 'Sistem Informasi'} · {user?.email || profile?.email}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="card">
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Jumlah Pinjam */}
          <div className="form-group">
            <label htmlFor="quantity" className="form-label">
              Jumlah Pinjam (unit) *
            </label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min="1"
              max={component.stock}
              value={formData.quantity}
              onChange={handleChange}
              className={`form-input ${errors.quantity ? 'has-error' : ''}`}
            />
            {errors.quantity ? (
              <span className="error-text">
                <AlertCircle size={14} /> {errors.quantity}
              </span>
            ) : (
              <small style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem', display: 'block', fontSize: '0.75rem' }}>
                Maksimal {component.stock} unit sesuai sisa inventaris.
              </small>
            )}
          </div>

          {/* Nama Proyek */}
          <div className="form-group">
            <label htmlFor="projectName" className="form-label">
              Nama Proyek / Mata Kuliah Praktikum *
            </label>
            <input
              id="projectName"
              name="projectName"
              type="text"
              placeholder="Contoh: Praktikum Sistem Tertanam & IoT"
              value={formData.projectName}
              onChange={handleChange}
              className={`form-input ${errors.projectName ? 'has-error' : ''}`}
            />
            {errors.projectName && (
              <span className="error-text">
                <AlertCircle size={14} /> {errors.projectName}
              </span>
            )}
          </div>

          {/* Tujuan Penggunaan */}
          <div className="form-group">
            <label htmlFor="purpose" className="form-label">
              Tujuan Peminjaman / Deskripsi Proyek *
            </label>
            <textarea
              id="purpose"
              name="purpose"
              rows="3"
              placeholder="Jelaskan kebutuhan pengujian atau perangkat keras yang akan dibangun..."
              value={formData.purpose}
              onChange={handleChange}
              className={`form-input ${errors.purpose ? 'has-error' : ''}`}
              style={{ resize: 'vertical' }}
            />
            {errors.purpose && (
              <span className="error-text">
                <AlertCircle size={14} /> {errors.purpose}
              </span>
            )}
          </div>

          {/* Tanggal Rencana Pengembalian */}
          <div className="form-group">
            <label htmlFor="returnDate" className="form-label">
              Tanggal Rencana Pengembalian *
            </label>
            <input
              id="returnDate"
              name="returnDate"
              type="date"
              value={formData.returnDate}
              onChange={handleChange}
              className={`form-input ${errors.returnDate ? 'has-error' : ''}`}
            />
            {errors.returnDate && (
              <span className="error-text">
                <AlertCircle size={14} /> {errors.returnDate}
              </span>
            )}
          </div>

          {/* Catatan Tambahan */}
          <div className="form-group">
            <label htmlFor="notes" className="form-label">
              Catatan Tambahan (opsional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows="2"
              placeholder="Catatan kelengkapan kabel, pin header, atau modul pendukung..."
              value={formData.notes}
              onChange={handleChange}
              className="form-input"
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Persetujuan Tata Tertib */}
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', paddingTop: '0.5rem' }}>
              <input
                type="checkbox"
                id="agreeTerms"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleChange}
                style={{ marginTop: '0.25rem', cursor: 'pointer' }}
              />
              <label
                htmlFor="agreeTerms"
                style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
              >
                Saya menyatakan bertanggung jawab penuh atas pemeliharaan dan pengembalian komponen ini sesuai dengan tata tertib laboratorium.
              </label>
            </div>
            {errors.agreeTerms && (
              <span className="error-text" style={{ marginTop: '0.375rem' }}>
                <AlertCircle size={14} /> {errors.agreeTerms}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ marginTop: '1rem', width: '100%' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner" style={{ marginRight: '0.5rem' }} /> Memvalidasi...
              </>
            ) : (
              'Lanjut ke Konfirmasi'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
