import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, UserCheck, UserX, Clock, Search, RefreshCw, AlertCircle, X, Check, FileText } from 'lucide-react';
import { fetchRoleRequests, reviewRoleRequest } from '../../services/roleService';
import { useToast } from '../../components/common/Toast';

export default function RoleRequests() {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('pending'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [searchQuery, setSearchQuery] = useState('');

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedUserForReject, setSelectedUserForReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchRoleRequests();
      setRequests(data);
    } catch (err) {
      setError(err.message || 'Gagal memuat data pengajuan role.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleApprove = async (user) => {
    if (!window.confirm(`Konfirmasi persetujuan: Apakah Anda yakin ingin menyetujui peran Dosen untuk "${user.full_name || 'pengguna ini'}"?`)) {
      return;
    }

    try {
      await reviewRoleRequest({
        targetUserId: user.id,
        action: 'approve'
      });
      toast.success(`Pengajuan role Dosen untuk "${user.full_name}" berhasil disetujui!`);
      loadRequests();
    } catch (err) {
      toast.error(err.message || 'Gagal menyetujui pengajuan.');
    }
  };

  const openRejectModal = (user) => {
    setSelectedUserForReject(user);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      toast.error('Alasan penolakan pengajuan wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      await reviewRoleRequest({
        targetUserId: selectedUserForReject.id,
        action: 'reject',
        rejectionReason: rejectionReason.trim()
      });
      toast.success(`Pengajuan role untuk "${selectedUserForReject.full_name}" telah ditolak.`);
      setRejectModalOpen(false);
      loadRequests();
    } catch (err) {
      toast.error(err.message || 'Gagal menolak pengajuan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter & Search
  const filteredRequests = requests.filter((req) => {
    const statusMatch =
      filterStatus === 'all' ||
      (filterStatus === 'pending' && req.role_request_status === 'pending') ||
      (filterStatus === 'approved' && req.role_request_status === 'approved') ||
      (filterStatus === 'rejected' && req.role_request_status === 'rejected');

    const q = searchQuery.toLowerCase().trim();
    const searchMatch =
      !q ||
      req.full_name?.toLowerCase().includes(q) ||
      req.identity_number?.toLowerCase().includes(q) ||
      req.study_program?.toLowerCase().includes(q) ||
      req.faculty?.toLowerCase().includes(q);

    return statusMatch && searchMatch;
  });

  const pendingCount = requests.filter((r) => r.role_request_status === 'pending').length;
  const approvedCount = requests.filter((r) => r.role_request_status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.role_request_status === 'rejected').length;

  return (
    <div className="role-requests-page" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
        <div className="dashboard-header-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1>Verifikasi Pengajuan Role Dosen</h1>
            <span
              style={{
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                padding: '0.2rem 0.625rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              Portal Admin
            </span>
          </div>
          <p>Tinjau dan verifikasi manual identitas akademik (NIP dan Departemen) pemohon hak akses Dosen</p>
        </div>
        <button
          type="button"
          onClick={loadRequests}
          className="btn-outline"
          disabled={isLoading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} className={isLoading ? 'spinner' : ''} /> Segarkan
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #F59E0B' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Menunggu Verifikasi</p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#B45309' }}>{pendingCount}</h3>
            </div>
            <Clock size={32} color="#F59E0B" />
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10B981' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Telah Disetujui</p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#047857' }}>{approvedCount}</h3>
            </div>
            <UserCheck size={32} color="#10B981" />
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #EF4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Ditolak</p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#B91C1C' }}>{rejectedCount}</h3>
            </div>
            <UserX size={32} color="#EF4444" />
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Pengajuan</p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{requests.length}</h3>
            </div>
            <ShieldCheck size={32} color="var(--color-primary)" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { id: 'pending', label: `Menunggu (${pendingCount})` },
              { id: 'approved', label: `Disetujui (${approvedCount})` },
              { id: 'rejected', label: `Ditolak (${rejectedCount})` },
              { id: 'all', label: `Semua (${requests.length})` }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id)}
                className={filterStatus === tab.id ? 'btn-primary' : 'btn-outline'}
                style={{ padding: '0.4rem 0.875rem', fontSize: '0.8125rem', borderRadius: 'var(--radius-md)' }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Cari nama, NIP, atau prodi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2rem', fontSize: '0.8125rem' }}
            />
          </div>
        </div>
      </div>

      {/* Error State with Retry Button */}
      {error && (
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center', marginBottom: '1.5rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
          <AlertCircle size={36} color="#DC2626" style={{ margin: '0 auto 0.5rem' }} />
          <h3 style={{ color: '#991B1B', fontWeight: 700, marginBottom: '0.5rem' }}>Gagal Memuat Data Pengajuan</h3>
          <p style={{ color: '#B91C1C', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>
          <button type="button" onClick={loadRequests} className="btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
            ↻ Coba Lagi
          </button>
        </div>
      )}

      {/* Requests Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <span className="spinner spinner-primary" style={{ width: '2rem', height: '2rem', marginBottom: '0.75rem' }} />
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Memuat pengajuan role dosen...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <UserCheck size={40} color="var(--color-text-muted)" style={{ margin: '0 auto 0.5rem' }} />
            <h4 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Tidak ada permohonan role</h4>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              {filterStatus === 'pending'
                ? 'Semua pengajuan telah diverifikasi oleh staf lab.'
                : 'Tidak ada data pengajuan yang sesuai dengan filter pencarian.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Pemohon & Kontak</th>
                  <th>NIP / Identitas</th>
                  <th>Program Studi & Fakultas</th>
                  <th>Waktu Pengajuan</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Aksi Verifikasi</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => {
                  const isPending = req.role_request_status === 'pending';
                  const isApproved = req.role_request_status === 'approved';
                  const isRejected = req.role_request_status === 'rejected';

                  return (
                    <tr key={req.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: 'var(--radius-full)',
                              backgroundColor: 'var(--color-primary-light)',
                              color: 'var(--color-primary)',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.875rem'
                            }}
                          >
                            {req.full_name ? req.full_name[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <strong style={{ fontSize: '0.875rem', display: 'block' }}>{req.full_name || 'Tanpa Nama'}</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{req.phone || '-'}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <strong style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{req.identity_number || '-'}</strong>
                      </td>

                      <td>
                        <span style={{ fontSize: '0.85rem', display: 'block' }}>{req.study_program || '-'}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{req.faculty || '-'}</span>
                      </td>

                      <td>
                        <span style={{ fontSize: '0.8125rem' }}>
                          {req.created_at
                            ? new Date(req.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })
                            : '-'}
                        </span>
                      </td>

                      <td>
                        {isPending && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                          >
                            <Clock size={12} /> Menunggu
                          </span>
                        )}
                        {isApproved && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: '#D1FAE5',
                              color: '#065F46',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                          >
                            <Check size={12} /> Disetujui
                          </span>
                        )}
                        {isRejected && (
                          <div>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.2rem 0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: '#FEE2E2',
                                color: '#991B1B',
                                fontSize: '0.75rem',
                                fontWeight: 700
                              }}
                            >
                              <X size={12} /> Ditolak
                            </span>
                            {req.role_rejection_reason && (
                              <p style={{ fontSize: '0.75rem', color: '#B91C1C', marginTop: '0.25rem', maxWidth: '200px' }}>
                                Alasan: {req.role_rejection_reason}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        {isPending ? (
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => handleApprove(req)}
                              className="btn-primary"
                              style={{ padding: '0.3rem 0.625rem', fontSize: '0.75rem', backgroundColor: '#10B981', borderColor: '#10B981' }}
                            >
                              Setujui
                            </button>
                            <button
                              type="button"
                              onClick={() => openRejectModal(req)}
                              className="btn-outline"
                              style={{ padding: '0.3rem 0.625rem', fontSize: '0.75rem', color: '#DC2626', borderColor: '#FECACA' }}
                            >
                              Tolak
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {req.role_reviewed_at
                              ? `Ditinjau ${new Date(req.role_reviewed_at).toLocaleDateString('id-ID')}`
                              : 'Selesai'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && selectedUserForReject && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#DC2626' }}>
                Tolak Pengajuan Role Dosen
              </h3>
              <button
                type="button"
                className="toast-close-btn"
                onClick={() => setRejectModalOpen(false)}
                disabled={isSubmitting}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
              Anda akan menolak pengajuan peran Dosen untuk <strong>{selectedUserForReject.full_name}</strong> (NIP: {selectedUserForReject.identity_number || '-'}). Akun ini akan tetap berada pada peran <em>Mahasiswa</em>.
            </p>

            <form onSubmit={handleRejectSubmit}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="reject-reason" className="form-label">
                  Alasan Penolakan *
                </label>
                <textarea
                  id="reject-reason"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Contoh: NIP tidak terdaftar di pangkalan data kepegawaian universitas. Silakan lengkapi dengan SK aktif."
                  className="form-input"
                  disabled={isSubmitting}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  Alasan ini akan ditampilkan secara transparan di profil pemohon agar mereka dapat memperbaiki datanya.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setRejectModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ backgroundColor: '#DC2626', borderColor: '#DC2626' }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner" style={{ marginRight: '0.5rem' }} /> Memproses...
                    </>
                  ) : (
                    'Konfirmasi Penolakan'
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
