import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Clock, RotateCcw } from 'lucide-react';
import StatusBadge from '../components/components/StatusBadge';
import { useToast } from '../components/common/Toast';
import {
  getStoredBorrowings,
  getStoredComponents,
  processReturn
} from '../services/componentService';

export default function Borrowings() {
  const toast = useToast();
  const [borrowings, setBorrowings] = useState([]);
  const [components, setComponents] = useState([]);
  const [activeTab, setActiveTab] = useState('aktif'); // 'aktif' | 'riwayat'

  // Modal / prompt pengembalian
  const [selectedBorrowing, setSelectedBorrowing] = useState(null);
  const [returnCondition, setReturnCondition] = useState('Baik');
  const [returnNotes, setReturnNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setBorrowings(getStoredBorrowings());
    setComponents(getStoredComponents());
  }, []);

  const handleOpenReturnModal = (item) => {
    setSelectedBorrowing(item);
    setReturnCondition('Baik');
    setReturnNotes('');
  };

  const handleConfirmReturn = async (e) => {
    e.preventDefault();
    if (!selectedBorrowing) return;

    setIsSubmitting(true);
    try {
      const result = await processReturn({
        borrowId: selectedBorrowing.id,
        condition: returnCondition,
        notes: returnNotes.trim()
      });

      if (result.success) {
        setBorrowings(result.updatedBorrowings);
        setComponents(result.updatedComponents);
        setSelectedBorrowing(null);
        toast.success(
          `Pengembalian berhasil dicatat! Status: DIKEMBALIKAN (Kondisi: ${returnCondition}).`
        );
      }
    } catch (err) {
      toast.error(err.message || 'Gagal memproses pengembalian barang.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeBorrowings = borrowings.filter((b) => b.status === 'DIPINJAM');
  const returnedBorrowings = borrowings.filter((b) => b.status === 'DIKEMBALIKAN');

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

      {/* Tabs Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
        <button
          type="button"
          onClick={() => setActiveTab('aktif')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.9375rem',
            borderBottom: activeTab === 'aktif' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'aktif' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            cursor: 'pointer'
          }}
        >
          Peminjaman Aktif ({activeBorrowings.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('riwayat')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.9375rem',
            borderBottom: activeTab === 'riwayat' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'riwayat' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            cursor: 'pointer'
          }}
        >
          Riwayat Pengembalian ({returnedBorrowings.length})
        </button>
      </div>

      {/* Modal / Dialog Pengembalian Komponen */}
      {selectedBorrowing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem'
          }}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '520px', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Form Pengembalian Komponen
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Periksa dan catat kondisi barang saat dikembalikan ke laboratorium.
            </p>

            <form onSubmit={handleConfirmReturn} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ backgroundColor: 'var(--color-bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <strong>{selectedBorrowing.componentName}</strong>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                  {selectedBorrowing.componentCode} · Jumlah: {selectedBorrowing.quantity} unit
                </p>
              </div>

              <div>
                <label
                  htmlFor="returnCondition"
                  style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}
                >
                  Kondisi Barang Saat Dikembalikan:
                </label>
                <select
                  id="returnCondition"
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    outline: 'none',
                    fontWeight: 500
                  }}
                >
                  <option value="Baik">Baik (Normal &amp; Lengkap — Stok siap pakai bertambah)</option>
                  <option value="Perlu Pengecekan">Perlu Pengecekan / Longgar (Masuk stok maintenance)</option>
                  <option value="Rusak">Rusak / Tidak Berfungsi (Masuk stok rusak)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="returnNotes"
                  style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}
                >
                  Catatan Teknisi / Kondisi Fisik:
                </label>
                <textarea
                  id="returnNotes"
                  rows="3"
                  placeholder="Contoh: Kabel jumper lengkap, pin header lurus, sensor teruji normal..."
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setSelectedBorrowing(null)}
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="spinner" style={{ marginRight: '0.5rem' }} /> Memproses...
                    </>
                  ) : (
                    'Konfirmasi Pengembalian'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Peminjaman Aktif */}
      {activeTab === 'aktif' && (
        <div className="table-container">
          {activeBorrowings.length === 0 ? (
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
                        onClick={() => handleOpenReturnModal(item)}
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
      )}

      {/* Tab: Riwayat Pengembalian */}
      {activeTab === 'riwayat' && (
        <div className="table-container">
          {returnedBorrowings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--color-text-muted)' }}>
                Belum ada catatan transaksi pengembalian.
              </p>
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th scope="col">KOMPONEN</th>
                  <th scope="col">JUMLAH</th>
                  <th scope="col">TANGGAL KEMBALI</th>
                  <th scope="col">KONDISI PENGEMBALIAN</th>
                  <th scope="col">CATATAN</th>
                  <th scope="col">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {returnedBorrowings.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.componentName}</strong>
                      <br />
                      <small style={{ color: 'var(--color-text-muted)' }}>{item.componentCode}</small>
                    </td>
                    <td>{item.quantity} unit</td>
                    <td>{item.returnDate || '-'}</td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor:
                            item.returnCondition === 'Baik'
                              ? 'var(--status-available-bg)'
                              : '#FEF3C7',
                          color:
                            item.returnCondition === 'Baik'
                              ? 'var(--status-available-text)'
                              : '#B45309'
                        }}
                      >
                        {item.returnCondition || 'Baik'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                      {item.returnNotes || item.notes || '-'}
                    </td>
                    <td>
                      <span
                        style={{
                          backgroundColor: '#F1F5F9',
                          color: '#475569',
                          padding: '0.25rem 0.625rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}
                      >
                        SELESAI
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="card" style={{ backgroundColor: 'var(--color-bg-subtle)', marginTop: '1.5rem' }}>
        <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          Kebijakan Inventaris &amp; Pengembalian
        </h4>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          Komponen yang dikembalikan dalam kondisi Baik akan segera ditambahkan kembali ke stok siap pakai. Komponen yang dilaporkan Perlu Pengecekan atau Rusak akan diteruskan ke teknisi lab untuk proses kalibrasi atau penggantian.
        </p>
      </div>
    </div>
  );
}
