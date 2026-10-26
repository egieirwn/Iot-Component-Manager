import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, requireCompletedProfile = true, allowedRoles = null }) {
  const { user, profile, loading, isConfigured } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <span className="spinner spinner-primary" style={{ width: '2rem', height: '2rem', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Memverifikasi sesi...</p>
        </div>
      </div>
    );
  }

  // Jika Supabase aktif dan user belum login
  if (isConfigured && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Jika user sudah login tapi profil belum lengkap
  if (isConfigured && user && profile && !profile.profile_completed && requireCompletedProfile) {
    return <Navigate to="/complete-profile" replace />;
  }

  // Proteksi Role (misal hanya Admin yang boleh mengakses)
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
