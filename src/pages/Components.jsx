import React, { useState, useEffect } from 'react';
import { Search, Filter, SlidersHorizontal } from 'lucide-react';
import ComponentItem from '../components/components/ComponentItem';
import { getStoredComponents } from '../services/componentService';

export default function Components() {
  const [components, setComponents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua');

  useEffect(() => {
    setComponents(getStoredComponents());
  }, []);

  const categories = ['Semua', 'Mikrokontroler', 'Sensor', 'Modul', 'Aksesoris'];
  const statuses = ['Semua', 'TERSEDIA', 'DIPINJAM'];

  // Filter logic
  const filteredComponents = components.filter((comp) => {
    const matchesSearch =
      comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'Semua' || comp.category === selectedCategory;

    const matchesStatus =
      selectedStatus === 'Semua' || comp.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="components-page">
      <div className="dashboard-header">
        <div className="dashboard-header-title">
          <h1>Katalog Komponen IoT</h1>
          <p>Cari, telusuri spesifikasi, dan pinjam perangkat keras laboratorium</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
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
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)'
            }}
          />
          <input
            type="search"
            placeholder="Cari nama komponen, ID, atau kategori..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 1rem 0.625rem 2.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-subtle)',
              outline: 'none'
            }}
          />
        </div>

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

      {/* Results summary */}
      <div style={{ marginBottom: '1.5rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
        Menampilkan <strong>{filteredComponents.length}</strong> dari {components.length} komponen
      </div>

      {/* Components Grid */}
      {filteredComponents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Tidak ada komponen yang cocok dengan kata kunci atau filter yang Anda pilih.
          </p>
          <button
            type="button"
            className="btn-outline"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('Semua');
              setSelectedStatus('Semua');
            }}
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="component-grid">
          {filteredComponents.map((comp) => (
            <ComponentItem key={comp.id} component={comp} />
          ))}
        </div>
      )}
    </div>
  );
}
