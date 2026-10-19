import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ComponentItem from '../components/components/ComponentItem';
import StatusBadge from '../components/components/StatusBadge';
import {
  getStoredComponents,
  getStoredBorrowings,
  getStoredUser,
  saveStoredBorrowings,
  saveStoredComponents
} from '../services/componentService';

export default function Dashboard() {
  const [components, setComponents] = useState([]);
  const [borrowings, setBorrowings] = useState([]);
  const user = getStoredUser();

  useEffect(() => {
    setComponents(getStoredComponents());
    setBorrowings(getStoredBorrowings());
  }, []);

  // Handle return of component
  const handleReturn = (borrowId) => {
    const borrowItem = borrowings.find((b) => b.id === borrowId);
    if (!borrowItem) return;

    // Remove from borrowings
    const updatedBorrowings = borrowings.filter((b) => b.id !== borrowId);
    setBorrowings(updatedBorrowings);
    saveStoredBorrowings(updatedBorrowings);

    // Increase stock for the returned component
    const updatedComponents = components.map((c) => {
      if (c.id === borrowItem.componentId) {
        const newStock = c.stock + borrowItem.quantity;
        return {
          ...c,
          stock: newStock,
          status: newStock > 0 ? 'TERSEDIA' : 'DIPINJAM'
        };
      }
      return c;
    });
    setComponents(updatedComponents);
    saveStoredComponents(updatedComponents);
  };

  const activeLoanCount = borrowings.length;
  const availableCount = components.filter((c) => c.status === 'TERSEDIA').length;
  const totalStockUnits = components.reduce((acc, curr) => acc + curr.stock, 0);

  return (
    <div className="dashboard-page">
      {/* Dashboard Top Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-title">
          <h1>Selamat pagi, {user.name.split(' ')[0]}</h1>
          <p>Ringkasan inventaris · 5 Okt 2026</p>
        </div>
        <Link to="/components" className="btn-primary">
          Lihat semua komponen
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <h3>Peminjaman aktif</h3>
          <div className="stat-number">{activeLoanCount}</div>
          <div className="stat-subtext">{activeLoanCount} transaksi peminjaman oleh Anda</div>
        </div>

        <div className="stat-card">
          <h3>Kembali segera</h3>
          <div className="stat-number">
            {borrowings.length > 0 ? 1 : 0}
          </div>
          <div className="stat-subtext">
            {borrowings.length > 0
              ? `Jatuh tempo ${borrowings[0].dueDate}`
              : 'Tidak ada tenggat terdekat'}
          </div>
        </div>

        <div className="stat-card">
          <h3>Komponen tersedia</h3>
          <div className="stat-number">{availableCount}</div>
          <div className="stat-subtext">{totalStockUnits} unit total dalam inventaris</div>
        </div>
      </div>

      {/* Peminjaman Aktif Section */}
      <section className="dashboard-section" aria-labelledby="active-loans-heading">
        <div className="section-title">
          <h2 id="active-loans-heading">Peminjaman Aktif</h2>
          <Link to="/borrowings">Lihat semua riwayat</Link>
        </div>

        <div className="table-container">
          {borrowings.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
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
                {borrowings.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.componentName}</strong>
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

        <div className="component-grid">
          {components.slice(0, 3).map((comp) => (
            <ComponentItem key={comp.id} component={comp} />
          ))}
        </div>
      </section>
    </div>
  );
}
