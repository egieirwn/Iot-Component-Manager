import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';

export default function MainLayout() {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearch = (term) => {
    setSearchTerm(term);

    // Jika pengguna sedang tidak di halaman komponen dan mulai mengetik,
    // langsung pindahkan secara otomatis ke /components
    if (term.trim() !== '' && location.pathname !== '/components') {
      navigate('/components');
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content-wrapper">
        <Navbar searchTerm={searchTerm} onSearch={handleSearch} />
        
        <main className="page-container">
          <Outlet context={{ searchTerm, setSearchTerm }} />
        </main>
      </div>
    </div>
  );
}