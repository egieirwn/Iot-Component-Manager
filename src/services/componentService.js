// Service layer untuk mengelola inventaris komponen dan peminjaman
// Supabase PostgreSQL adalah Single Source of Truth untuk seluruh data inventaris dan transaksi.
// Tidak ada fallback silent ke localStorage untuk data inventaris.

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

// Helper mapper: Supabase DB snake_case -> React Component camelCase
/**
 * Menghitung status ketersediaan komponen secara konsisten berdasarkan kuantitas stok:
 * - 'Tersedia': Unit tersedia dan tidak ada yang sedang dipinjam (available > 0, borrowed == 0)
 * - 'Sebagian Dipinjam': Sebagian unit dipinjam, namun stok tersedia masih ada (available > 0, borrowed > 0)
 * - 'Sedang Dipinjam': Seluruh unit yang dapat dipakai sedang dipinjam (available == 0, borrowed > 0)
 * - 'Dalam Pemeriksaan': Unit tidak tersedia karena dalam perbaikan/pemeriksaan (available == 0, borrowed == 0, maint > 0 || dmg > 0)
 * - 'Tidak Tersedia': Tidak ada unit yang tersedia (available == 0, borrowed == 0, maint == 0, dmg == 0, atau isActive == false)
 */
export const calculateAvailabilityStatus = ({
  stock = 0,
  totalStock = 0,
  borrowedStock = 0,
  maintenanceStock = 0,
  damagedStock = 0,
  isActive = true
}) => {
  if (isActive === false) {
    return 'Tidak Tersedia';
  }

  const available = Number(stock) || 0;
  const borrowed = Number(borrowedStock) || 0;
  const maint = Number(maintenanceStock) || 0;
  const dmg = Number(damagedStock) || 0;

  if (available > 0) {
    if (borrowed > 0) {
      return 'Sebagian Dipinjam';
    }
    return 'Tersedia';
  }

  // available === 0
  if (borrowed > 0) {
    return 'Sedang Dipinjam';
  }

  if (maint > 0 || dmg > 0) {
    return 'Dalam Pemeriksaan';
  }

  return 'Tidak Tersedia';
};

export const mapComponentFromDb = (dbComp) => {
  if (!dbComp) return null;

  const stock = Number(dbComp.stock) || 0;
  const totalStock = Number(dbComp.total_stock) || 0;
  const maintenanceStock = Number(dbComp.maintenance_stock) || 0;
  const damagedStock = Number(dbComp.damaged_stock) || 0;
  const isActive = dbComp.is_active !== false;

  // Invariant relasional: totalStock = availableStock + borrowedStock + maintenanceStock + damagedStock
  // Sehingga borrowedStock = max(0, totalStock - availableStock - maintenanceStock - damagedStock)
  const borrowedStock = Math.max(0, totalStock - stock - maintenanceStock - damagedStock);

  // Hitung status ketersediaan yang selalu konsisten dan sinkron
  const status = calculateAvailabilityStatus({
    stock,
    totalStock,
    borrowedStock,
    maintenanceStock,
    damagedStock,
    isActive
  });

  return {
    id: dbComp.id,
    code: dbComp.code,
    name: dbComp.name,
    category: dbComp.category,
    stock, // Stok tersedia untuk dipinjam
    maintenanceStock,
    damagedStock,
    totalStock, // Total fisik milik lab
    borrowedStock, // Unit yang sedang dipinjam
    condition: dbComp.condition || 'Baik',
    status,
    isActive,
    image: dbComp.image || '/assets/images/arduino.png',
    description: dbComp.description || '',
    tags: Array.isArray(dbComp.tags) ? dbComp.tags : [],
    location: dbComp.location || 'Lab Sistem Tertanam',
    specs: dbComp.specs || {},
    borrowerInfo: dbComp.borrower_info || null,
    createdAt: dbComp.created_at,
    updatedAt: dbComp.updated_at
  };
};

export const mapBorrowingFromDb = (dbBorrow) => {
  if (!dbBorrow) return null;
  return {
    id: dbBorrow.id,
    componentId: dbBorrow.component_id,
    componentName: dbBorrow.component_name,
    componentCode: dbBorrow.component_code,
    category: dbBorrow.category || '',
    borrowerName: dbBorrow.borrower_name,
    nim: dbBorrow.borrower_nim,
    borrowerNim: dbBorrow.borrower_nim,
    borrowerEmail: dbBorrow.borrower_email,
    quantity: Number(dbBorrow.quantity) || 1,
    borrowDate: dbBorrow.borrow_date,
    dueDate: dbBorrow.due_date,
    durationDays: dbBorrow.duration_days,
    remainingDays: dbBorrow.remaining_days || '3 hari tersisa',
    pickupLab: dbBorrow.pickup_lab || 'Lab Sistem Tertanam',
    purpose: dbBorrow.purpose || '',
    notes: dbBorrow.notes || '',
    status: dbBorrow.status || 'DIPINJAM',
    returnDate: dbBorrow.return_date || null,
    returnCondition: dbBorrow.return_condition || null,
    returnNotes: dbBorrow.return_notes || null,
    checklist: dbBorrow.checklist || [],
    receiptCode: dbBorrow.receipt_code || null,
    createdAt: dbBorrow.created_at
  };
};

// ==========================================================================
// Primary Supabase Database CRUD Services
// ==========================================================================

/**
 * Mengambil semua komponen dari Supabase database
 * @param {boolean} includeInactive - Jika true (khusus admin), ambil semua termasuk yang nonaktif
 */
export const fetchComponents = async (includeInactive = false) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase belum dikonfigurasi. Hubungkan kredensial Supabase untuk mengakses katalog inventaris.');
  }

  try {
    let query = supabase
      .from('components')
      .select('*')
      .order('name', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    let { data, error } = await query;

    // Resiliency: Jika kolom is_active belum dimigrasikan di database Supabase melalui migration_audit_phase2.sql
    if (error && error.message && error.message.includes('is_active')) {
      console.warn('Kolom is_active belum ada di database Supabase (jalankan migration_audit_phase2.sql). Memuat katalog tanpa filter is_active...');
      const fallbackResult = await supabase
        .from('components')
        .select('*')
        .order('name', { ascending: true });
      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      throw new Error(error.message || 'Gagal memuat katalog komponen dari server database.');
    }

    return (data || []).map(mapComponentFromDb);
  } catch (err) {
    console.error('fetchComponents error:', err);
    throw err;
  }
};

/**
 * Mengambil satu komponen berdasarkan ID
 */
export const fetchComponentById = async (id) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase belum dikonfigurasi.');
  }

  try {
    const { data, error } = await supabase
      .from('components')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || `Gagal mengambil data komponen "${id}".`);
    }

    if (!data) {
      throw new Error(`Komponen dengan ID "${id}" tidak ditemukan di inventaris.`);
    }

    return mapComponentFromDb(data);
  } catch (err) {
    console.error('fetchComponentById error:', err);
    throw err;
  }
};

/**
 * Mengambil riwayat transaksi peminjaman
 */
export const fetchBorrowings = async () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase belum dikonfigurasi.');
  }

  try {
    const { data, error } = await supabase
      .from('borrowings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Gagal mengambil riwayat transaksi peminjaman.');
    }

    return (data || []).map(mapBorrowingFromDb);
  } catch (err) {
    console.error('fetchBorrowings error:', err);
    throw err;
  }
};

/**
 * Memproses transaksi peminjaman (mengurangi stok dan mencatat riwayat secara atomic via RPC)
 */
export const processBorrowing = async (borrowData) => {
  const qty = parseInt(borrowData.quantity, 10);
  if (isNaN(qty) || qty < 1) {
    throw new Error('Jumlah pinjam harus berupa angka bulat positif minimal 1 unit.');
  }

  if (!isSupabaseConfigured()) {
    throw new Error('Supabase belum dikonfigurasi untuk memproses peminjaman.');
  }

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('rpc_borrow_component', {
      p_component_id: borrowData.componentId,
      p_quantity: qty,
      p_borrower_name: (borrowData.borrowerName || '').trim(),
      p_borrower_nim: (borrowData.nim || borrowData.borrowerNim || '').trim(),
      p_borrower_email: (borrowData.borrowerEmail || '').trim(),
      p_purpose: (borrowData.purpose || '').trim(),
      p_notes: (borrowData.notes || '').trim(),
      p_return_date: borrowData.returnDate || '',
      p_duration_days: Number(borrowData.durationDays) || 3
    });

    if (rpcError) {
      throw new Error(rpcError.message || 'Gagal memproses peminjaman komponen.');
    }

    if (rpcData?.success) {
      const [updatedComponents, updatedBorrowings] = await Promise.all([
        fetchComponents(),
        fetchBorrowings()
      ]);

      return {
        success: true,
        borrowing: mapBorrowingFromDb(rpcData.borrowing),
        updatedComponents,
        updatedBorrowings
      };
    }

    throw new Error('Respons tidak valid saat memproses peminjaman.');
  } catch (err) {
    console.error('Supabase processBorrowing error:', err);
    throw err;
  }
};

/**
 * Memproses pengembalian komponen (memulihkan stok, mencegah duplicate return via RPC)
 */
export const processReturn = async ({ borrowId, condition = 'Baik', notes = '', checklist = [] }) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase belum dikonfigurasi untuk memproses pengembalian.');
  }

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('rpc_return_component', {
      p_borrow_id: borrowId,
      p_condition: condition,
      p_notes: notes,
      p_checklist: checklist
    });

    if (rpcError) {
      throw new Error(rpcError.message || 'Gagal memproses pengembalian komponen.');
    }

    if (rpcData?.success) {
      const [updatedComponents, updatedBorrowings] = await Promise.all([
        fetchComponents(),
        fetchBorrowings()
      ]);

      return {
        success: true,
        receipt: {
          receiptCode: rpcData.receipt_code,
          returnDate: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        },
        inspectionId: rpcData.inspection_id || null,
        updatedComponents,
        updatedBorrowings
      };
    }

    throw new Error('Respons tidak valid saat memproses pengembalian.');
  } catch (err) {
    console.error('Supabase processReturn error:', err);
    throw err;
  }
};

// ==========================================================================
// Admin Inventory Management Functions
// ==========================================================================

/**
 * Membuat komponen baru di inventaris (Khusus Admin)
 */
export const createComponent = async (componentData) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase belum dikonfigurasi.');
  }

  const id = componentData.id || componentData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const stock = Number(componentData.stock) || 0;
  const totalStock = Number(componentData.totalStock) || stock;
  const status = stock > 0 ? 'TERSEDIA' : 'HABIS';

  const payload = {
    id,
    code: componentData.code.trim(),
    name: componentData.name.trim(),
    category: componentData.category || 'Mikrokontroler',
    stock,
    maintenance_stock: Number(componentData.maintenanceStock) || 0,
    damaged_stock: Number(componentData.damagedStock) || 0,
    total_stock: totalStock,
    condition: componentData.condition || 'Baik',
    status,
    is_active: componentData.isActive !== false,
    image: componentData.image || '/assets/images/arduino.png',
    description: componentData.description?.trim() || '',
    tags: Array.isArray(componentData.tags) ? componentData.tags : [],
    location: componentData.location?.trim() || 'Lab Sistem Tertanam',
    specs: componentData.specs || {}
  };

  const { data, error } = await supabase
    .from('components')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Gagal menambahkan komponen ke inventaris.');
  }

  return mapComponentFromDb(data);
};

/**
 * Memperbarui rincian dan kuantitas stok komponen (Khusus Admin)
 */
export const updateComponent = async (id, componentData) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase belum dikonfigurasi.');
  }

  const stock = Number(componentData.stock);
  const totalStock = Number(componentData.totalStock);

  const updates = {
    updated_at: new Date().toISOString()
  };

  if (componentData.name !== undefined) updates.name = componentData.name.trim();
  if (componentData.code !== undefined) updates.code = componentData.code.trim();
  if (componentData.category !== undefined) updates.category = componentData.category;
  if (!isNaN(stock)) updates.stock = stock;
  if (!isNaN(totalStock)) updates.total_stock = totalStock;
  if (componentData.maintenanceStock !== undefined) updates.maintenance_stock = Number(componentData.maintenanceStock);
  if (componentData.damagedStock !== undefined) updates.damaged_stock = Number(componentData.damagedStock);
  if (componentData.condition !== undefined) updates.condition = componentData.condition;
  if (componentData.location !== undefined) updates.location = componentData.location.trim();
  if (componentData.description !== undefined) updates.description = componentData.description.trim();
  if (componentData.image !== undefined) updates.image = componentData.image;
  if (componentData.specs !== undefined) updates.specs = componentData.specs;
  if (componentData.tags !== undefined) updates.tags = componentData.tags;
  if (componentData.isActive !== undefined) {
    updates.is_active = componentData.isActive;
    updates.status = componentData.isActive ? (updates.stock > 0 ? 'TERSEDIA' : 'HABIS') : 'NONAKTIF';
  }

  const { data, error } = await supabase
    .from('components')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Gagal memperbarui data komponen.');
  }

  return mapComponentFromDb(data);
};

/**
 * Mengubah status aktif / nonaktif komponen (Soft Delete)
 */
export const toggleComponentActive = async (id, isActive) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase belum dikonfigurasi.');
  }

  const { data, error } = await supabase.rpc('rpc_toggle_component_active', {
    p_component_id: id,
    p_is_active: isActive
  });

  if (error) {
    throw new Error(error.message || 'Gagal mengubah status aktif komponen.');
  }

  return data;
};

/**
 * Menghapus komponen secara permanen (Dicegah database jika ada riwayat transaksi)
 */
export const deleteComponent = async (id) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase belum dikonfigurasi.');
  }

  const { error } = await supabase
    .from('components')
    .delete()
    .eq('id', id);

  if (error) {
    if (error.message && error.message.includes('riwayat peminjaman')) {
      throw new Error(error.message);
    }
    throw new Error(error.message || 'Gagal menghapus komponen dari inventaris.');
  }

  return { success: true, id };
};

// ==========================================================================
// Admin Component Inspection Management
// ==========================================================================

/**
 * Mengambil daftar catatan inspeksi komponen (Admin & Staf Lab)
 */
export const fetchInspections = async (statusFilter = 'all') => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    let query = supabase
      .from('component_inspections')
      .select('*')
      .order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('inspection_status', statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching component inspections:', error);
      throw error;
    }

    return (data || []).map((item) => ({
      id: item.id,
      borrowingId: item.borrowing_id,
      componentId: item.component_id,
      componentName: item.component_name,
      componentCode: item.component_code,
      componentImage: item.component_image || '/assets/images/dht22.png',
      borrowerName: item.borrower_name,
      borrowerEmail: item.borrower_email,
      borrowerNim: item.borrower_nim,
      quantity: item.quantity,
      reportedCondition: item.reported_condition,
      damageNotes: item.damage_notes,
      inspectionStatus: item.inspection_status,
      decision: item.decision,
      decisionNotes: item.decision_notes,
      inspectedBy: item.inspected_by,
      inspectedAt: item.inspected_at,
      createdAt: item.created_at
    }));
  } catch (err) {
    console.error('fetchInspections exception:', err);
    throw err;
  }
};

/**
 * Memberikan keputusan hasil inspeksi komponen (Khusus Admin)
 * Decision: 'usable' | 'under_repair' | 'retired'
 */
export const resolveInspection = async ({ inspectionId, decision, notes = '' }) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase belum dikonfigurasi.');
  }

  const { data, error } = await supabase.rpc('rpc_resolve_inspection', {
    p_inspection_id: inspectionId,
    p_decision: decision,
    p_notes: notes.trim()
  });

  if (error) {
    throw new Error(error.message || 'Gagal memproses keputusan inspeksi.');
  }

  return data;
};
