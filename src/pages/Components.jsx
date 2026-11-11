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

  const categories = ['Semua', 'Mikrokontroler', 'Sensor', 'Modul', 'Aksesoris', 'Aktuator'];
  const statuses = [
    'Semua',
    'Tersedia',
    'Sebagian Dipinjam',
    'Sedang Dipinjam',
    'Dalam Pemeriksaan',
    'Tidak Tersedia'
  ];

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

    let matchesStatus = true;
    if (selectedStatus !== 'Semua') {
      const selUpper = selectedStatus.toUpperCase();
      const compUpper = (comp.status || '').toUpperCase();

      if (selUpper === 'TERSEDIA') {
        matchesStatus = compUpper === 'TERSEDIA';
      } else if (selUpper === 'SEBAGIAN DIPINJAM') {
        matchesStatus = compUpper === 'SEBAGIAN DIPINJAM';
      } else if (selUpper === 'SEDANG DIPINJAM' || selUpper === 'DIPINJAM') {
        matchesStatus = compUpper === 'SEDANG DIPINJAM' || compUpper === 'DIPINJAM';
      } else if (selUpper === 'DALAM PEMERIKSAAN') {
        matchesStatus = compUpper === 'DALAM PEMERIKSAAN' || compUpper === 'MAINTENANCE';
      } else if (selUpper === 'TIDAK TERSEDIA') {
        matchesStatus = compUpper === 'TIDAK TERSEDIA' || compUpper === 'HABIS' || comp.isActive === false;
      } else {
        matchesStatus = compUpper === selUpper;
      }
    }

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

      {/* Error State dengan Tombol Coba Lagi */}
      {error && (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA'
          }}
        >
          <AlertTriangle size={48} color="#DC2626" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: '#991B1B', fontWeight: 700, marginBottom: '0.5rem' }}>
            Gagal Memuat Katalog Komponen
          </h3>
          <p style={{ color: '#B91C1C', marginBottom: '1.5rem' }}>{error}</p>
          <button
            type="button"
            onClick={loadData}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} /> Coba Lagi
          </button>
        </div>
      )}

      {/* Loading Skeleton Grid */}
      {isLoading && (
        <div className="component-grid">
          {[...Array(6)].map((_, i) => (
            <ComponentSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredComponents.length === 0 && (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '4rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <SearchX size={56} color="var(--color-text-muted)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            Komponen tidak ditemukan
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px', marginBottom: '1.5rem' }}>
            Tidak ada komponen yang cocok dengan kata kunci &quot;{globalSearchTerm}&quot; atau filter yang Anda pilih.
          </p>
          <button type="button" onClick={handleResetFilter} className="btn-outline">
            Reset Semua Filter
          </button>
        </div>
      )}

      {/* Component Grid */}
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

      {/* Modal Peminjaman Cepat */}
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
