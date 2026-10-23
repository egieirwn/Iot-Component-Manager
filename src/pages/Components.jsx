import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { RefreshCw, SearchX, AlertTriangle } from 'lucide-react';
import ComponentItem from '../components/components/ComponentItem';
import BorrowModal from '../components/components/BorrowModal';
import ComponentSkeleton from '../components/common/ComponentSkeleton';
import { fetchComponents } from '../services/componentService';

export default function Components() {
  const [components, setComponents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua');

  // State modal pinjam
  const [selectedComponentForBorrow, setSelectedComponentForBorrow] = useState(null);

  const context = useOutletContext() || {};
  const globalSearchTerm = context.searchTerm || '';
  const setGlobalSearchTerm = context.setSearchTerm || (() => {});

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchComponents();
      setComponents(data);
    } catch (err) {
      setError(err.message || 'Gagal memuat data komponen. Coba lagi ↻');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categories = ['Semua', 'Mikrokontroler', 'Sensor', 'Modul', 'Aksesoris'];
  const statuses = ['Semua', 'TERSEDIA', 'DIPINJAM'];

  const filteredComponents = components.filter((comp) => {
    const query = globalSearchTerm.toLowerCase().trim();

    const matchesSearch =
      comp.name?.toLowerCase().includes(query) ||
      comp.code?.toLowerCase().includes(query) ||
      comp.category?.toLowerCase().includes(query) ||
      comp.status?.toLowerCase().includes(query) ||
      comp.description?.toLowerCase().includes(query);

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

  const handleBorrowSuccess = (result) => {
    if (result?.updatedComponents) {
      setComponents(result.updatedComponents);
    } else {
      loadData();
    }
  };

  return (
    <div className="components-page">
      <div className="dashboard-header">
        <div className="dashboard-header-title">
          <h1>Katalog Komponen IoT</h1>
          <p>Cari, telusuri spesifikasi, dan pinjam perangkat keras laboratorium</p>
        </div>
      </div>

      {/* Control Filter & Input Search */}
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
            placeholder="Cari nama, kode, atau spesifikasi komponen..."
            value={globalSearchTerm}
            onChange={(e) => setGlobalSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-subtle)',
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

      {/* Counter Komponen */}
      {!isLoading && !error && (
        <div style={{ marginBottom: '1.5rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          Menampilkan <strong>{filteredComponents.length}</strong> dari {components.length} komponen
        </div>
      )}

      {/* 1. Loading State (Skeleton UX) */}
      {isLoading && <ComponentSkeleton count={6} />}

      {/* 2. Error State dengan Tombol Coba Lagi */}
      {!isLoading && error && (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            border: '1px dashed #FCA5A5',
            backgroundColor: '#FEF2F2'
          }}
        >
          <AlertTriangle size={36} color="#DC2626" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#991B1B', marginBottom: '0.5rem' }}>
            {error}
          </h3>
          <p style={{ color: '#7F1D1D', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Terjadi kendala saat menghubungkan ke sumber data inventaris.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={loadData}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} /> Coba lagi ↻
          </button>
        </div>
      )}

      {/* 3. Empty State saat filter tidak menemukan hasil */}
      {!isLoading && !error && filteredComponents.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
          <SearchX size={44} color="var(--color-text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Yah, komponen tidak ditemukan 🔍
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Tidak ada komponen yang cocok dengan kata kunci <em>"{globalSearchTerm}"</em> atau filter kategori yang dipilih.
          </p>
          <button
            type="button"
            className="btn-outline"
            onClick={handleResetFilter}
          >
            Reset Pencarian &amp; Filter
          </button>
        </div>
      )}

      {/* 4. Grid Komponen Dinamis */}
      {!isLoading && !error && filteredComponents.length > 0 && (
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