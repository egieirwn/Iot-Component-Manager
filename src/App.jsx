import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/common/ProtectedRoute';

// Public and Auth Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AuthCallback from './pages/AuthCallback';
import CompleteProfile from './pages/CompleteProfile';

// Authenticated Application Pages
import Dashboard from './pages/Dashboard';
import Components from './pages/Components';
import ComponentDetail from './pages/ComponentDetail';
import BorrowForm from './pages/BorrowForm';
import BorrowConfirmation from './pages/BorrowConfirmation';
import Borrowings from './pages/Borrowings';
import Profile from './pages/Profile';
import AdminInventory from './pages/admin/AdminInventory';
import RoleRequests from './pages/admin/RoleRequests';

export default function App() {
  return (
    <Routes>
      {/* Landing and Public Auth Pages */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Complete Profile Guarded Route (Requires Auth, but allows incomplete profile) */}
      <Route
        path="/complete-profile"
        element={
          <ProtectedRoute requireCompletedProfile={false}>
            <CompleteProfile />
          </ProtectedRoute>
        }
      />

      {/* Main Authenticated Layout Pages (Requires Auth + Completed Profile) */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/components" element={<Components />} />
        <Route path="/components/:id" element={<ComponentDetail />} />
        <Route path="/borrow/:id" element={<BorrowForm />} />
        <Route path="/borrow-confirmation" element={<BorrowConfirmation />} />
        <Route path="/borrowings" element={<Borrowings />} />
        <Route path="/profile" element={<Profile />} />

        {/* Admin Only Routes (Guarded by allowedRoles={['admin']}) */}
        <Route
          path="/admin/inventory"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminInventory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/role-requests"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <RoleRequests />
            </ProtectedRoute>
          }
        />
        <Route path="/admin/users" element={<Navigate to="/admin/role-requests" replace />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
