import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Bell, CheckCircle, AlertCircle, Info, Camera, Trash2, UploadCloud, X } from 'lucide-react';
import StatusBadge from '../components/components/StatusBadge';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';
import {
  fetchComponentById,
  uploadComponentImage,
  removeComponentImage,
  validateComponentImageFile
} from '../services/componentService';

export default function ComponentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { profile } = useAuth();

  const [component, setComponent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Peran yang berwenang mengunggah dan mengubah foto: Dosen & Superadmin
  const canEditImage = profile?.role === 'dosen' || profile?.role === 'superadmin';

  // Image Upload Modal State
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateComponentImageFile(file);
    if (!validation.valid) {
      setUploadError(validation.error);
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setUploadError('');
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSaveImage = async () => {
    if (!selectedFile || !component) return;

    setIsUploadingImage(true);
    setUploadError('');
    try {
      const res = await uploadComponentImage(selectedFile, component.id);
      setComponent((prev) => ({ ...prev, image: res.imageUrl }));
      toast.success('Foto komponen berhasil diunggah dan diperbarui!');
      setImageModalOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err) {
      console.error('Failed to upload component image:', err);
      setUploadError(err.message || 'Gagal mengunggah foto komponen.');
      toast.error(err.message || 'Gagal mengunggah foto komponen.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!component) return;
    if (!window.confirm('Apakah Anda yakin ingin menghapus foto ini dan mengembalikan ke foto standar?')) {
      return;
    }

    setIsUploadingImage(true);
    try {
      const res = await removeComponentImage(component.id);
      setComponent((prev) => ({ ...prev, image: res.imageUrl }));
      toast.success('Foto komponen berhasil dihapus (menggunakan foto default).');
      setImageModalOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err) {
      console.error('Failed to remove component image:', err);
      toast.error(err.message || 'Gagal menghapus foto komponen.');
    } finally {
      setIsUploadingImage(false);
    }
  };

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

  // Komponen siap dipinjam jika ada sisa stok (> 0) dan aktif
  const canBorrow = (component.stock || 0) > 0 && component.isActive !== false;

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
              <div>
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
                {canEditImage && (
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      setUploadError('');
                      setImageModalOpen(true);
                    }}
                    style={{
                      marginTop: '0.75rem',
                      width: '100%',
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.8125rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Camera size={15} />
                    Ubah Foto Komponen
                  </button>
                )}
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
                <span style={{ color: 'var(--color-text-muted)' }}>Stok Tersedia</span>
                <strong style={{ color: canBorrow ? 'var(--color-primary)' : '#DC2626' }}>
                  {component.stock} unit
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9375rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Total Stok Fisik</span>
                <strong>{component.totalStock || component.stock} unit</strong>
              </div>

              {component.borrowedStock > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9375rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Sedang Dipinjam</span>
                  <strong style={{ color: '#D97706' }}>{component.borrowedStock} unit</strong>
                </div>
              )}

              {(component.maintenanceStock > 0 || component.damagedStock > 0) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9375rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Pemeriksaan / Rusak</span>
                  <strong style={{ color: '#B45309' }}>
                    {(component.maintenanceStock || 0) + (component.damagedStock || 0)} unit
                  </strong>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9375rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Kondisi Fisik</span>
                <strong>{component.condition}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9375rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Status Ketersediaan</span>
                <StatusBadge status={component.status} />
              </div>
            </div>

            {canBorrow ? (
              <Link
                to={`/borrow/${component.id}`}
                className="btn-primary"
                style={{ width: '100%', textAlign: 'center', display: 'block' }}
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

          {/* Borrow Status Alert Info jika stok habis */}
          {!canBorrow && (
            <div
              style={{
                backgroundColor: 'var(--status-borrowed-bg)',
                border: '1px solid #FED7AA',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem'
              }}
            >
              <div style={{ marginBottom: '0.5rem' }}>
                <StatusBadge status={component.status} />
              </div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--status-borrowed-text)', marginBottom: '0.375rem' }}>
                {component.status === 'Dalam Pemeriksaan'
                  ? 'Komponen Sedang Dalam Pemeliharaan / Perbaikan'
                  : component.borrowedStock > 0
                  ? `Seluruh ${component.totalStock} unit sedang aktif dipinjam`
                  : 'Komponen Tidak Tersedia untuk Dipinjam'}
              </h4>
              <p style={{ fontSize: '0.8125rem', color: '#9A3412', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                {component.borrowerInfo?.notes || 'Saat ini tidak ada unit yang dapat dipinjam. Silakan periksa kembali saat unit telah dikembalikan ke lab.'}
              </p>
              <small style={{ color: '#9A3412' }}>
                Pengajuan baru dibuka segera setelah inventaris dikembalikan atau diperbarui oleh laboran.
              </small>
            </div>
          )}

          {/* Banner Informasi Stok Parsial */}
          {canBorrow && component.borrowedStock > 0 && (
            <div
              style={{
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem 1.25rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                <Info size={16} color="#1D4ED8" />
                <strong style={{ fontSize: '0.875rem', color: '#1E40AF' }}>Stok Parsial Tersedia</strong>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#1E3A8A', margin: 0, lineHeight: 1.5 }}>
                Sebanyak {component.borrowedStock} unit sedang dipinjam mahasiswa lain. Masih tersisa <strong>{component.stock} unit</strong> yang siap Anda pinjam hari ini.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL KELOLA FOTO KOMPONEN (DOSEN & SUPERADMIN) */}
      {imageModalOpen && canEditImage && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px', width: '90%' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Kelola Foto Komponen</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                  {profile?.role === 'dosen' ? 'Peran: Dosen' : 'Peran: Superadmin'} · {component.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setImageModalOpen(false);
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                disabled={isUploadingImage}
              >
                <X size={20} />
              </button>
            </div>

            {/* Role Notice */}
            {profile?.role === 'dosen' && (
              <div
                style={{
                  backgroundColor: '#EDE9FE',
                  border: '1px solid #DDD6FE',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.625rem 0.875rem',
                  fontSize: '0.75rem',
                  color: '#5B21B6',
                  marginBottom: '1rem',
                  lineHeight: 1.4
                }}
              >
                ℹ️ Sebagai <strong>Dosen</strong>, Anda memiliki izin khusus untuk memperbarui foto komponen inventaris ini. Metadata spesifikasi dan stok tetap berada di bawah kendali Superadmin.
              </div>
            )}

            {/* Image Preview Box */}
            <div
              style={{
                backgroundColor: '#27272A',
                borderRadius: 'var(--radius-md)',
                height: '180px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                marginBottom: '1.25rem',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <img
                src={previewUrl || component.image}
                alt="Preview Komponen"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
              {previewUrl && (
                <span
                  style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: '#FFFFFF',
                    fontSize: '0.6875rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  Pratinjau Foto Baru
                </span>
              )}
            </div>

            {/* Error Message */}
            {uploadError && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.625rem 0.875rem',
                  fontSize: '0.8125rem',
                  color: '#991B1B',
                  marginBottom: '1rem'
                }}
              >
                {uploadError}
              </div>
            )}

            {/* File Input Controls */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px dashed var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  cursor: isUploadingImage ? 'not-allowed' : 'pointer',
                  backgroundColor: 'var(--color-bg-subtle)',
                  transition: 'border-color 0.15s ease'
                }}
              >
                <UploadCloud size={24} style={{ color: 'var(--color-primary)', marginBottom: '0.375rem' }} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                  {selectedFile ? selectedFile.name : 'Klik untuk memilih foto dari komputer'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  Format yang didukung: JPG, PNG, WEBP (maksimal 5 MB)
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  disabled={isUploadingImage}
                />
              </label>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-outline"
                onClick={handleRemoveImage}
                disabled={isUploadingImage}
                style={{
                  color: '#DC2626',
                  borderColor: '#FCA5A5',
                  fontSize: '0.8125rem',
                  padding: '0.45rem 0.875rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Trash2 size={14} />
                Hapus Foto
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => {
                    setImageModalOpen(false);
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  disabled={isUploadingImage}
                  style={{ fontSize: '0.8125rem', padding: '0.45rem 0.875rem' }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSaveImage}
                  disabled={!selectedFile || isUploadingImage}
                  style={{ fontSize: '0.8125rem', padding: '0.45rem 1rem' }}
                >
                  {isUploadingImage ? 'Mengunggah...' : 'Unggah & Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
