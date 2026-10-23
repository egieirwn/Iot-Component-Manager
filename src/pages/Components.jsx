import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import ComponentItem from '../components/components/ComponentItem';
import BorrowModal from '../components/components/BorrowModal';
import { 
  getStoredComponents, 
  saveStoredComponents, 
  addLoanRecord 
} from '../services/componentService';

export default function Components() {
  const [components, setComponents] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua');
  
  // State pemicu modal
  const [selectedComponentForBorrow, setSelectedComponentForBorrow] = useState(null);

  const context = useOutletContext() || {};
  const globalSearchTerm = context.searchTerm || '';
  const setGlobalSearchTerm = context.setSearchTerm || (() => {});

  useEffect(() => {
    setComponents(getStoredComponents());
  }, []);

  const categories = ['Semua', 'Mikrokontroler', 'Sensor', 'Modul', 'Aksesoris'];
  const statuses = ['Semua', 'TERSEDIA', 'DIPINJAM'];

  const filteredComponents = components.filter((comp) => {
    const query = globalSearchTerm.toLowerCase().trim();

    const matchesSearch =
      comp.name?.toLowerCase().includes(query) ||
      comp.code?.toLowerCase().includes(query) ||
      comp.category?.toLowerCase().includes(query) ||
      comp.status?.toLowerCase().includes(query);

    const matchesCategory =
      selectedCategory === 'Semua' || comp.category === selectedCategory;

    const matchesStatus =
      selectedStatus === 'Semua' || comp.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleResetFilter = () => {
    setGlobalSearchTerm('');
    setSelectedCategory('Semua');
    setSelectedStatus('Semua');
  };

  // Handler saat peminjaman dikonfirmasi
  const handleBorrowSuccess = (borrowData) => {
    // 1. Update status komponen di state & localStorage katalog
    const updatedComponents = components.map((comp) => {
      if (comp.id === borrowData.componentId) {
        return { ...comp, status: 'DIPINJAM' };
      }
      return comp;
    });

    setComponents(updatedComponents);
    saveStoredComponents(updatedComponents);

    // 2. Simpan transaksi peminjaman baru ke localStorage riwayat (campus_iot_borrowings)
    addLoanRecord(borrowData);
  };

  return (
    <div className="components-page">
      <div className="dashboard-header">
        <div className="dashboard-header-title">
          <h1>Katalog Komponen IoT</h1>
          <p>Cari, telusuri spesifikasi, dan pinjam perangkat keras laboratorium</p>
        </div>
      </div>

      {/* Control Filter & Input Search Lokal */}
      <div
        className="card"
        style={{
          marginBottom: '2rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* Input Pencarian Katalog */}
        <div style={{ flex: '1 1 280px' }}>
          <input
            type="text"
            placeholder="Cari nama, kode, atau spesifikasi..."
            value={globalSearchTerm}
            onChange={(e) => setGlobalSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-subtle, #f8fafc)',
              color: 'var(--color-text-main)',
              outline: 'none',
              fontSize: '0.9rem'
            }}
          />
        </div>

        {/* Dropdown Kategori & Status */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '0.625rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-surface)',
              color: 'var(--color-text-main)',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                Kategori: {cat}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              padding: '0.625rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-surface)',
              color: 'var(--color-text-main)',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            {statuses.map((stat) => (
              <option key={stat} value={stat}>
                Status: {stat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
        Menampilkan <strong>{filteredComponents.length}</strong> dari {components.length} komponen
      </div>

      {/* Grid Komponen */}
      {filteredComponents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Tidak ada komponen yang cocok dengan kata kunci atau filter yang Anda pilih.
          </p>
          <button
            type="button"
            className="btn-outline"
            onClick={handleResetFilter}
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="component-grid">
          {filteredComponents.map((comp) => (
            <ComponentItem
              key={comp.id}
              component={comp}
              onBorrow={() => setSelectedComponentForBorrow(comp)}
            />
          ))}
        </div>
      )}

      {/* Render Modal Pop-Up */}
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