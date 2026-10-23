// Service layer untuk mengelola inventaris komponen dan peminjaman
import { initialComponents, initialBorrowings, currentUser } from '../data/mockData';

const STORAGE_KEYS = {
  COMPONENTS: 'campus_iot_components',
  BORROWINGS: 'campus_iot_borrowings',
  USER: 'campus_iot_user'
};

export const getStoredComponents = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.COMPONENTS);
    return data ? JSON.parse(data) : initialComponents;
  } catch {
    return initialComponents;
  }
};

export const saveStoredComponents = (components) => {
  try {
    localStorage.setItem(STORAGE_KEYS.COMPONENTS, JSON.stringify(components));
  } catch (err) {
    console.error('Failed to save components to localStorage', err);
  }
};

export const getStoredBorrowings = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BORROWINGS);
    return data ? JSON.parse(data) : initialBorrowings;
  } catch {
    return initialBorrowings;
  }
};

export const saveStoredBorrowings = (borrowings) => {
  try {
    localStorage.setItem(STORAGE_KEYS.BORROWINGS, JSON.stringify(borrowings));
  } catch (err) {
    console.error('Failed to save borrowings to localStorage', err);
  }
};

// Hanya data profil yang aman, tanpa password atau token
export const getStoredUser = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    if (data) {
      const parsed = JSON.parse(data);
      // Sanitasi: pastikan tidak ada password atau token
      const { password, token, ...safeUser } = parsed;
      return safeUser;
    }
    return currentUser;
  } catch {
    return currentUser;
  }
};

export const resetToDefaultData = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.COMPONENTS);
    localStorage.removeItem(STORAGE_KEYS.BORROWINGS);
    localStorage.removeItem(STORAGE_KEYS.USER);
  } catch (err) {
    console.error('Failed to reset localStorage data', err);
  }
};

// Fungsi pencatat peminjaman lengkap (mencegah kolom kosong pada tabel riwayat)
export const addLoanRecord = (newLoanData) => {
  try {
    const currentBorrowings = getStoredBorrowings();
    
    // Hitung tanggal jatuh tempo (borrowDate + durationDays)
    const startDate = new Date(newLoanData.borrowDate || Date.now());
    const duration = Number(newLoanData.durationDays) || 3;
    const dueDateObj = new Date(startDate);
    dueDateObj.setDate(dueDateObj.getDate() + duration);
    
    const dueDateStr = dueDateObj.toISOString().split('T')[0];

    const newBorrowing = {
      id: `BRW-${Date.now()}`,
      componentId: newLoanData.componentId,
      componentName: newLoanData.componentName,
      componentCode: newLoanData.componentCode || 'IOT-DEV',
      borrowerName: newLoanData.borrowerName,
      nim: newLoanData.nim,
      borrowDate: newLoanData.borrowDate,
      durationDays: duration,
      dueDate: dueDateStr,
      remainingDays: `${duration} hari tersisa`,
      quantity: 1, // Default 1 unit per peminjaman
      purpose: newLoanData.notes || 'Praktikum IoT',
      pickupLab: 'Lab Sistem Tertanam', // Default nama lab
      notes: newLoanData.notes || '',
      status: 'DIPINJAM',
      createdAt: new Date().toISOString()
    };

    const updatedBorrowings = [newBorrowing, ...currentBorrowings];
    saveStoredBorrowings(updatedBorrowings);
    
    return newBorrowing;
  } catch (err) {
    console.error('Gagal menambahkan data peminjaman:', err);
    return null;
  }
};