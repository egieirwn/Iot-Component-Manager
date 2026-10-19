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
