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
      borrowerName: (newLoanData.borrowerName || '').trim(),
      nim: (newLoanData.nim || newLoanData.borrowerNim || '').trim(),
      borrowDate: newLoanData.borrowDate,
      durationDays: duration,
      dueDate: dueDateStr,
      remainingDays: `${duration} hari tersisa`,
      quantity: Number(newLoanData.quantity) || 1,
      purpose: (newLoanData.purpose || newLoanData.notes || 'Praktikum IoT').trim(),
      pickupLab: 'Lab Sistem Tertanam',
      notes: (newLoanData.notes || '').trim(),
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

// ==========================================================================
// Asynchronous Service Methods (Simulasi Latensi Jaringan untuk UX States)
// ==========================================================================

export const fetchComponents = async (simulateError = false) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (simulateError) {
        reject(new Error('Gagal memuat katalog komponen dari server. Silakan coba lagi.'));
      } else {
        resolve(getStoredComponents());
      }
    }, 450);
  });
};

export const fetchComponentById = async (id) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const list = getStoredComponents();
      const found = list.find((c) => c.id === id);
      if (found) {
        resolve(found);
      } else {
        reject(new Error(`Komponen dengan ID "${id}" tidak ditemukan.`));
      }
    }, 350);
  });
};

export const fetchBorrowings = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getStoredBorrowings());
    }, 350);
  });
};

export const processBorrowing = async (borrowData) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const allComponents = getStoredComponents();
      const comp = allComponents.find((c) => c.id === borrowData.componentId);

      if (!comp) {
        return reject(new Error('Komponen tidak ditemukan di inventaris.'));
      }

      const qty = Number(borrowData.quantity) || 1;
      if (comp.stock < qty) {
        return reject(new Error(`Stok tidak mencukupi! Tersisa ${comp.stock} unit, diminta ${qty} unit.`));
      }

      // 1. Potong stok komponen
      const remainingStock = Math.max(0, comp.stock - qty);
      const updatedComponents = allComponents.map((c) => {
        if (c.id === comp.id) {
          return {
            ...c,
            stock: remainingStock,
            status: remainingStock === 0 ? 'DIPINJAM' : 'TERSEDIA'
          };
        }
        return c;
      });
      saveStoredComponents(updatedComponents);

      // 2. Simpan catatan peminjaman
      const currentBorrowings = getStoredBorrowings();
      const startDate = new Date(borrowData.borrowDate || Date.now());
      const duration = Number(borrowData.durationDays) || 3;
      let dueDateStr = borrowData.returnDate;
      if (!dueDateStr) {
        const dueDateObj = new Date(startDate);
        dueDateObj.setDate(dueDateObj.getDate() + duration);
        dueDateStr = dueDateObj.toISOString().split('T')[0];
      }

      const newBorrowing = {
        id: `BRW-${Date.now()}`,
        componentId: comp.id,
        componentName: comp.name,
        componentCode: comp.code || 'IOT-DEV',
        category: comp.category,
        borrowerName: (borrowData.borrowerName || '').trim(),
        nim: (borrowData.nim || borrowData.borrowerNim || '').trim(),
        borrowerEmail: (borrowData.borrowerEmail || '').trim(),
        borrowDate: borrowData.borrowDate || new Date().toISOString().split('T')[0],
        durationDays: duration,
        dueDate: dueDateStr,
        remainingDays: `${duration} hari tersisa`,
        quantity: qty,
        purpose: (borrowData.purpose || borrowData.notes || 'Praktikum IoT').trim(),
        pickupLab: comp.location ? comp.location.split('·')[0].trim() : 'Lab Sistem Tertanam',
        notes: (borrowData.notes || '').trim(),
        status: 'DIPINJAM',
        createdAt: new Date().toISOString()
      };

      const updatedBorrowings = [newBorrowing, ...currentBorrowings];
      saveStoredBorrowings(updatedBorrowings);

      resolve({ success: true, borrowing: newBorrowing, updatedComponents });
    }, 400);
  });
};

export const processReturn = async ({ borrowId, condition = 'Baik', notes = '' }) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const borrowings = getStoredBorrowings();
      const targetBorrow = borrowings.find((b) => b.id === borrowId);
      if (!targetBorrow) {
        return reject(new Error('Transaksi peminjaman tidak ditemukan.'));
      }

      const returnDateStr = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      // Update status peminjaman (TIDAK dihapus dari array!)
      const updatedBorrowings = borrowings.map((b) => {
        if (b.id === borrowId) {
          return {
            ...b,
            status: 'DIKEMBALIKAN',
            returnDate: returnDateStr,
            returnCondition: condition,
            returnNotes: notes || `Komponen dikembalikan dengan kondisi: ${condition}`
          };
        }
        return b;
      });
      saveStoredBorrowings(updatedBorrowings);

      // Update stok komponen
      const components = getStoredComponents();
      const updatedComponents = components.map((c) => {
        if (c.id === targetBorrow.componentId) {
          let newStock = c.stock;
          let newMaintenance = c.maintenanceStock || 0;
          let newDamaged = c.damagedStock || 0;
          const qty = Number(targetBorrow.quantity) || 1;

          if (condition === 'Baik') {
            newStock += qty;
          } else if (condition === 'Perlu Pengecekan') {
            newMaintenance += qty;
          } else if (condition === 'Rusak') {
            newDamaged += qty;
          }

          return {
            ...c,
            stock: newStock,
            maintenanceStock: newMaintenance,
            damagedStock: newDamaged,
            status: newStock > 0 ? 'TERSEDIA' : 'DIPINJAM'
          };
        }
        return c;
      });
      saveStoredComponents(updatedComponents);

      resolve({ success: true, updatedBorrowings, updatedComponents });
    }, 350);
  });
};