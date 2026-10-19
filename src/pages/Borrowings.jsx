import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/components/StatusBadge';
import {
  getStoredBorrowings,
  getStoredComponents,
  saveStoredBorrowings,
  saveStoredComponents
} from '../services/componentService';

export default function Borrowings() {
  const [borrowings, setBorrowings] = useState([]);
  const [components, setComponents] = useState([]);

  useEffect(() => {
    setBorrowings(getStoredBorrowings());
    setComponents(getStoredComponents());
  }, []);

  const handleReturn = (borrowId) => {
    const item = borrowings.find((b) => b.id === borrowId);
    if (!item) return;

    if (!window.confirm(`Konfirmasi pengembalian ${item.quantity} unit ${item.componentName}?`)) {
      return;
    }

    // 1. Remove from borrowings
    const updatedBorrowings = borrowings.filter((b) => b.id !== borrowId);
    setBorrowings(updatedBorrowings);
    saveStoredBorrowings(updatedBorrowings);

    // 2. Restore stock to components
    const updatedComponents = components.map((c) => {
      if (c.id === item.componentId) {
        const newStock = c.stock + item.quantity;
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

    alert(`Komponen ${item.componentName} berhasil dikembalikan ke lab! Stok bertambah ${item.quantity} unit.`);
  };

  return (
    <div className="borrowings-page">
      <div className="dashboard-header">
        <div className="dashboard-header-title">
          <h1>Peminjaman Saya</h1>
          <p>Kelola daftar komponen yang sedang Anda pinjam dan riwayat transaksi</p>
        </div>
        <Link to="/components" className="btn-primary">
          Pinjam Komponen Baru
        </Link>
      </div>

      <div className="table-container">
        {borrowings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Anda tidak memiliki peminjaman aktif saat ini.
            </p>
            <Link to="/components" className="btn-outline">
              Jelajahi Katalog Komponen
            </Link>
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th scope="col">KOMPONEN</th>
                <th scope="col">JUMLAH</th>
                <th scope="col">STATUS</th>
                <th scope="col">TANGGAL JATUH TEMPO</th>
                <th scope="col">LAB PENGAMBILAN</th>
                <th scope="col">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {borrowings.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>
                      <Link to={`/components/${item.componentId}`} style={{ color: 'var(--color-primary)' }}>
                        {item.componentName}
                      </Link>
                    </strong>
                    <br />
                    <small style={{ color: 'var(--color-text-muted)' }}>
                      {item.componentCode} · {item.purpose}
                    </small>
                  </td>
                  <td>{item.quantity} unit</td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td>
                    <strong>{item.dueDate}</strong>
                    <br />
                    <small style={{ color: 'var(--color-text-muted)' }}>{item.remainingDays}</small>
                  </td>
                  <td>{item.pickupLab}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-outline"
                      style={{ padding: '0.4rem 0.875rem', fontSize: '0.8125rem' }}
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

      <div className="card" style={{ backgroundColor: 'var(--color-bg-subtle)' }}>
        <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          Informasi Pengembalian
        </h4>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          Kembalikan komponen langsung ke laboratorium yang sama dengan tempat pengambilan. Pastikan kabel jumper, modul, dan kelengkapan aksesoris dalam keadaan utuh sebelum diserahkan ke teknisi lab.
        </p>
      </div>
    </div>
  );
}
