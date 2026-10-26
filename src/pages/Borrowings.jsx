import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Clock, RotateCcw, ArrowLeft, Check, ShieldCheck } from 'lucide-react';
import StatusBadge from '../components/components/StatusBadge';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';
import {
  fetchBorrowings,
  fetchComponents,
  processReturn
} from '../services/componentService';

const DEFAULT_CHECKLIST_ITEMS = [
  'Sensor dapat membaca suhu dan kelembaban',
  'Tidak ada kerusakan fisik atau kaki yang bengkok',
  'Kabel jumper 3-pin masih lengkap',
  'Resistor pull-up 4.7 kΩ masih terpasang',
  'Label aset masih terbaca jelas'
];

export default function Borrowings() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [borrowings, setBorrowings] = useState([]);
  const [components, setComponents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('aktif'); // 'aktif' | 'riwayat'

  // Return Flow States: null | 'form' | 'receipt'
  const [selectedBorrowing, setSelectedBorrowing] = useState(null);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [returnCondition, setReturnCondition] = useState('Berfungsi'); // 'Berfungsi' | 'Rusak'
  const [checklist, setChecklist] = useState({
    0: true,
    1: true,
    2: true,
    3: true,
    4: false
  });
  const [returnNotes, setReturnNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnReceipt, setReturnReceipt] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [borrows, comps] = await Promise.all([
        fetchBorrowings(),
        fetchComponents()
      ]);
      setBorrowings(borrows);
      setComponents(comps);
    } catch (err) {
      console.error('Error loading borrowings:', err);
      setError(err.message || 'Gagal memuat riwayat peminjaman dari server database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenReturnForm = (borrowItem) => {
    const comp = components.find((c) => c.id === borrowItem.componentId) || {
      id: borrowItem.componentId,
      name: borrowItem.componentName,
      code: borrowItem.componentCode,
      image: '/assets/images/dht22.png',
      location: borrowItem.pickupLab || 'Lab Sistem Tertanam'
    };
    setSelectedBorrowing(borrowItem);
    setSelectedComponent(comp);
    setReturnCondition('Berfungsi');
    setChecklist({ 0: true, 1: true, 2: true, 3: true, 4: false });
    setReturnNotes('');
    setReturnReceipt(null);
  };

  const handleToggleChecklist = (index) => {
    setChecklist((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleConfirmReturn = async (e) => {
    e.preventDefault();
    if (!selectedBorrowing) return;

    setIsSubmitting(true);
    try {
      const checkedLabels = DEFAULT_CHECKLIST_ITEMS.filter((_, idx) => checklist[idx]);

      const result = await processReturn({
        borrowId: selectedBorrowing.id,
        condition: returnCondition,
        notes: returnNotes.trim(),
        checklist: checkedLabels
      });

      if (result.success) {
        if (result.updatedBorrowings) setBorrowings(result.updatedBorrowings);
        if (result.updatedComponents) setComponents(result.updatedComponents);

        const receiptData = {
          borrowing: selectedBorrowing,
          component: selectedComponent,
          condition: returnCondition,
          receiptCode: result.receipt?.receiptCode || `RT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          returnDateStr: result.receipt?.returnDate || `${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} - ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
          recordedDate: `${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
        };

        setReturnReceipt(receiptData);
        toast.success(`Komponen ${selectedBorrowing.componentName} berhasil dikembalikan!`);
      }
    } catch (err) {
      toast.error(err.message || 'Gagal memproses pengembalian barang.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseReturn = () => {
    setSelectedBorrowing(null);
    setSelectedComponent(null);
    setReturnReceipt(null);
  };

  const activeBorrowings = borrowings.filter((b) => b.status === 'DIPINJAM');
  const returnedBorrowings = borrowings.filter((b) => b.status === 'DIKEMBALIKAN');

  // =========================================================================
  // RENDER RECEIPT VIEW (Matching Screenshot 3)
  // =========================================================================
  if (returnReceipt) {
    const borrowerText = `${profile?.full_name || selectedBorrowing?.borrowerName || 'Akira Tomoe'} · NIM ${profile?.identity_number || selectedBorrowing?.nim || '2210511045'} · ${profile?.study_program || 'Teknik Informatika'} · Universitas`;
    const userEmail = user?.email || profile?.email || selectedBorrowing?.borrowerEmail || 'akira.tomoe@un.ac.id';

    return (
      <div className="return-success-page" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '3rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Pengembalian berhasil
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>
            Komponen kini sudah kembali ke inventori kampus.
          </p>
        </div>

        <div className="card" style={{ padding: '2.5rem', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 800 }}>
              Komponen dikembalikan berhasil
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Status:</span>
              <span
                style={{
                  backgroundColor: 'var(--status-available-badge)',
                  color: '#FFFFFF',
                  padding: '0.25rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em'
                }}
              >
                TERSEDIA
              </span>
            </div>
          </div>

          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '1.75rem' }}>
            {returnReceipt.receiptCode} · Dicatat {returnReceipt.recordedDate}
          </p>

          <table className="custom-table" style={{ margin: '0 0 1.5rem 0', border: '1px solid var(--color-border)' }}>
            <tbody>
              <tr>
                <td style={{ width: '32%', color: 'var(--color-text-secondary)' }}>Komponen</td>
                <td><strong>{returnReceipt.borrowing?.componentName || 'Sensor DHT22'}</strong></td>
              </tr>
              <tr>
                <td style={{ color: 'var(--color-text-secondary)' }}>ID komponen</td>
                <td>{returnReceipt.borrowing?.componentCode || 'SNS-00324'}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--color-text-secondary)' }}>Jumlah</td>
                <td>{returnReceipt.borrowing?.quantity || 1} unit</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--color-text-secondary)' }}>Dikembalikan oleh</td>
                <td>{borrowerText}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--color-text-secondary)' }}>Lokasi pengembalian</td>
                <td>{returnReceipt.component?.location || 'Lab Sistem Tertanam'} · Meja layanan</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--color-text-secondary)' }}>Kondisi</td>
                <td>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.2rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      backgroundColor: returnReceipt.condition === 'Rusak' ? '#FEE2E2' : 'var(--status-available-bg)',
                      color: returnReceipt.condition === 'Rusak' ? '#991B1B' : 'var(--status-available-text)'
                    }}
                  >
                    {returnReceipt.condition}
                  </span>
                </td>
              </tr>
              <tr>
                <td style={{ color: 'var(--color-text-secondary)' }}>Dikembalikan pada</td>
                <td>{returnReceipt.returnDateStr}</td>
              </tr>
            </tbody>
          </table>

          <div
            style={{
              backgroundColor: 'var(--color-bg-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.875rem 1.25rem',
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              marginBottom: '2rem'
            }}
          >
            Bukti pengembalian telah dikirim ke <strong>{userEmail}</strong>.
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="button"
              className="btn-primary"
              style={{ flex: 1, padding: '0.75rem' }}
              onClick={() => navigate('/dashboard')}
            >
              Dashboard
            </button>
            <button
              type="button"
              className="btn-outline"
              style={{ flex: 1, padding: '0.75rem' }}
              onClick={() => {
                handleCloseReturn();
                setActiveTab('riwayat');
              }}
            >
              Peminjaman Saya
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER RETURN FORM (Matching Screenshot 1)
  // =========================================================================
  if (selectedBorrowing && selectedComponent) {
    return (
      <div className="return-form-page" style={{ maxWidth: '1050px', margin: '0 auto', paddingBottom: '3rem' }}>
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Pengembalian komponen
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>
            Konfirmasi item dan catat kondisi komponen sebelum dikembalikan.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '2rem', alignItems: 'start' }}>
          {/* Left Column: Selected Loan Card */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
              PEMINJAMAN DIPILIH
            </p>

            <div
              style={{
                backgroundColor: '#27272A',
                borderRadius: 'var(--radius-md)',
                height: '180px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                marginBottom: '1.25rem'
              }}
            >
              <img
                src={selectedComponent.image || '/assets/images/dht22.png'}
                alt={selectedComponent.name}
                style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
              />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.375rem' }}>
              {selectedComponent.name}
            </h3>

            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
              {selectedBorrowing.componentCode} · {selectedBorrowing.id} · {selectedBorrowing.quantity} unit
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <span
                style={{
                  backgroundColor: '#EA580C',
                  color: '#FFFFFF',
                  padding: '0.25rem 0.625rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase'
                }}
              >
                DIPINJAM
              </span>
            </div>

            <div
              style={{
                backgroundColor: 'var(--color-bg-subtle)',
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                lineHeight: 1.6,
                color: 'var(--color-text-secondary)'
              }}
            >
              <p>Dipinjam: <strong>{selectedBorrowing.borrowDate}</strong></p>
              <p>Jatuh tempo: <strong>{selectedBorrowing.dueDate}</strong></p>
              <p>Kembalikan ke: <strong>{selectedBorrowing.pickupLab || 'Lab Sistem Tertanam'}</strong></p>
            </div>
          </div>

          {/* Right Column: Checklist & Condition Card */}
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: '0.25rem' }}>
              Checklist kondisi
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Periksa komponen dan aksesori sebelum dikembalikan.
            </p>

            <form onSubmit={handleConfirmReturn} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Checklist Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {DEFAULT_CHECKLIST_ITEMS.map((text, idx) => {
                  const isChecked = Boolean(checklist[idx]);
                  return (
                    <div
                      key={idx}
                      onClick={() => handleToggleChecklist(idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: isChecked ? 'var(--color-primary)' : 'transparent',
                          border: `2px solid ${isChecked ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                          flexShrink: 0,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isChecked && <Check size={12} strokeWidth={3} />}
                      </div>
                      <span style={{ fontSize: '0.875rem', color: 'var(--color-text-main)', fontWeight: isChecked ? 500 : 400 }}>
                        {text}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Kondisi Umum Buttons */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.625rem' }}>
                  Kondisi umum
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setReturnCondition('Berfungsi')}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: returnCondition === 'Berfungsi' ? 'var(--color-primary)' : '#FFFFFF',
                      color: returnCondition === 'Berfungsi' ? '#FFFFFF' : 'var(--color-text-main)',
                      border: `1px solid ${returnCondition === 'Berfungsi' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Berfungsi
                  </button>
                  <button
                    type="button"
                    onClick={() => setReturnCondition('Rusak')}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: returnCondition === 'Rusak' ? '#DC2626' : '#FFFFFF',
                      color: returnCondition === 'Rusak' ? '#FFFFFF' : 'var(--color-text-main)',
                      border: `1px solid ${returnCondition === 'Rusak' ? '#DC2626' : 'var(--color-border)'}`,
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Rusak
                  </button>
                </div>
              </div>

              {/* Catatan Pengembalian (Opsional) */}
              <div>
                <label htmlFor="ret-notes" style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Catatan pengembalian (opsional)
                </label>
                <textarea
                  id="ret-notes"
                  rows="3"
                  placeholder="Tambahkan informasi tambahan untuk staf lab..."
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="form-input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={handleCloseReturn}
                  disabled={isSubmitting}
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner" style={{ marginRight: '0.5rem' }} /> Memproses...
                    </>
                  ) : (
                    'Kembalikan komponen'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER NORMAL BORROWINGS LIST & HISTORY TAB
  // =========================================================================
  const isStaff = profile?.role === 'admin' || profile?.role === 'dosen';

  return (
    <div className="borrowings-page">
      <div className="dashboard-header">
        <div className="dashboard-header-title">
          <h1>{isStaff ? 'Riwayat Peminjaman Laboratorium' : 'Peminjaman Saya'}</h1>
          <p>
            {isStaff
              ? 'Pantau permohonan peminjaman aktif dan riwayat pengembalian aset laboratorium'
              : 'Kelola daftar komponen yang sedang Anda pinjam dan riwayat transaksi laboratorium'}
          </p>
        </div>
        <Link to="/components" className="btn-primary">
          Pinjam Komponen Baru
        </Link>
      </div>

      {/* Error state with retry */}
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
          <AlertCircle size={36} color="#DC2626" style={{ margin: '0 auto 0.5rem' }} />
          <h3 style={{ color: '#991B1B', fontWeight: 700, marginBottom: '0.5rem', fontSize: '1rem' }}>
            Gagal Memuat Transaksi Peminjaman
          </h3>
          <p style={{ color: '#B91C1C', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>
          <button type="button" onClick={loadData} className="btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
            ↻ Coba Lagi
          </button>
        </div>
      )}

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

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          <span className="spinner spinner-primary" style={{ marginRight: '0.5rem' }} /> Memuat riwayat peminjaman...
        </div>
      ) : activeTab === 'aktif' ? (
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
                        {item.componentCode} · {item.purpose || 'Praktikum IoT'}
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
                        onClick={() => handleOpenReturnForm(item)}
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
      ) : (
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
                      <strong>
                        <Link to={`/components/${item.componentId}`} style={{ color: 'var(--color-primary)' }}>
                          {item.componentName}
                        </Link>
                      </strong>
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
                            item.returnCondition === 'Baik' || item.returnCondition === 'Berfungsi'
                              ? 'var(--status-available-bg)'
                              : '#FEF3C7',
                          color:
                            item.returnCondition === 'Baik' || item.returnCondition === 'Berfungsi'
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
          Komponen yang dikembalikan dalam kondisi Berfungsi/Baik akan segera ditambahkan kembali ke stok siap pakai inventaris kampus. Transaksi yang telah selesai tidak pernah dihapus guna mempertahankan audit log peminjaman laboratorium.
        </p>
      </div>
    </div>
  );
}
