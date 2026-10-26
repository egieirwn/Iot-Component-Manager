import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ComponentItem from '../components/components/ComponentItem';
import StatusBadge from '../components/components/StatusBadge';
import BorrowModal from '../components/components/BorrowModal';
import ComponentSkeleton from '../components/common/ComponentSkeleton';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';
import {
  fetchComponents,
  fetchBorrowings,
  processReturn
} from '../services/componentService';

// Fungsi helper penentu salam berdasarkan jam lokal perangkat
export const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) {
    return 'Selamat pagi';
  } else if (hour >= 11 && hour < 15) {
    return 'Selamat siang';
  } else if (hour >= 15 && hour < 19) {
    return 'Selamat sore';
  } else {
    return 'Selamat malam';
  }
};

export default function Dashboard() {
  const toast = useToast();
  const { user, profile } = useAuth();
  const [components, setComponents] = useState([]);
  const [borrowings, setBorrowings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedComponentForBorrow, setSelectedComponentForBorrow] = useState(null);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [comps, borrows] = await Promise.all([
        fetchComponents(),
        fetchBorrowings()
      ]);
      setComponents(comps);
      setBorrowings(borrows);
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError(err.message || 'Gagal memuat data inventaris dari server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Handle return of component with status update and toast
  const handleReturn = async (borrowId) => {
    const borrowItem = borrowings.find((b) => b.id === borrowId);
    if (!borrowItem) return;

    try {
      const result = await processReturn({
        borrowId,
        condition: 'Baik',
        notes: 'Dikembalikan melalui dashboard utama'
      });

      if (result.success) {
        if (result.updatedBorrowings) setBorrowings(result.updatedBorrowings);
        if (result.updatedComponents) setComponents(result.updatedComponents);
        toast.success(`Komponen ${borrowItem.componentName} berhasil dikembalikan!`);
      }
    } catch (err) {
      toast.error(err.message || 'Gagal memproses pengembalian.');
    }
  };

  const handleBorrowSuccess = (result) => {
    if (result?.updatedComponents) {
      setComponents(result.updatedComponents);
    }
    loadDashboardData();
  };

  const activeBorrowings = borrowings.filter((b) => b.status === 'DIPINJAM');
  const activeLoanCount = activeBorrowings.length;
  const availableCount = components.filter((c) => c.status === 'TERSEDIA').length;
  const totalStockUnits = components.reduce((acc, curr) => acc + (curr.stock || 0), 0);

  // Ambil nama depan dari profil terautentikasi
  const firstName = profile?.full_name
    ? profile.full_name.trim().split(' ')[0]
    : (user?.email ? user.email.split('@')[0] : 'Mahasiswa');

  const greetingPrefix = getTimeBasedGreeting();
  const isPendingDosen = profile?.role_request_status === 'pending';
  const isRejectedDosen = profile?.role_request_status === 'rejected';

  return (
    <div className="dashboard-page">
      {/* Role Request Status Banners */}
      {isPendingDosen && (
        <div
          style={{
            backgroundColor: '#FEF3C7',
            border: '1px solid #FDE68A',
            color: '#92400E',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <div>
            <strong style={{ fontSize: '0.875rem' }}>Permintaan Peran Dosen Sedang Ditinjau Manual</strong>
            <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem', margin: 0, color: '#78350F' }}>
              Akun Anda saat ini memiliki hak akses Mahasiswa sementara staf lab memverifikasi identitas NIP Anda secara manual.
            </p>
          </div>
          <Link to="/profile" className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', whiteSpace: 'nowrap' }}>
            Lihat Profil
          </Link>
        </div>
      )}

      {isRejectedDosen && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <div>
            <strong style={{ fontSize: '0.875rem' }}>Pengajuan Peran Dosen Ditolak</strong>
            <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem', margin: 0, color: '#B91C1C' }}>
              Alasan: {profile?.role_rejection_reason || 'NIP atau departemen belum sesuai.'} Anda dapat memperbaiki dan mengajukan ulang data verifikasi.
            </p>
          </div>
          <Link
            to="/profile"
            className="btn-primary"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', backgroundColor: '#DC2626', borderColor: '#DC2626', whiteSpace: 'nowrap' }}
          >
            Perbaiki & Ajukan Ulang
          </Link>
        </div>
      )}

      {/* Error Banner with Retry */}
      {error && (
        <div
          className="card"
          style={{
            padding: '1.5rem',
            textAlign: 'center',
            marginBottom: '1.5rem',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA'
          }}
        >
          <h3 style={{ color: '#991B1B', fontWeight: 700, marginBottom: '0.5rem', fontSize: '1rem' }}>
            Gagal Memuat Data Dashboard
          </h3>
          <p style={{ color: '#B91C1C', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>
          <button type="button" onClick={loadDashboardData} className="btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
            ↻ Coba Lagi
          </button>
        </div>
      )}

      {/* Dashboard Top Header dengan Greeting Dinamis */}
      <div className="dashboard-header">
        <div className="dashboard-header-title">
          <h1>{greetingPrefix}, {firstName}!</h1>
          <p>Ringkasan inventaris laboratorium IoT Campus Universitas</p>
        </div>
        <Link to="/components" className="btn-primary">
          Lihat semua komponen
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <h3>Peminjaman aktif</h3>
          <div className="stat-number">{isLoading ? '...' : activeLoanCount}</div>
          <div className="stat-subtext">{activeLoanCount} transaksi peminjaman aktif oleh Anda</div>
        </div>

        <div className="stat-card">
          <h3>Kembali segera</h3>
          <div className="stat-number">
            {isLoading ? '...' : activeBorrowings.length > 0 ? 1 : 0}
          </div>
          <div className="stat-subtext">
            {activeBorrowings.length > 0
              ? `Jatuh tempo ${activeBorrowings[0].dueDate}`
              : 'Tidak ada tenggat terdekat'}
          </div>
        </div>

        <div className="stat-card">
          <h3>Komponen tersedia</h3>
          <div className="stat-number">{isLoading ? '...' : availableCount}</div>
          <div className="stat-subtext">{totalStockUnits} unit total siap pakai</div>
        </div>
      </div>

      {/* Peminjaman Aktif Section */}
      <section className="dashboard-section" aria-labelledby="active-loans-heading">
        <div className="section-title">
          <h2 id="active-loans-heading">Peminjaman Aktif</h2>
          <Link to="/borrowings">Lihat semua riwayat</Link>
        </div>

        <div className="table-container">
          {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <span className="spinner spinner-primary" style={{ marginRight: '0.5rem' }} /> Memuat data peminjaman dari database...
            </div>
          ) : activeBorrowings.length === 0 ? (
            <p style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              Tidak ada peminjaman aktif saat ini.
            </p>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th scope="col">Komponen</th>
                  <th scope="col">Jumlah</th>
                  <th scope="col">Status</th>
                  <th scope="col">Tanggal Jatuh Tempo</th>
                  <th scope="col">Sisa Waktu</th>
                  <th scope="col">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {activeBorrowings.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>
                        <Link to={`/components/${item.componentId}`} style={{ color: 'var(--color-primary)' }}>
                          {item.componentName}
                        </Link>
                      </strong>
                      <br />
                      <small style={{ color: 'var(--color-text-muted)' }}>
                        {item.componentCode} · Lab: {item.pickupLab}
                      </small>
                    </td>
                    <td>{item.quantity} unit</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>{item.dueDate}</td>
                    <td>{item.remainingDays}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-outline"
                        style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }}
                        onClick={() => handleReturn(item.id)}
                      >
                        Kembalikan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Komponen Populer Section */}
      <section className="dashboard-section" aria-labelledby="popular-components-heading">
        <div className="section-title">
          <h2 id="popular-components-heading">Komponen Populer</h2>
          <Link to="/components">Lihat semua komponen</Link>
        </div>

        {isLoading ? (
          <ComponentSkeleton count={3} />
        ) : (
          <div className="component-grid">
            {components.slice(0, 3).map((comp) => (
              <ComponentItem
                key={comp.id}
                component={comp}
                onBorrow={() => setSelectedComponentForBorrow(comp)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modal Pinjam jika diklik dari Popular Components */}
      {selectedComponentForBorrow && (
        <BorrowModal
          component={selectedComponentForBorrow}
          onClose={() => setSelectedComponentForBorrow(null)}
          onSuccess={handleBorrowSuccess}
        />
      )}
    </div>
  );
}
