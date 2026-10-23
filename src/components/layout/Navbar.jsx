import React, { useState, useEffect } from 'react';
import { Search, Bell } from 'lucide-react';
import { currentUser } from '../../data/mockData';

export default function Navbar({ onSearch, onSearchSubmit, searchTerm = '' }) {
  const [inputValue, setInputValue] = useState(searchTerm);

  useEffect(() => {
    setInputValue(searchTerm);
  }, [searchTerm]);

  const handleChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSearchSubmit) {
      onSearchSubmit(inputValue);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-search">
        <Search className="topbar-search-icon" size={18} />
        <input
          type="search"
          placeholder="Cari komponen, ID, atau kategori..."
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          aria-label="Cari komponen"
        />
      </div>

      <div className="topbar-user">
        <button className="notification-btn" aria-label="Notifikasi" title="Notifikasi">
          <Bell size={20} />
        </button>

        <div className="user-profile">
          <div className="user-avatar" aria-hidden="true">
            {currentUser?.name
              ? currentUser.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
              : 'U'}
          </div>
          <div className="user-meta">
            <h4>{currentUser?.name || 'User'}</h4>
            <p>NIM {currentUser?.nim || '-'} · {currentUser?.major || '-'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}