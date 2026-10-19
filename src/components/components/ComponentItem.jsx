import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';

export default function ComponentItem({ component }) {
  const isAvailable = component.status?.toUpperCase() === 'TERSEDIA';

  return (
    <article className="component-card">
      <div className="component-card-image">
        <img src={component.image} alt={component.name} />
      </div>
      <div className="component-card-body">
        <h3>
          <Link to={`/components/${component.id}`}>{component.name}</Link>
        </h3>
        <p className="category">{component.category}</p>

        <div className="component-card-footer">
          <span className="stock-text">Stok {component.stock} unit</span>
          <StatusBadge status={component.status} />
        </div>
      </div>
    </article>
  );
}
