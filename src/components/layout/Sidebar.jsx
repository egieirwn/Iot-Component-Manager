import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Cpu, ClipboardList, PackagePlus, ClipboardCheck, UserCheck, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const { profile } = useAuth();
  const isSuperadmin = profile?.role === 'superadmin';

  return (
    <aside className="sidebar" aria-label="Bilah navigasi utama">
      <div className="sidebar-logo">
        <div className="logo-badge">U</div>
        <div className="logo-text">
          <h2>Campus IoT</h2>
          <span>Universitas</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/components"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Cpu size={20} />
          <span>Katalog Komponen</span>
        </NavLink>

        <NavLink
          to="/borrowings"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <ClipboardList size={20} />
          <span>{isSuperadmin || profile?.role === 'dosen' ? 'Riwayat Peminjaman' : 'Peminjaman Saya'}</span>
        </NavLink>

        {isSuperadmin && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 800,
                color: 'var(--color-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '0 0.875rem',
                display: 'block',
                marginBottom: '0.5rem'
              }}
            >
              Menu Superadmin
            </span>

            <NavLink
              to="/admin/inventory"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <PackagePlus size={20} />
              <span>Kelola Inventaris</span>
            </NavLink>

            <NavLink
              to="/admin/inspections"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <ClipboardCheck size={20} />
              <span>Inspeksi Komponen</span>
            </NavLink>

            <NavLink
              to="/admin/role-requests"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <UserCheck size={20} />
              <span>Verifikasi Dosen</span>
            </NavLink>
          </div>
        )}
      </nav>

      <div className="sidebar-help-card">
        <h4>Butuh bantuan?</h4>
        <p>Hubungi administrator lab kampus untuk bantuan inventaris atau masalah akun.</p>
      </div>
    </aside>
  );
}
