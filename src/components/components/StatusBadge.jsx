import React from 'react';

/**
 * StatusBadge Component
 * Menampilkan badge status ketersediaan komponen IoT secara seragam dan responsif:
 * - 'Tersedia' (Hijau)
 * - 'Sebagian Dipinjam' (Biru)
 * - 'Sedang Dipinjam' (Oranye)
 * - 'Dalam Pemeriksaan' (Kuning/Amber)
 * - 'Tidak Tersedia' (Merah)
 * - 'Nonaktif' (Abu-abu)
 */
export default function StatusBadge({ status }) {
  if (!status) return null;

  const normalized = String(status).trim();
  const upper = normalized.toUpperCase();

  let badgeClass = 'badge-available';
  let displayLabel = normalized;

  if (upper === 'TERSEDIA') {
    badgeClass = 'badge-available';
    displayLabel = 'Tersedia';
  } else if (upper === 'SEBAGIAN DIPINJAM') {
    badgeClass = 'badge-partial';
    displayLabel = 'Sebagian Dipinjam';
  } else if (upper === 'SEDANG DIPINJAM') {
    badgeClass = 'badge-borrowed';
    displayLabel = 'Sedang Dipinjam';
  } else if (upper === 'DIPINJAM') {
    badgeClass = 'badge-borrowed';
    displayLabel = 'Dipinjam';
  } else if (upper === 'DALAM PEMERIKSAAN' || upper === 'MAINTENANCE') {
    badgeClass = 'badge-inspection';
    displayLabel = 'Dalam Pemeriksaan';
  } else if (upper === 'MENUNGGU PERSETUJUAN' || upper === 'PENDING') {
    badgeClass = 'badge-inspection';
    displayLabel = 'Menunggu Persetujuan';
  } else if (upper === 'TIDAK TERSEDIA' || upper === 'HABIS') {
    badgeClass = 'badge-unavailable';
    displayLabel = 'Tidak Tersedia';
  } else if (upper === 'TERLAMBAT') {
    badgeClass = 'badge-unavailable';
    displayLabel = 'Terlambat';
  } else if (upper === 'DITOLAK') {
    badgeClass = 'badge-unavailable';
    displayLabel = 'Ditolak';
  } else if (upper === 'SELESAI' || upper === 'KEMBALI' || upper === 'DISETUJUI') {
    badgeClass = 'badge-available';
    displayLabel = upper === 'KEMBALI' ? 'Kembali' : upper === 'DISETUJUI' ? 'Disetujui' : 'Selesai';
  } else if (upper === 'NONAKTIF') {
    badgeClass = 'badge-inactive';
    displayLabel = 'Nonaktif';
  } else {
    badgeClass = 'badge-available';
    displayLabel = normalized;
  }

  return (
    <span className={`badge ${badgeClass}`}>
      {displayLabel}
    </span>
  );
}
