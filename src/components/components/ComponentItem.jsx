import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';

export default function ComponentItem({ component, onBorrow }) {
  const isAvailable = component.status?.toUpperCase() === 'TERSEDIA';

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
          <span className="stock-text">Stok {component.stock} unit</span>
          <StatusBadge status={component.status} />
        </div>

        {/* Tombol Aksi Peminjaman (Target 2) */}
        <button
          type="button"
          className={isAvailable ? "btn-primary" : "btn-outline"}
          disabled={!isAvailable}
          onClick={onBorrow}
          style={{ width: '100%', fontSize: '0.875rem', padding: '0.5rem 1rem' }}
        >
          {isAvailable ? 'Pinjam Komponen' : 'Sedang Dipinjam'}
        </button>
      </div>
    </article>
  );
}