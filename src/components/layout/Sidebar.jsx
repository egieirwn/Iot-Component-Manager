import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Cpu, ClipboardList } from 'lucide-react';

export default function Sidebar() {
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
          <span>Komponen</span>
        </NavLink>

        <NavLink
          to="/borrowings"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <ClipboardList size={20} />
          <span>Peminjaman Saya</span>
        </NavLink>
      </nav>

      <div className="sidebar-help-card">
        <h4>Butuh bantuan?</h4>
        <p>Hubungi administrator lab kampus untuk bantuan inventaris atau masalah akun.</p>
      </div>
    </aside>
  );
}
