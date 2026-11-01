import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';

export default function ComponentItem({ component, onBorrow }) {
  // Komponen dapat dipinjam jika terdapat sisa stok tersedia (> 0) dan komponen berstatus aktif
  const canBorrow = (component.stock || 0) > 0 && component.isActive !== false;

  const getButtonLabel = () => {
    if (canBorrow) return 'Pinjam Komponen';
    if (component.status === 'Dalam Pemeriksaan') return 'Dalam Pemeriksaan';
    if (component.status === 'Tidak Tersedia' || !component.isActive) return 'Tidak Tersedia';
    return 'Sedang Dipinjam';
  };

  return (
    <article className="component-card">
      <Link to={`/components/${component.id}`} style={{ display: 'block' }}>
        <div className="component-card-image">
          <img src={component.image} alt={component.name} />
        </div>
      </Link>
      <div className="component-card-body">
        <h3>
          <Link to={`/components/${component.id}`}>{component.name}</Link>
        </h3>
        <p className="category">{component.category}</p>

        <div className="component-card-footer" style={{ marginBottom: '0.75rem' }}>
          <span className="stock-text">
            Stok {component.stock} unit
            {component.totalStock > component.stock
              ? ` (Total ${component.totalStock})`
              : ''}
          </span>
          <StatusBadge status={component.status} />
        </div>

        {/* Tombol Aksi Peminjaman */}
        <button
          type="button"
          className={canBorrow ? "btn-primary" : "btn-outline"}
          disabled={!canBorrow}
          onClick={onBorrow}
          style={{ width: '100%', fontSize: '0.875rem', padding: '0.5rem 1rem' }}
        >
          {getButtonLabel()}
        </button>
      </div>
    </article>
  );
}
