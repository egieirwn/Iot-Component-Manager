import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Components from './pages/Components';
import ComponentDetail from './pages/ComponentDetail';
import BorrowForm from './pages/BorrowForm';
import BorrowConfirmation from './pages/BorrowConfirmation';
import Borrowings from './pages/Borrowings';

export default function App() {
  return (
    <Routes>
      {/* Landing and Auth Pages */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Main Authenticated Layout Pages */}
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/components" element={<Components />} />
        <Route path="/components/:id" element={<ComponentDetail />} />
        <Route path="/borrow/:id" element={<BorrowForm />} />
        <Route path="/borrow-confirmation" element={<BorrowConfirmation />} />
        <Route path="/borrowings" element={<Borrowings />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
