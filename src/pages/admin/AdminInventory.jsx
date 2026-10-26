import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  Plus,
  Edit2,
  Trash2,
  Power,
  RefreshCw,
  Search,
  AlertCircle,
  X,
  Check,
  Package,
  Layers,
  AlertTriangle
} from 'lucide-react';
import {
  fetchComponents,
  createComponent,
  updateComponent,
  toggleComponentActive,
  deleteComponent
} from '../../services/componentService';
import { useToast } from '../../components/common/Toast';

const CATEGORIES = ['Mikrokontroler', 'Sensor', 'Modul', 'Aksesoris'];
const CONDITIONS = ['Baik', 'Perlu Pengecekan', 'Rusak'];

export default function AdminInventory() {
  const toast = useToast();
  const [components, setComponents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('Semua');
  const [filterActive, setFilterActive] = useState('all'); // 'all' | 'active' | 'inactive'

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'Mikrokontroler',
    stock: 1,
    totalStock: 1,
    maintenanceStock: 0,
    damagedStock: 0,
    condition: 'Baik',
    location: 'Lab Sistem Tertanam',
    description: '',
    image: '/assets/images/arduino.png',
    tags: '',
    specProcessor: '',
    specConnection: '',
    specIncludes: ''
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Ambil seluruh komponen termasuk yang nonaktif
      const data = await fetchComponents(true);
      setComponents(data);
    } catch (err) {
      setError(err.message || 'Gagal memuat katalog inventaris.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      category: 'Mikrokontroler',
      stock: 1,
      totalStock: 1,
      maintenanceStock: 0,
      damagedStock: 0,
      condition: 'Baik',
      location: 'Lab Sistem Tertanam',
      description: '',
      image: '/assets/images/arduino.png',
      tags: '',
      specProcessor: '',
      specConnection: '',
      specIncludes: ''
    });
    setFormErrors({});
    setEditingId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setModalOpen(true);
  };

  const openEditModal = (comp) => {
    resetForm();
    setModalMode('edit');
    setEditingId(comp.id);
    setFormData({
      code: comp.code || '',
      name: comp.name || '',
      category: comp.category || 'Mikrokontroler',
      stock: comp.stock ?? 0,
      totalStock: comp.totalStock ?? 0,
      maintenanceStock: comp.maintenanceStock ?? 0,
      damagedStock: comp.damagedStock ?? 0,
      condition: comp.condition || 'Baik',
      location: comp.location || '',
      description: comp.description || '',
      image: comp.image || '/assets/images/arduino.png',
      tags: (comp.tags || []).join(', '),
      specProcessor: comp.specs?.prosesor || '',
      specConnection: comp.specs?.koneksi || '',
      specIncludes: comp.specs?.termasuk || ''
    });
    setModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.code.trim()) errs.code = 'Kode komponen wajib diisi (misal: MCU-00101).';
    if (!formData.name.trim()) errs.name = 'Nama komponen wajib diisi.';
    if (isNaN(Number(formData.stock)) || Number(formData.stock) < 0) {
      errs.stock = 'Stok tersedia minimal 0.';
    }
    if (isNaN(Number(formData.totalStock)) || Number(formData.totalStock) < 0) {
      errs.totalStock = 'Total stok minimal 0.';
    }
    if (Number(formData.stock) > Number(formData.totalStock)) {
      errs.stock = 'Stok tersedia tidak boleh melebihi total stok fisik.';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        category: formData.category,
        stock: Number(formData.stock),
        totalStock: Number(formData.totalStock),
        maintenanceStock: Number(formData.maintenanceStock) || 0,
        damagedStock: Number(formData.damagedStock) || 0,
        condition: formData.condition,
        location: formData.location.trim(),
        description: formData.description.trim(),
        image: formData.image,
        tags: formData.tags
          ? formData.tags
              .split(',')
              .map((t) => t.trim().toUpperCase())
              .filter(Boolean)
          : [],
        specs: {
          prosesor: formData.specProcessor.trim(),
          koneksi: formData.specConnection.trim(),
          termasuk: formData.specIncludes.trim()
        }
      };

      if (modalMode === 'create') {
        await createComponent(payload);
        toast.success(`Komponen "${payload.name}" berhasil ditambahkan ke inventaris!`);
      } else {
        await updateComponent(editingId, payload);
        toast.success(`Data komponen "${payload.name}" berhasil diperbarui!`);
      }

      setModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan komponen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (comp) => {
    const newStatus = !comp.isActive;
    const actionText = newStatus ? 'mengaktifkan' : 'menonaktifkan';

    if (
      !window.confirm(
        `Konfirmasi: Anda yakin ingin ${actionText} komponen "${comp.name}"? ${
          !newStatus ? 'Komponen tidak akan tampil pada katalog peminjaman mahasiswa.' : ''
        }`
      )
    ) {
      return;
    }

    try {
      await toggleComponentActive(comp.id, newStatus);
      toast.success(`Komponen "${comp.name}" berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}.`);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Gagal mengubah status keaktifan.');
    }
  };

  const handleDelete = async (comp) => {
    if (
      !window.confirm(
        `PERINGATAN: Apakah Anda yakin ingin menghapus komponen "${comp.name}" (${comp.code}) secara permanen? Tindakan ini dilindungi di level database jika memiliki riwayat peminjaman.`
      )
    ) {
      return;
    }

    try {
      await deleteComponent(comp.id);
      toast.success(`Komponen "${comp.name}" berhasil dihapus dari inventaris.`);
      loadData();
    } catch (err) {
      // Jika terhalang trigger database
      toast.error(err.message || 'Gagal menghapus komponen.');
    }
  };

  // Filtered List
  const filteredComponents = components.filter((comp) => {
    const matchesCategory = filterCategory === 'Semua' || comp.category === filterCategory;
    const matchesActive =
      filterActive === 'all' ||
      (filterActive === 'active' && comp.isActive) ||
      (filterActive === 'inactive' && !comp.isActive);

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      comp.name?.toLowerCase().includes(q) ||
      comp.code?.toLowerCase().includes(q) ||
      comp.category?.toLowerCase().includes(q) ||
      comp.location?.toLowerCase().includes(q);

    return matchesCategory && matchesActive && matchesSearch;
  });

  const totalPhysicalUnits = components.reduce((acc, c) => acc + (c.totalStock || 0), 0);
  const activeCount = components.filter((c) => c.isActive).length;
  const inactiveCount = components.filter((c) => !c.isActive).length;

  return (
    <div className="admin-inventory-page" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
        <div className="dashboard-header-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1>Manajemen Inventaris Laboratorium</h1>
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
              Administrator
            </span>
          </div>
          <p>Kelola katalog perangkat keras, atur ketersediaan stok, dan nonaktifkan aset secara aman</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={loadData}
            className="btn-outline"
            disabled={isLoading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} className={isLoading ? 'spinner' : ''} /> Segarkan
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} /> Tambah Komponen
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Jenis Komponen</p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{components.length}</h3>
            </div>
            <Layers size={32} color="var(--color-primary)" />
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10B981' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Komponen Aktif</p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#047857' }}>{activeCount}</h3>
            </div>
            <Check size={32} color="#10B981" />
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #6B7280' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Nonaktif (Soft Delete)</p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#4B5563' }}>{inactiveCount}</h3>
            </div>
            <Power size={32} color="#6B7280" />
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3B82F6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Unit Fisik</p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#1D4ED8' }}>{totalPhysicalUnits}</h3>
            </div>
            <Package size={32} color="#3B82F6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Active status buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: `Semua (${components.length})` },
              { id: 'active', label: `Aktif (${activeCount})` },
              { id: 'inactive', label: `Nonaktif (${inactiveCount})` }
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setFilterActive(btn.id)}
                className={filterActive === btn.id ? 'btn-primary' : 'btn-outline'}
                style={{ padding: '0.4rem 0.875rem', fontSize: '0.8125rem', borderRadius: 'var(--radius-md)' }}
              >
                {btn.label}
              </button>
            ))}

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="form-input"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem', width: 'auto' }}
            >
              <option value="Semua">Semua Kategori</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Search box */}
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)'
              }}
            />
            <input
              type="text"
              placeholder="Cari kode, nama, lokasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2rem', fontSize: '0.8125rem' }}
            />
          </div>
        </div>
      </div>

      {/* Error state with retry button */}
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
          <h3 style={{ color: '#991B1B', fontWeight: 700, marginBottom: '0.5rem' }}>Gagal Memuat Inventaris</h3>
          <p style={{ color: '#B91C1C', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>
          <button type="button" onClick={loadData} className="btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
            ↻ Coba Lagi
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <span className="spinner spinner-primary" style={{ width: '2rem', height: '2rem', marginBottom: '0.75rem' }} />
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Memuat seluruh inventaris komponen...</p>
          </div>
        ) : filteredComponents.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Cpu size={40} color="var(--color-text-muted)" style={{ margin: '0 auto 0.5rem' }} />
            <h4 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Tidak ada komponen ditemukan</h4>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              Sesuaikan kata kunci pencarian atau klik "+ Tambah Komponen" untuk mendaftarkan aset baru.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Kode & Komponen</th>
                  <th>Kategori</th>
                  <th>Stok / Total</th>
                  <th>Kondisi & Lokasi</th>
                  <th>Status Keaktifan</th>
                  <th style={{ textAlign: 'right' }}>Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody>
                {filteredComponents.map((comp) => (
                  <tr key={comp.id} style={{ opacity: comp.isActive ? 1 : 0.65 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--color-bg-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            border: '1px solid var(--color-border)'
                          }}
                        >
                          <img
                            src={comp.image || '/assets/images/arduino.png'}
                            alt={comp.name}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                        <div>
                          <strong style={{ fontSize: '0.875rem', display: 'block' }}>{comp.name}</strong>
                          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>
                            {comp.code}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--color-bg-subtle)',
                          fontWeight: 600
                        }}
                      >
                        {comp.category}
                      </span>
                    </td>

                    <td>
                      <div>
                        <strong style={{ fontSize: '0.9375rem', color: comp.stock > 0 ? 'var(--color-primary)' : '#DC2626' }}>
                          {comp.stock}
                        </strong>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}> / {comp.totalStock} unit</span>
                      </div>
                      {(comp.maintenanceStock > 0 || comp.damagedStock > 0) && (
                        <span style={{ fontSize: '0.6875rem', color: '#D97706', display: 'block', marginTop: '0.125rem' }}>
                          {comp.maintenanceStock > 0 ? `Maint: ${comp.maintenanceStock} ` : ''}
                          {comp.damagedStock > 0 ? `Rusak: ${comp.damagedStock}` : ''}
                        </span>
                      )}
                    </td>

                    <td>
                      <span style={{ fontSize: '0.8125rem', display: 'block', fontWeight: 600 }}>{comp.condition}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{comp.location || '-'}</span>
                    </td>

                    <td>
                      {comp.isActive ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: '#D1FAE5',
                            color: '#065F46',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}
                        >
                          <Check size={12} /> Aktif
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: '#F3F4F6',
                            color: '#6B7280',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}
                        >
                          <Power size={12} /> Nonaktif
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => openEditModal(comp)}
                          className="btn-outline"
                          title="Edit Rincian & Stok"
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          <Edit2 size={14} />
                        </button>

                        {/* Toggle Active Button (Soft Delete) */}
                        <button
                          type="button"
                          onClick={() => handleToggleActive(comp)}
                          className="btn-outline"
                          title={comp.isActive ? 'Nonaktifkan dari Katalog Peminjaman' : 'Aktifkan Kembali'}
                          style={{
                            padding: '0.3rem 0.5rem',
                            fontSize: '0.75rem',
                            color: comp.isActive ? '#D97706' : '#10B981',
                            borderColor: comp.isActive ? '#FDE68A' : '#A7F3D0'
                          }}
                        >
                          <Power size={14} />
                        </button>

                        {/* Delete Button (Protected by Trigger) */}
                        <button
                          type="button"
                          onClick={() => handleDelete(comp)}
                          className="btn-outline"
                          title="Hapus Permanen (Dicegah jika ada riwayat pinjam)"
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', color: '#DC2626', borderColor: '#FECACA' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah / Edit Komponen */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>
                {modalMode === 'create' ? 'Tambah Komponen IoT Baru' : 'Perbarui Rincian Komponen'}
              </h3>
              <button type="button" className="toast-close-btn" onClick={() => setModalOpen(false)} disabled={isSubmitting}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                {/* Kode Komponen */}
                <div className="form-group">
                  <label htmlFor="comp-code" className="form-label">
                    Kode Komponen *
                  </label>
                  <input
                    id="comp-code"
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                    placeholder="misal: MCU-00215"
                    className={`form-input ${formErrors.code ? 'has-error' : ''}`}
                    disabled={isSubmitting}
                  />
                  {formErrors.code && <span className="error-text">{formErrors.code}</span>}
                </div>

                {/* Nama Komponen */}
                <div className="form-group">
                  <label htmlFor="comp-name" className="form-label">
                    Nama Komponen *
                  </label>
                  <input
                    id="comp-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="misal: Raspberry Pi Pico W"
                    className={`form-input ${formErrors.name ? 'has-error' : ''}`}
                    disabled={isSubmitting}
                  />
                  {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Kategori */}
                <div className="form-group">
                  <label htmlFor="comp-category" className="form-label">
                    Kategori *
                  </label>
                  <select
                    id="comp-category"
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                    className="form-input"
                    disabled={isSubmitting}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kondisi */}
                <div className="form-group">
                  <label htmlFor="comp-condition" className="form-label">
                    Kondisi Fisik *
                  </label>
                  <select
                    id="comp-condition"
                    value={formData.condition}
                    onChange={(e) => setFormData((prev) => ({ ...prev, condition: e.target.value }))}
                    className="form-input"
                    disabled={isSubmitting}
                  >
                    {CONDITIONS.map((cond) => (
                      <option key={cond} value={cond}>
                        {cond}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stok Quantities */}
              <div
                style={{
                  backgroundColor: 'var(--color-bg-subtle)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.75rem'
                }}
              >
                <div className="form-group">
                  <label htmlFor="comp-stock" className="form-label" style={{ fontSize: '0.75rem' }}>
                    Stok Tersedia *
                  </label>
                  <input
                    id="comp-stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData((prev) => ({ ...prev, stock: e.target.value }))}
                    className={`form-input ${formErrors.stock ? 'has-error' : ''}`}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="comp-total-stock" className="form-label" style={{ fontSize: '0.75rem' }}>
                    Total Stok Fisik *
                  </label>
                  <input
                    id="comp-total-stock"
                    type="number"
                    min="0"
                    value={formData.totalStock}
                    onChange={(e) => setFormData((prev) => ({ ...prev, totalStock: e.target.value }))}
                    className={`form-input ${formErrors.totalStock ? 'has-error' : ''}`}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="comp-maint" className="form-label" style={{ fontSize: '0.75rem' }}>
                    Maintenance
                  </label>
                  <input
                    id="comp-maint"
                    type="number"
                    min="0"
                    value={formData.maintenanceStock}
                    onChange={(e) => setFormData((prev) => ({ ...prev, maintenanceStock: e.target.value }))}
                    className="form-input"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="comp-dmg" className="form-label" style={{ fontSize: '0.75rem' }}>
                    Rusak
                  </label>
                  <input
                    id="comp-dmg"
                    type="number"
                    min="0"
                    value={formData.damagedStock}
                    onChange={(e) => setFormData((prev) => ({ ...prev, damagedStock: e.target.value }))}
                    className="form-input"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              {formErrors.stock && <span className="error-text">{formErrors.stock}</span>}

              {/* Lokasi Rak */}
              <div className="form-group">
                <label htmlFor="comp-location" className="form-label">
                  Lokasi Penyimpanan di Laboratorium
                </label>
                <input
                  id="comp-location"
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="misal: Lab Sistem Tertanam · Lemari B · Rak 02"
                  className="form-input"
                  disabled={isSubmitting}
                />
              </div>

              {/* Spesifikasi Ringkas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label htmlFor="comp-spec-proc" className="form-label" style={{ fontSize: '0.75rem' }}>
                    Prosesor / Chipset
                  </label>
                  <input
                    id="comp-spec-proc"
                    type="text"
                    value={formData.specProcessor}
                    onChange={(e) => setFormData((prev) => ({ ...prev, specProcessor: e.target.value }))}
                    placeholder="misal: RP2040 Dual-Core"
                    className="form-input"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="comp-spec-conn" className="form-label" style={{ fontSize: '0.75rem' }}>
                    Koneksi / Antarmuka
                  </label>
                  <input
                    id="comp-spec-conn"
                    type="text"
                    value={formData.specConnection}
                    onChange={(e) => setFormData((prev) => ({ ...prev, specConnection: e.target.value }))}
                    placeholder="misal: WiFi 802.11n · Micro-USB"
                    className="form-input"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div className="form-group">
                <label htmlFor="comp-desc" className="form-label">
                  Deskripsi Lengkap Komponen
                </label>
                <textarea
                  id="comp-desc"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Penjelasan fungsi, peruntukan praktikum, atau spesifikasi teknis..."
                  className="form-input"
                  disabled={isSubmitting}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn-outline" onClick={() => setModalOpen(false)} disabled={isSubmitting}>
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="spinner" style={{ marginRight: '0.5rem' }} /> Menyimpan...
                    </>
                  ) : modalMode === 'create' ? (
                    'Tambahkan ke Inventaris'
                  ) : (
                    'Simpan Perubahan'
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
