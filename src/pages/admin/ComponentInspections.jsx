import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  Trash2,
  Eye,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  FileText
} from 'lucide-react';
import { fetchInspections, resolveInspection, fetchComponents } from '../../services/componentService';
import { useToast } from '../../components/common/Toast';

export default function ComponentInspections() {
  const toast = useToast();
  const [inspections, setInspections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending_inspection' | 'under_repair' | 'inspected'
  const [searchQuery, setSearchQuery] = useState('');

  // Resolution Modal State
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [selectedDecision, setSelectedDecision] = useState('usable'); // 'usable' | 'under_repair' | 'retired'
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchInspections('all');
      setInspections(data);
    } catch (err) {
      console.error('Error fetching inspections:', err);
      setError(err.message || 'Gagal memuat daftar pemeriksaan komponen.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered lists and metrics
  const pendingItems = inspections.filter((i) => i.inspectionStatus === 'pending_inspection');
  const underRepairItems = inspections.filter((i) => i.inspectionStatus === 'under_repair');
  const inspectedItems = inspections.filter((i) => i.inspectionStatus === 'inspected');

  const filteredInspections = inspections.filter((item) => {
    const matchesStatus = statusFilter === 'all' || item.inspectionStatus === statusFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      item.componentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.componentCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.borrowerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.borrowerNim?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleOpenResolutionModal = (item) => {
    setSelectedInspection(item);
    setSelectedDecision(item.inspectionStatus === 'under_repair' ? 'usable' : 'usable');
    setDecisionNotes(item.decisionNotes || '');
  };

  const handleCloseResolutionModal = () => {
    setSelectedInspection(null);
    setDecisionNotes('');
    setIsSubmitting(false);
  };

  const handleConfirmDecision = async (e) => {
    e.preventDefault();
    if (!selectedInspection) return;

    setIsSubmitting(true);
    try {
      await resolveInspection({
        inspectionId: selectedInspection.id,
        decision: selectedDecision,
        notes: decisionNotes
      });

      toast.success(
        selectedDecision === 'usable'
          ? 'Komponen dinyatakan layak pakai. Unit berhasil dikembalikan ke stok tersedia!'
          : selectedDecision === 'under_repair'
          ? 'Komponen dialihkan ke status perbaikan/maintenance.'
          : 'Komponen berhasil diafkir dan total stok inventaris telah disesuaikan.'
      );

      handleCloseResolutionModal();
      await loadData();
    } catch (err) {
      console.error('Error submitting inspection decision:', err);
      toast.error(err.message || 'Gagal menyimpan keputusan inspeksi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getConditionBadge = (condition) => {
    if (condition === 'Rusak') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.2rem 0.55rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.6875rem',
            fontWeight: 600,
            backgroundColor: '#FEE2E2',
            color: '#991B1B',
            border: '1px solid #FECACA'
          }}
        >
          <AlertTriangle size={12} />
          Rusak
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.2rem 0.55rem',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.6875rem',
          fontWeight: 600,
          backgroundColor: '#FEF3C7',
          color: '#B45309',
          border: '1px solid #FDE68A'
        }}
      >
        <Wrench size={12} />
        Perlu Pengecekan
      </span>
    );
  };

  const getStatusBadge = (status, decision) => {
    if (status === 'pending_inspection') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.2rem 0.55rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.6875rem',
            fontWeight: 600,
            backgroundColor: '#FFEDD5',
            color: '#C2410C',
            border: '1px solid #FED7AA'
          }}
        >
          Menunggu Review
        </span>
      );
    }
    if (status === 'under_repair') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.2rem 0.55rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.6875rem',
            fontWeight: 600,
            backgroundColor: '#E0F2FE',
            color: '#0369A1',
            border: '1px solid #BAE6FD'
          }}
        >
          Sedang Diservis
        </span>
      );
    }
    // Inspected / Resolved
    const decisionLabel =
      decision === 'usable' ? 'Layak Pakai' : decision === 'retired' ? 'Diafkir' : 'Selesai';
    const decisionBg = decision === 'retired' ? '#F3F4F6' : '#DCFCE7';
    const decisionColor = decision === 'retired' ? '#4B5563' : '#15803D';
    const decisionBorder = decision === 'retired' ? '#E5E7EB' : '#BBF7D0';

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.2rem 0.55rem',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.6875rem',
          fontWeight: 600,
          backgroundColor: decisionBg,
          color: decisionColor,
          border: `1px solid ${decisionBorder}`
        }}
      >
        <CheckCircle2 size={12} />
        {decisionLabel}
      </span>
    );
  };

  return (
    <div className="admin-inspections-page" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-title">
          <h1>Inspeksi Pengembalian & Perbaikan</h1>
          <p>
            Kelola verifikasi komponen rusak, putuskan kelayakan pakai, atau jadwalkan perbaikan lab.
          </p>
        </div>
        <button
          type="button"
          className="btn-outline"
          onClick={loadData}
          disabled={isLoading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
        >
          <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
          Segarkan Data
        </button>
      </div>

      {/* Metrics Row */}
      <div className="stat-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #EA580C' }}>
          <h3>Menunggu Pemeriksaan</h3>
          <div className="stat-number" style={{ color: '#EA580C' }}>
            {pendingItems.length}
          </div>
          <div className="stat-subtext">Unit dilaporkan perlu dicek / rusak</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #0284C7' }}>
          <h3>Sedang Diservis</h3>
          <div className="stat-number" style={{ color: '#0284C7' }}>
            {underRepairItems.length}
          </div>
          <div className="stat-subtext">Unit dalam pemeliharaan teknisi</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #16A34A' }}>
          <h3>Selesai Diperiksa</h3>
          <div className="stat-number" style={{ color: '#16A34A' }}>
            {inspectedItems.length}
          </div>
          <div className="stat-subtext">Unit telah diputuskan status akhirnya</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `Semua (${inspections.length})` },
            { id: 'pending_inspection', label: `Menunggu (${pendingItems.length})` },
            { id: 'under_repair', label: `Diservis (${underRepairItems.length})` },
            { id: 'inspected', label: `Selesai (${inspectedItems.length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '0.4rem 0.875rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: statusFilter === tab.id ? 'var(--color-primary)' : 'var(--color-border)',
                backgroundColor: statusFilter === tab.id ? 'var(--color-primary)' : 'transparent',
                color: statusFilter === tab.id ? '#FFFFFF' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '260px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)'
            }}
          />
          <input
            type="text"
            placeholder="Cari komponen atau peminjam..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.45rem 0.75rem 0.45rem 2.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontSize: '0.8125rem'
            }}
          />
        </div>
      </div>

      {/* Main Inspections Table */}
      <div className="table-container">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
            <RefreshCw size={28} className="spin" style={{ marginBottom: '0.5rem' }} />
            <p>Memuat catatan inspeksi...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#DC2626' }}>
            <AlertTriangle size={32} style={{ marginBottom: '0.5rem' }} />
            <p>{error}</p>
          </div>
        ) : filteredInspections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--color-text-muted)' }}>
            <ClipboardCheck size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <p style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--color-text-main)' }}>
              Tidak ada catatan inspeksi yang sesuai.
            </p>
            <p style={{ fontSize: '0.875rem' }}>
              Semua komponen yang dikembalikan dalam kondisi baik atau telah diverifikasi teknisi.
            </p>
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th scope="col">KOMPONEN</th>
                <th scope="col">PEMINJAM</th>
                <th scope="col">KONDISI DILAPORKAN</th>
                <th scope="col">CATATAN MAHASISWA</th>
                <th scope="col">STATUS INSPEKSI</th>
                <th scope="col" style={{ textAlign: 'right' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredInspections.map((item) => (
                <tr key={item.id}>
                  {/* Komponen */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          backgroundColor: '#27272A',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          padding: '0.25rem'
                        }}
                      >
                        <img
                          src={item.componentImage}
                          alt={item.componentName}
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        />
                      </div>
                      <div>
                        <strong>{item.componentName}</strong>
                        <br />
                        <small style={{ color: 'var(--color-text-muted)' }}>
                          {item.componentCode || 'SNS'} · {item.quantity} unit
                        </small>
                      </div>
                    </div>
                  </td>

                  {/* Peminjam */}
                  <td>
                    <strong>{item.borrowerName || 'Mahasiswa'}</strong>
                    <br />
                    <small style={{ color: 'var(--color-text-muted)' }}>
                      NIM {item.borrowerNim || '-'}
                    </small>
                  </td>

                  {/* Kondisi Dilaporkan */}
                  <td>{getConditionBadge(item.reportedCondition)}</td>

                  {/* Catatan Mahasiswa */}
                  <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', maxWidth: '240px' }}>
                    {item.damageNotes ? `"${item.damageNotes}"` : <span style={{ color: 'var(--color-text-muted)' }}>Tidak ada catatan</span>}
                  </td>

                  {/* Status Inspeksi */}
                  <td>{getStatusBadge(item.inspectionStatus, item.decision)}</td>

                  {/* Aksi */}
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className={item.inspectionStatus === 'pending_inspection' ? 'btn-primary' : 'btn-outline'}
                      style={{
                        padding: '0.4rem 0.875rem',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}
                      onClick={() => handleOpenResolutionModal(item)}
                    >
                      {item.inspectionStatus === 'pending_inspection' ? 'Verifikasi & Putuskan' : 'Lihat / Ubah'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* RESOLUTION MODAL */}
      {selectedInspection && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '580px', width: '90%' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                  Pemeriksaan & Keputusan Komponen
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                  ID Transaksi: {selectedInspection.borrowingId || selectedInspection.id}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseResolutionModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Item Summary Card */}
            <div
              style={{
                backgroundColor: 'var(--color-bg-subtle)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                gap: '1rem',
                alignItems: 'center'
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  backgroundColor: '#27272A',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.35rem',
                  flexShrink: 0
                }}
              >
                <img
                  src={selectedInspection.componentImage}
                  alt={selectedInspection.componentName}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              </div>
              <div style={{ flex: 1, fontSize: '0.8125rem' }}>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                  {selectedInspection.componentName}
                </h4>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                  Peminjam: <strong>{selectedInspection.borrowerName}</strong> ({selectedInspection.borrowerNim})
                </p>
                <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                  Kondisi Laporan: {getConditionBadge(selectedInspection.reportedCondition)}
                  {selectedInspection.damageNotes && (
                    <span style={{ fontStyle: 'italic', marginLeft: '0.5rem', color: 'var(--color-text-muted)' }}>
                      "{selectedInspection.damageNotes}"
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Resolution Form */}
            <form onSubmit={handleConfirmDecision}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                  Keputusan Teknisi / Administrator
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Option 1: Usable */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.875rem',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${selectedDecision === 'usable' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      backgroundColor: selectedDecision === 'usable' ? 'rgba(37, 99, 235, 0.04)' : '#FFFFFF',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="usable"
                      checked={selectedDecision === 'usable'}
                      onChange={() => setSelectedDecision('usable')}
                      style={{ marginTop: '0.2rem' }}
                    />
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.875rem', color: 'var(--color-text-main)' }}>
                        Layak Pakai (Tersedia)
                      </strong>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                        Komponen telah dites dan berfungsi normal. Kembalikan unit ke stok tersedia untuk peminjaman.
                      </span>
                    </div>
                  </label>

                  {/* Option 2: Under Repair */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.875rem',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${selectedDecision === 'under_repair' ? '#0284C7' : 'var(--color-border)'}`,
                      backgroundColor: selectedDecision === 'under_repair' ? 'rgba(2, 132, 199, 0.04)' : '#FFFFFF',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="under_repair"
                      checked={selectedDecision === 'under_repair'}
                      onChange={() => setSelectedDecision('under_repair')}
                      style={{ marginTop: '0.2rem' }}
                    />
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.875rem', color: '#0284C7' }}>
                        Perlu Perbaikan / Servis
                      </strong>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                        Unit mengalami kendala dan perlu perbaikan teknis laboratorium. Unit tetap berstatus tidak tersedia.
                      </span>
                    </div>
                  </label>

                  {/* Option 3: Retired */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.875rem',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${selectedDecision === 'retired' ? '#DC2626' : 'var(--color-border)'}`,
                      backgroundColor: selectedDecision === 'retired' ? 'rgba(220, 38, 38, 0.04)' : '#FFFFFF',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="retired"
                      checked={selectedDecision === 'retired'}
                      onChange={() => setSelectedDecision('retired')}
                      style={{ marginTop: '0.2rem' }}
                    />
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.875rem', color: '#DC2626' }}>
                        Afkir / Hapus dari Inventaris
                      </strong>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                        Komponen rusak total permanen dan tidak dapat diperbaiki. Total stok inventaris akan dikurangi.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Notes Input */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Catatan Teknisi / Tindakan Lab (opsional)
                </label>
                <textarea
                  rows="3"
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="Contoh: Modul telah disolder ulang dan dites dengan board ESP32..."
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={handleCloseResolutionModal}
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting}
                  style={{ minWidth: '130px' }}
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Keputusan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
