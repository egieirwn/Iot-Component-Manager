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

export const getStoredUser = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : currentUser;
  } catch {
    return currentUser;
  }
};
