import React from 'react';

export default function ComponentSkeleton({ count = 6 }) {
  return (
    <div className="component-grid" aria-busy="true" aria-label="Memuat daftar komponen">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="skeleton-card">
          <div className="skeleton skeleton-img" />
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-text" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="skeleton" style={{ width: '35%', height: '14px' }} />
            <div className="skeleton" style={{ width: '25%', height: '22px', borderRadius: 'var(--radius-full)' }} />
          </div>
          <div className="skeleton skeleton-btn" />
        </div>
      ))}
    </div>
  );
}
