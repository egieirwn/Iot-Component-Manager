import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useToast } from '../components/common/Toast';
import { processBorrowing } from '../services/componentService';

export default function BorrowConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { component, borrowData } = location.state || {};

  if (!component || !borrowData) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-muted)' }}>
          Tidak ada data permohonan peminjaman yang sedang diproses.
        </p>
        <Link to="/components" className="btn-primary">
          Kembali ke Katalog
        </Link>
      </div>
    );
  }

  const handleConfirm = async () => {
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const result = await processBorrowing({
        componentId: component.id,
        componentName: component.name,
        componentCode: component.code,
        quantity: borrowData.quantity,
        borrowerName: borrowData.borrowerName,
        nim: borrowData.borrowerNim,
        borrowerEmail: borrowData.borrowerEmail,
        borrowDate: new Date().toISOString().split('T')[0],
        returnDate: borrowData.returnDate,
        notes: borrowData.notes,
        purpose: borrowData.purpose
      });

      if (result.success) {
        toast.success(`Peminjaman ${borrowData.quantity} unit ${component.name} berhasil disetujui!`);
        setIsSuccess(true);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memproses permohonan peminjaman.');
      toast.error(err.message || 'Gagal memproses peminjaman.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="card" style={{ maxWidth: '640px', margin: '2rem auto', textAlign: 'center', padding: '3rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--status-available-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--status-available-text)'
            }}
          >
            <CheckCircle2 size={36} />
          </div>
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          Peminjaman Berhasil!
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
          Permohonan peminjaman <strong>{borrowData.quantity} unit {component.name}</strong> atas nama{' '}
          <strong>{borrowData.borrowerName}</strong> telah berhasil dicatat. Stok inventaris telah otomatis terpotong. Silakan ambil perangkat di{' '}
          <strong>{component.location.split('·')[0].trim()}</strong>.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to="/borrowings" className="btn-primary">
            Lihat Daftar Peminjaman
          </Link>
          <Link to="/dashboard" className="btn-outline">
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="borrow-confirmation-page" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          to={`/borrow/${component.id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--color-text-secondary)',
            fontSize: '0.875rem'
          }}
        >
          <ArrowLeft size={16} /> Kembali ke Form
        </Link>
      </div>

      <div className="dashboard-header-title" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Konfirmasi Peminjaman</h1>
        <p>Silakan tinjau kembali rincian peminjaman di bawah ini sebelum melanjutkan.</p>
      </div>

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
          <AlertTriangle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="card" style={{ marginBottom: '2rem' }}>
        <table className="custom-table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th scope="col" style={{ width: '40%' }}>Rincian</th>
              <th scope="col">Informasi</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Komponen</strong></td>
              <td>{component.name} ({component.code})</td>
            </tr>
            <tr>
              <td><strong>Kategori</strong></td>
              <td>{component.category}</td>
            </tr>
            <tr>
              <td><strong>Jumlah Dipinjam</strong></td>
              <td><strong>{borrowData.quantity} unit</strong></td>
            </tr>
            <tr>
              <td><strong>Nama Peminjam</strong></td>
              <td>
                {borrowData.borrowerName} (NIM: {borrowData.borrowerNim})
                <br />
                <small style={{ color: 'var(--color-text-muted)' }}>{borrowData.borrowerEmail}</small>
              </td>
            </tr>
            <tr>
              <td><strong>Mata Kuliah / Proyek</strong></td>
              <td>{borrowData.projectName}</td>
            </tr>
            <tr>
              <td><strong>Tujuan Penggunaan</strong></td>
              <td>{borrowData.purpose}</td>
            </tr>
            <tr>
              <td><strong>Rencana Pengembalian</strong></td>
              <td>{borrowData.returnDate}</td>
            </tr>
            <tr>
              <td><strong>Catatan Tambahan</strong></td>
              <td>{borrowData.notes || '-'}</td>
            </tr>
            <tr>
              <td><strong>Lokasi Pengambilan</strong></td>
              <td>{component.location}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
        <Link to={`/borrow/${component.id}`} className="btn-outline">
          Kembali ke Form
        </Link>
        <button
          type="button"
          className="btn-primary"
          onClick={handleConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="spinner" style={{ marginRight: '0.5rem' }} /> Memproses...
            </>
          ) : (
            'Konfirmasi Peminjaman'
          )}
        </button>
      </div>
    </div>
  );
}
