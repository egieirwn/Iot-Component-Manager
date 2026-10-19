import React from 'react';

export default function StatusBadge({ status }) {
  const isAvailable = status?.toUpperCase() === 'TERSEDIA';

  return (
    <span className={`badge ${isAvailable ? 'badge-available' : 'badge-borrowed'}`}>
      {status?.toUpperCase()}
    </span>
  );
}
