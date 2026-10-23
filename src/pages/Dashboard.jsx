import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ComponentItem from '../components/components/ComponentItem';
import StatusBadge from '../components/components/StatusBadge';
import BorrowModal from '../components/components/BorrowModal';
import ComponentSkeleton from '../components/common/ComponentSkeleton';
import { useToast } from '../components/common/Toast';
import {
  fetchComponents,
  fetchBorrowings,
  getStoredUser,
  processReturn
} from '../services/componentService';

export default function Dashboard() {
  const toast = useToast();
  const [components, setComponents] = useState([]);
  const [borrowings, setBorrowings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedComponentForBorrow, setSelectedComponentForBorrow] = useState(null);
  const user = getStoredUser();

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [comps, borrows] = await Promise.all([
        fetchComponents(),
        fetchBorrowings()
      ]);
      setComponents(comps);
      setBorrowings(borrows);
    } catch {
      // Fallback if needed
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
        setBorrowings(result.updatedBorrowings);
        setComponents(result.updatedComponents);
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

  return (
    <div className="dashboard-page">
      {/* Dashboard Top Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-title">
          <h1>Selamat pagi, {user.name ? user.name.split(' ')[0] : 'Mahasiswa'}</h1>
          <p>Ringkasan inventaris laboratorium IoT Campus</p>
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
              <span className="spinner spinner-primary" style={{ marginRight: '0.5rem' }} /> Memuat data peminjaman...
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
