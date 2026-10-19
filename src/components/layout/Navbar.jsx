import React from 'react';
import { Search, Bell } from 'lucide-react';
import { currentUser } from '../../data/mockData';

export default function Navbar({ onSearch, searchTerm = '' }) {
  return (
    <header className="topbar">
      <div className="topbar-search">
        <Search className="topbar-search-icon" size={18} />
        <input
          type="search"
          placeholder="Cari komponen, ID, atau kategori..."
          value={searchTerm}
          onChange={(e) => onSearch && onSearch(e.target.value)}
          aria-label="Cari komponen"
        />
      </div>

      <div className="topbar-user">
        <button className="notification-btn" aria-label="Notifikasi" title="Notifikasi">
          <Bell size={20} />
        </button>

        <div className="user-profile">
          <div className="user-avatar" aria-hidden="true">
            {currentUser.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>
          <div className="user-meta">
            <h4>{currentUser.name}</h4>
            <p>NIM {currentUser.nim} · {currentUser.major}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
