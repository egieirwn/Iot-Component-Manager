import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, BookOpen, Building, ShieldCheck, Edit3, Check, X, AlertCircle, Clock, AlertTriangle, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { resubmitRoleRequest } from '../services/roleService';

export default function Profile() {
  const { user, profile, updateUserProfile, updateUserEmail, refreshProfile } = useAuth();
  const toast = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    studyProgram: '',
    faculty: ''
  });
  const [errors, setErrors] = useState({});

  // Email update modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailModalError, setEmailModalError] = useState('');
  const [isSendingEmailUpdate, setIsSendingEmailUpdate] = useState(false);

  // Resubmit Role Request State
  const [resubmitOpen, setResubmitOpen] = useState(false);
  const [resubmitData, setResubmitData] = useState({
    nip: '',
    studyProgram: '',
    faculty: ''
  });
  const [isResubmitting, setIsResubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.full_name || '',
        phone: profile.phone || '',
        studyProgram: profile.study_program || '',
        faculty: profile.faculty || ''
      });
      setResubmitData({
        nip: profile.identity_number || '',
        studyProgram: profile.study_program || '',
        faculty: profile.faculty || ''
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
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Nama lengkap tidak boleh kosong.';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Nomor telepon tidak boleh kosong.';
    } else if (!/^[0-9+ -]{8,18}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Format nomor telepon tidak valid.';
    }
    if (!formData.studyProgram.trim()) {
      newErrors.studyProgram = 'Program studi / unit tidak boleh kosong.';
    }
    if (!formData.faculty.trim()) {
      newErrors.faculty = 'Fakultas / unit tidak boleh kosong.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      const { error } = await updateUserProfile({
        full_name: formData.fullName.trim(),
        phone: formData.phone.trim(),
        study_program: formData.studyProgram.trim(),
        faculty: formData.faculty.trim()
      });

      if (error) {
        toast.error(error.message || 'Gagal menyimpan perubahan profil.');
      } else {
        toast.success('Profil berhasil diperbarui!');
        setIsEditing(false);
      }
    } catch (err) {
      toast.error(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmailUpdateSubmit = async (e) => {
    e.preventDefault();
    setEmailModalError('');

    const trimmed = newEmail.trim();
    if (!trimmed) {
      setEmailModalError('Email baru wajib diisi.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailModalError('Format email tidak valid.');
      return;
    }
    if (trimmed === user?.email) {
      setEmailModalError('Email baru harus berbeda dari email saat ini.');
      return;
    }

    setIsSendingEmailUpdate(true);
    try {
      const { error } = await updateUserEmail(trimmed);
      if (error) {
        setEmailModalError(error.message || 'Gagal memperbarui email akun.');
      } else {
        toast.success(`Tautan konfirmasi telah dikirim ke ${trimmed}. Konfirmasikan email untuk menyelesaikan perubahan.`);
        setShowEmailModal(false);
        setNewEmail('');
      }
    } catch (err) {
      setEmailModalError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSendingEmailUpdate(false);
    }
  };

  const handleResubmitRole = async (e) => {
    e.preventDefault();
    if (!resubmitData.nip.trim()) {
      toast.error('NIP Dosen wajib diisi.');
      return;
    }
    if (!resubmitData.studyProgram.trim() || !resubmitData.faculty.trim()) {
      toast.error('Program studi dan fakultas wajib diisi.');
      return;
    }

    setIsResubmitting(true);
    try {
      await resubmitRoleRequest({
        identityNumber: resubmitData.nip.trim(),
        studyProgram: resubmitData.studyProgram.trim(),
        faculty: resubmitData.faculty.trim()
      });
      toast.success('Pengajuan verifikasi peran Dosen berhasil dikirimkan ke administrator!');
      setResubmitOpen(false);
      await refreshProfile();
    } catch (err) {
      toast.error(err.message || 'Gagal mengirimkan pengajuan.');
    } finally {
      setIsResubmitting(false);
    }
  };

  const userRole = profile?.role || 'mahasiswa';
  const roleDisplay = userRole === 'admin' ? 'Administrator' : userRole === 'dosen' ? 'Dosen / Peneliti' : 'Mahasiswa';
  const isPendingDosen = profile?.role_request_status === 'pending';
  const isRejectedDosen = profile?.role_request_status === 'rejected';

  const avatarInitials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <div className="profile-page" style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
        <div className="dashboard-header-title">
          <h1>Profil Pengguna</h1>
          <p>Informasi akun dan data akademik inventaris laboratorium IoT</p>
        </div>
        {!isEditing && (
          <button
            type="button"
            className="btn-outline"
            onClick={() => setIsEditing(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Edit3 size={16} /> Edit Profil
          </button>
        )}
      </div>

      {/* Role Request Status: PENDING */}
      {isPendingDosen && (
        <div
          style={{
            backgroundColor: '#FEF3C7',
            border: '1px solid #FDE68A',
            color: '#92400E',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            fontSize: '0.875rem'
          }}
        >
          <Clock size={24} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ fontSize: '0.9375rem', display: 'block', marginBottom: '0.25rem' }}>
              Permintaan Peran Dosen Sedang Ditinjau Secara Manual
            </strong>
            <p style={{ lineHeight: 1.5, margin: 0, color: '#78350F' }}>
              Akun Anda saat ini memiliki akses tingkat <strong>Mahasiswa</strong> sementara staf laboratorium memeriksa dan memverifikasi data NIP ({profile?.identity_number || '-'}) dan unit kerja Anda secara manual. Tidak ada proses verifikasi otomatis demi kepatuhan akademik.
            </p>
          </div>
        </div>
      )}

      {/* Role Request Status: REJECTED */}
      {isRejectedDosen && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <AlertCircle size={24} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: '0.9375rem', display: 'block', marginBottom: '0.25rem' }}>
                Pengajuan Peran Dosen Ditolak oleh Administrator
              </strong>
              <p style={{ fontSize: '0.875rem', color: '#B91C1C', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                <strong>Alasan Penolakan:</strong> {profile?.role_rejection_reason || 'Data identitas NIP atau departemen belum sesuai dengan arsip kepegawaian.'}
              </p>
              <p style={{ fontSize: '0.8125rem', color: '#7F1D1D', marginBottom: '0.75rem' }}>
                Anda dapat memperbaiki nomor NIP atau departemen yang benar di bawah ini dan mengajukan ulang permohonan verifikasi kepada administrator laboratorium.
              </p>

              {!resubmitOpen ? (
                <button
                  type="button"
                  onClick={() => setResubmitOpen(true)}
                  className="btn-primary"
                  style={{ fontSize: '0.8125rem', padding: '0.4rem 0.875rem', backgroundColor: '#DC2626', borderColor: '#DC2626' }}
                >
                  Ajukan Ulang Verifikasi Dosen
                </button>
              ) : (
                <form onSubmit={handleResubmitRole} style={{ marginTop: '1rem', backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #FECACA' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-text-main)' }}>
                    Formulir Pengajuan Ulang Peran Dosen
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div className="form-group">
                      <label htmlFor="resubmit-nip" className="form-label" style={{ fontSize: '0.75rem' }}>
                        Nomor Induk Pegawai (NIP) *
                      </label>
                      <input
                        id="resubmit-nip"
                        type="text"
                        value={resubmitData.nip}
                        onChange={(e) => setResubmitData((prev) => ({ ...prev, nip: e.target.value }))}
                        placeholder="misal: 198503152010121002"
                        className="form-input"
                        disabled={isResubmitting}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="resubmit-prog" className="form-label" style={{ fontSize: '0.75rem' }}>
                        Program Studi / Departemen *
                      </label>
                      <input
                        id="resubmit-prog"
                        type="text"
                        value={resubmitData.studyProgram}
                        onChange={(e) => setResubmitData((prev) => ({ ...prev, studyProgram: e.target.value }))}
                        placeholder="misal: Teknik Komputer"
                        className="form-input"
                        disabled={isResubmitting}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label htmlFor="resubmit-fac" className="form-label" style={{ fontSize: '0.75rem' }}>
                      Fakultas / Unit Kerja *
                    </label>
                    <input
                      id="resubmit-fac"
                      type="text"
                      value={resubmitData.faculty}
                      onChange={(e) => setResubmitData((prev) => ({ ...prev, faculty: e.target.value }))}
                      placeholder="misal: Fakultas Ilmu Komputer"
                      className="form-input"
                      disabled={isResubmitting}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setResubmitOpen(false)}
                      className="btn-outline"
                      disabled={isResubmitting}
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={isResubmitting}
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.875rem' }}
                    >
                      {isResubmitting ? (
                        <>
                          <span className="spinner" style={{ marginRight: '0.4rem' }} /> Mengirimkan...
                        </>
                      ) : (
                        'Kirim Pengajuan Ulang'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-primary-light)',
            color: 'var(--color-primary)',
            fontSize: '1.75rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid var(--color-primary-border)'
          }}
        >
          {avatarInitials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 800 }}>{profile?.full_name || 'Pengguna'}</h2>
            <span
              style={{
                backgroundColor: userRole === 'admin' ? '#FEE2E2' : userRole === 'dosen' ? '#EDE9FE' : 'var(--color-primary-light)',
                color: userRole === 'admin' ? '#991B1B' : userRole === 'dosen' ? '#5B21B6' : 'var(--color-primary)',
                padding: '0.2rem 0.625rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase'
              }}
            >
              {roleDisplay}
            </span>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            {profile?.identity_number ? `${userRole === 'dosen' ? 'NIP' : 'NIM'}: ${profile.identity_number} · ` : ''}
            {profile?.study_program || 'Program Studi'} · {profile?.faculty || 'Universitas'}
          </p>
        </div>
      </div>

      {/* Main Details / Edit Form Card */}
      <div className="card">
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.25rem' }}>
          {isEditing ? 'Perbarui Informasi Profil' : 'Rincian Data Pengguna'}
        </h3>

        {isEditing ? (
          <form onSubmit={handleSaveProfile} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Nama Lengkap */}
            <div className="form-group">
              <label htmlFor="prof-name" className="form-label">
                Nama Lengkap *
              </label>
              <input
                id="prof-name"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                className={`form-input ${errors.fullName ? 'has-error' : ''}`}
                disabled={isSaving}
              />
              {errors.fullName && (
                <span className="error-text">
                  <AlertCircle size={14} /> {errors.fullName}
                </span>
              )}
            </div>

            {/* Nomor Telepon */}
            <div className="form-group">
              <label htmlFor="prof-phone" className="form-label">
                Nomor Telepon / WhatsApp *
              </label>
              <input
                id="prof-phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className={`form-input ${errors.phone ? 'has-error' : ''}`}
                disabled={isSaving}
              />
              {errors.phone && (
                <span className="error-text">
                  <AlertCircle size={14} /> {errors.phone}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Program Studi */}
              <div className="form-group">
                <label htmlFor="prof-prog" className="form-label">
                  Program Studi / Departemen *
                </label>
                <input
                  id="prof-prog"
                  name="studyProgram"
                  type="text"
                  value={formData.studyProgram}
                  onChange={handleChange}
                  className={`form-input ${errors.studyProgram ? 'has-error' : ''}`}
                  disabled={isSaving}
                />
                {errors.studyProgram && (
                  <span className="error-text">
                    <AlertCircle size={14} /> {errors.studyProgram}
                  </span>
                )}
              </div>

              {/* Fakultas */}
              <div className="form-group">
                <label htmlFor="prof-fac" className="form-label">
                  Fakultas *
                </label>
                <input
                  id="prof-fac"
                  name="faculty"
                  type="text"
                  value={formData.faculty}
                  onChange={handleChange}
                  className={`form-input ${errors.faculty ? 'has-error' : ''}`}
                  disabled={isSaving}
                />
                {errors.faculty && (
                  <span className="error-text">
                    <AlertCircle size={14} /> {errors.faculty}
                  </span>
                )}
              </div>
            </div>

            {/* Readonly Info Note */}
            <div style={{ backgroundColor: 'var(--color-bg-subtle)', padding: '0.875rem', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              ℹ️ Identitas resmi (NIM/NIP) dan Peran Akun (Role) dikunci demi kepatuhan akademik. Hubungi staf inventori lab jika ada perubahan data resmi.
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  setIsEditing(false);
                  setErrors({});
                }}
                disabled={isSaving}
              >
                Batal
              </button>
              <button type="submit" className="btn-primary" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <span className="spinner" style={{ marginRight: '0.5rem' }} /> Menyimpan...
                  </>
                ) : (
                  'Simpan Perubahan'
                )}
              </button>
            </div>
          </form>
        ) : (
          <table className="custom-table" style={{ margin: 0 }}>
            <tbody>
              <tr>
                <td style={{ width: '35%', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Nama Lengkap</td>
                <td><strong>{profile?.full_name || '-'}</strong></td>
              </tr>
              <tr>
                <td style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Email Terautentikasi</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{user?.email || profile?.email || '-'}</span>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => setShowEmailModal(true)}
                      style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
                    >
                      Ubah Email
                    </button>
                  </div>
                </td>
              </tr>
              <tr>
                <td style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  {userRole === 'dosen' ? 'Nomor Induk Pegawai (NIP)' : 'Nomor Induk Mahasiswa (NIM)'}
                </td>
                <td>{profile?.identity_number || '-'}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Peran Akun (Role)</td>
                <td><strong>{roleDisplay}</strong></td>
              </tr>
              <tr>
                <td style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Program Studi / Departemen</td>
                <td>{profile?.study_program || '-'}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Fakultas / Unit</td>
                <td>{profile?.faculty || '-'}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Nomor Telepon / WhatsApp</td>
                <td>{profile?.phone || '-'}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Ubah Email */}
      {showEmailModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Ubah Alamat Email Akun</h3>
              <button
                type="button"
                className="toast-close-btn"
                onClick={() => setShowEmailModal(false)}
                disabled={isSendingEmailUpdate}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Tautan konfirmasi akan dikirimkan ke alamat email baru Anda. Email saat ini tetap aktif hingga email baru dikonfirmasi.
            </p>

            {emailModalError && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <AlertCircle size={16} />
                <span>{emailModalError}</span>
              </div>
            )}

            <form onSubmit={handleEmailUpdateSubmit}>
              <div className="form-group">
                <label htmlFor="new-acc-email" className="form-label">
                  Alamat Email Baru *
                </label>
                <input
                  id="new-acc-email"
                  type="email"
                  placeholder="contoh: nama.baru@un.ac.id"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="form-input"
                  disabled={isSendingEmailUpdate}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowEmailModal(false)}
                  disabled={isSendingEmailUpdate}
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={isSendingEmailUpdate}>
                  {isSendingEmailUpdate ? (
                    <>
                      <span className="spinner" style={{ marginRight: '0.5rem' }} /> Mengirim Konfirmasi...
                    </>
                  ) : (
                    'Kirim Konfirmasi'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
