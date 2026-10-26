import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, UserCheck, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';

export default function CompleteProfile() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, profile, updateUserProfile, isConfigured } = useAuth();

  const isLecturer = profile?.requested_role === 'dosen' || profile?.role === 'dosen';

  const [formData, setFormData] = useState({
    fullName: '',
    identityNumber: '', // NIM atau NIP
    studyProgram: '',   // Jurusan / Prodi / Departemen
    faculty: '',        // Fakultas / Unit
    phone: ''           // Nomor Telepon WhatsApp
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // Prefill dari data yang sudah ada
  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.full_name || '',
        identityNumber: profile.identity_number || '',
        studyProgram: profile.study_program || '',
        faculty: profile.faculty || 'Fakultas Ilmu Komputer',
        phone: profile.phone || ''
      });
    }
  }, [profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    const trimmedName = formData.fullName.trim();
    const trimmedId = formData.identityNumber.trim();
    const trimmedProgram = formData.studyProgram.trim();
    const trimmedFaculty = formData.faculty.trim();
    const trimmedPhone = formData.phone.trim();

    if (!trimmedName) {
      newErrors.fullName = 'Nama lengkap wajib diisi.';
    } else if (trimmedName.length < 3) {
      newErrors.fullName = 'Nama minimal 3 karakter.';
    }

    if (!trimmedId) {
      newErrors.identityNumber = isLecturer ? 'NIP wajib diisi.' : 'NIM wajib diisi.';
    } else if (trimmedId.length < 5) {
      newErrors.identityNumber = isLecturer ? 'NIP minimal 5 karakter.' : 'NIM minimal 5 karakter.';
    }

    if (!trimmedProgram) {
      newErrors.studyProgram = isLecturer ? 'Departemen / Unit wajib diisi.' : 'Program studi / jurusan wajib diisi.';
    }

    if (!trimmedFaculty) {
      newErrors.faculty = 'Fakultas / Unit wajib diisi.';
    }

    if (!trimmedPhone) {
      newErrors.phone = 'Nomor telepon/WhatsApp aktif wajib diisi.';
    } else if (!/^[0-9+ -]{8,18}$/.test(trimmedPhone)) {
      newErrors.phone = 'Format nomor telepon tidak valid.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const updates = {
        full_name: formData.fullName.trim(),
        identity_number: formData.identityNumber.trim(),
        study_program: formData.studyProgram.trim(),
        faculty: formData.faculty.trim(),
        phone: formData.phone.trim(),
        profile_completed: true
      };

      const { error } = await updateUserProfile(updates);

      if (error) {
        setServerError(error.message || 'Gagal menyimpan profil. Silakan coba lagi.');
        return;
      }

      toast.success('Profil kampus Anda berhasil dilengkapi!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setServerError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg-app)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <header
        style={{
          padding: '1.25rem 3rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid var(--color-border)'
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
          padding: '2.5rem 1rem'
        }}
      >
        <div
          className="card"
          style={{
            width: '100%',
            maxWidth: '560px',
            padding: '2.5rem',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <UserCheck size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Lengkapi Profil Anda</h1>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                {isLecturer
                  ? 'Verifikasi identitas dosen & peneliti untuk izin peminjaman'
                  : 'Isi data akademik mahasiswa untuk melanjutkan ke inventaris'}
              </p>
            </div>
          </div>

          {serverError && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                margin: '1.25rem 0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <AlertCircle size={18} />
              <span>{serverError}</span>
            </div>
          )}

          <div
            style={{
              backgroundColor: 'var(--color-bg-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.875rem 1rem',
              margin: '1.25rem 0 1.5rem',
              fontSize: '0.8125rem',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5
            }}
          >
            <strong>Catatan:</strong> Data identitas akademik digunakan staf laboratorium untuk verifikasi pengambilan fisik perangkat keras IoT.
          </div>

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {/* Nama Lengkap */}
            <div className="form-group">
              <label htmlFor="comp-name" className="form-label">
                Nama Lengkap (sesuai SIAKAD / Dokumen Resmi) *
              </label>
              <input
                id="comp-name"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                className={`form-input ${errors.fullName ? 'has-error' : ''}`}
                disabled={isSubmitting}
              />
              {errors.fullName && (
                <span className="error-text">
                  <AlertCircle size={14} /> {errors.fullName}
                </span>
              )}
            </div>

            {/* Identitas (NIM atau NIP) */}
            <div className="form-group">
              <label htmlFor="comp-id" className="form-label">
                {isLecturer ? 'Nomor Induk Pegawai / Dosen (NIP) *' : 'Nomor Induk Mahasiswa (NIM) *'}
              </label>
              <input
                id="comp-id"
                name="identityNumber"
                type="text"
                placeholder={isLecturer ? 'Contoh: 198503152010121001' : 'Contoh: 2210511045'}
                value={formData.identityNumber}
                onChange={handleChange}
                className={`form-input ${errors.identityNumber ? 'has-error' : ''}`}
                disabled={isSubmitting}
              />
              {errors.identityNumber && (
                <span className="error-text">
                  <AlertCircle size={14} /> {errors.identityNumber}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Program Studi / Departemen */}
              <div className="form-group">
                <label htmlFor="comp-program" className="form-label">
                  {isLecturer ? 'Departemen / Unit *' : 'Program Studi / Jurusan *'}
                </label>
                <input
                  id="comp-program"
                  name="studyProgram"
                  type="text"
                  placeholder="Contoh: Teknik Informatika"
                  value={formData.studyProgram}
                  onChange={handleChange}
                  className={`form-input ${errors.studyProgram ? 'has-error' : ''}`}
                  disabled={isSubmitting}
                />
                {errors.studyProgram && (
                  <span className="error-text">
                    <AlertCircle size={14} /> {errors.studyProgram}
                  </span>
                )}
              </div>

              {/* Fakultas */}
              <div className="form-group">
                <label htmlFor="comp-faculty" className="form-label">
                  Fakultas *
                </label>
                <input
                  id="comp-faculty"
                  name="faculty"
                  type="text"
                  placeholder="Contoh: Fakultas Ilmu Komputer"
                  value={formData.faculty}
                  onChange={handleChange}
                  className={`form-input ${errors.faculty ? 'has-error' : ''}`}
                  disabled={isSubmitting}
                />
                {errors.faculty && (
                  <span className="error-text">
                    <AlertCircle size={14} /> {errors.faculty}
                  </span>
                )}
              </div>
            </div>

            {/* Nomor Telepon / WA */}
            <div className="form-group">
              <label htmlFor="comp-phone" className="form-label">
                Nomor Telepon / WhatsApp Aktif *
              </label>
              <input
                id="comp-phone"
                name="phone"
                type="tel"
                placeholder="Contoh: 081234567890"
                value={formData.phone}
                onChange={handleChange}
                className={`form-input ${errors.phone ? 'has-error' : ''}`}
                disabled={isSubmitting}
              />
              {errors.phone ? (
                <span className="error-text">
                  <AlertCircle size={14} /> {errors.phone}
                </span>
              ) : (
                <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Digunakan untuk notifikasi pengingat pengembalian barang dan konfirmasi darurat.
                </small>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '0.875rem', marginTop: '0.5rem' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" style={{ marginRight: '0.5rem' }} /> Menyimpan Data Profil...
                </>
              ) : (
                'Simpan & Lanjutkan ke Dashboard'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
