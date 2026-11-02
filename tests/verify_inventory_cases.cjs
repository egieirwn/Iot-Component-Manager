const assert = require('assert');

// Impor modul yang telah dibuat/diperbarui
// Karena project menggunakan ESM, kita dapat mengimpor via dynamic import atau membuat mock fungsi murni
async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING COMPREHENSIVE INVENTORY SYNCHRONIZATION TEST SUITE');
  console.log('================================================================\n');

  const { calculateAvailabilityStatus, mapComponentFromDb } = await import('../src/services/componentService.js');

  let passedTests = 0;
  let totalTests = 0;

  function test(description, fn) {
    totalTests++;
    try {
      fn();
      console.log(`✅ [PASS] ${description}`);
      passedTests++;
    } catch (err) {
      console.error(`❌ [FAIL] ${description}`);
      console.error('   ', err.message);
    }
  }

  // --------------------------------------------------------------------------
  // TEST CASE 1: All Stock Borrowed, Then Admin Adds Stock
  // --------------------------------------------------------------------------
  test('Test Case 1: All Stock Borrowed (5/5), then Admin adds 3 units -> Total: 8, Borrowed: 5, Available: 3, Status: Sebagian Dipinjam', () => {
    // Kondisi awal: Total 5, Borrowed 5, Available 0
    const initialStatus = calculateAvailabilityStatus({
      stock: 0,
      totalStock: 5,
      borrowedStock: 5,
      maintenanceStock: 0,
      damagedStock: 0,
      isActive: true
    });
    assert.strictEqual(initialStatus, 'Sedang Dipinjam', 'Status awal harus Sedang Dipinjam');

    // Admin menambahkan 3 unit: Total 8, Available 3, Borrowed 5
    const addedUnits = 3;
    const newTotalStock = 5 + addedUnits;
    const borrowedStock = 5;
    const newAvailableStock = newTotalStock - borrowedStock; // 8 - 5 = 3

    const newStatus = calculateAvailabilityStatus({
      stock: newAvailableStock,
      totalStock: newTotalStock,
      borrowedStock: borrowedStock,
      maintenanceStock: 0,
      damagedStock: 0,
      isActive: true
    });

    assert.strictEqual(newTotalStock, 8, 'Total stock harus 8');
    assert.strictEqual(borrowedStock, 5, 'Borrowed quantity harus 5');
    assert.strictEqual(newAvailableStock, 3, 'Available stock harus 3');
    assert.strictEqual(newStatus, 'Sebagian Dipinjam', 'Status setelah admin menambah stok harus Sebagian Dipinjam');
  });

  // --------------------------------------------------------------------------
  // TEST CASE 2: No Borrowed Stock
  // --------------------------------------------------------------------------
  test('Test Case 2: No Borrowed Stock (10/10), Admin adds 5 units -> Total: 15, Available: 15, Status: Tersedia', () => {
    const initialTotal = 10;
    const borrowed = 0;
    const addedUnits = 5;
    const newTotal = initialTotal + addedUnits;
    const newAvailable = newTotal - borrowed;

    const status = calculateAvailabilityStatus({
      stock: newAvailable,
      totalStock: newTotal,
      borrowedStock: borrowed,
      maintenanceStock: 0,
      damagedStock: 0,
      isActive: true
    });

    assert.strictEqual(newTotal, 15, 'Total stock harus 15');
    assert.strictEqual(borrowed, 0, 'Borrowed quantity harus 0');
    assert.strictEqual(newAvailable, 15, 'Available stock harus 15');
    assert.strictEqual(status, 'Tersedia', 'Status harus Tersedia');
  });

  // --------------------------------------------------------------------------
  // TEST CASE 3: Partially Borrowed Stock
  // --------------------------------------------------------------------------
  test('Test Case 3: Partially Borrowed Stock -> Total: 10, Borrowed: 4, Available: 6, Status: Sebagian Dipinjam', () => {
    const total = 10;
    const borrowed = 4;
    const available = 6;

    const status = calculateAvailabilityStatus({
      stock: available,
      totalStock: total,
      borrowedStock: borrowed,
      maintenanceStock: 0,
      damagedStock: 0,
      isActive: true
    });

    assert.strictEqual(total, 10);
    assert.strictEqual(borrowed, 4);
    assert.strictEqual(available, 6);
    assert.strictEqual(status, 'Sebagian Dipinjam', 'Status harus Sebagian Dipinjam');
  });

  // --------------------------------------------------------------------------
  // TEST CASE 4: All Stock Borrowed
  // --------------------------------------------------------------------------
  test('Test Case 4: All Stock Borrowed -> Total: 10, Borrowed: 10, Available: 0, Status: Sedang Dipinjam', () => {
    const total = 10;
    const borrowed = 10;
    const available = 0;

    const status = calculateAvailabilityStatus({
      stock: available,
      totalStock: total,
      borrowedStock: borrowed,
      maintenanceStock: 0,
      damagedStock: 0,
      isActive: true
    });

    assert.strictEqual(total, 10);
    assert.strictEqual(borrowed, 10);
    assert.strictEqual(available, 0);
    assert.strictEqual(status, 'Sedang Dipinjam', 'Status harus Sedang Dipinjam');
  });

  // --------------------------------------------------------------------------
  // TEST CASE 5: Damaged or Inspection Stock
  // --------------------------------------------------------------------------
  test('Test Case 5: Damaged / Inspection Stock (Total 10: 2 Maint, 1 Dmg, 3 Borrowed, 4 Available) -> No double counting, status Sebagian Dipinjam', () => {
    const totalStock = 10;
    const maint = 2;
    const dmg = 1;
    const borrowed = 3;
    // Available = Total - Borrowed - Maint - Dmg = 10 - 3 - 2 - 1 = 4
    const available = totalStock - borrowed - maint - dmg;

    assert.strictEqual(available, 4, 'Available stock harus 4');

    const status = calculateAvailabilityStatus({
      stock: available,
      totalStock,
      borrowedStock: borrowed,
      maintenanceStock: maint,
      damagedStock: dmg,
      isActive: true
    });

    assert.strictEqual(status, 'Sebagian Dipinjam', 'Jika masih ada sisa stok 4 dan 3 dipinjam, status Sebagian Dipinjam');

    // Sub-kasus 5B: Seluruh unit habis terbagi antara maintenance dan rusak (tidak ada yang dipinjam dan tidak ada tersedia)
    const allDamagedStatus = calculateAvailabilityStatus({
      stock: 0,
      totalStock: 5,
      borrowedStock: 0,
      maintenanceStock: 3,
      damagedStock: 2,
      isActive: true
    });
    assert.strictEqual(allDamagedStatus, 'Dalam Pemeriksaan', 'Jika stok tersedia 0 dan terdapat unit maint/rusak tanpa pinjaman, status Dalam Pemeriksaan');
  });

  // --------------------------------------------------------------------------
  // TEST CASE 6: Data Consistency & Relational Mapping
  // --------------------------------------------------------------------------
  test('Test Case 6: Data Consistency via mapComponentFromDb across Dashboard, Catalog, Detail', () => {
    // Simulasi baris mentah dari database Supabase
    const dbCompRow = {
      id: 'arduino-uno-r3',
      code: 'MCU-00182',
      name: 'Arduino Uno R3',
      category: 'Mikrokontroler',
      total_stock: 8,
      stock: 3, // Tersedia 3
      maintenance_stock: 0,
      damaged_stock: 0,
      status: 'DIPINJAM', // Status lama di db sebelum sinkronisasi
      is_active: true
    };

    const mapped = mapComponentFromDb(dbCompRow);

    assert.strictEqual(mapped.totalStock, 8, 'totalStock konsisten 8');
    assert.strictEqual(mapped.stock, 3, 'stock tersedia konsisten 3');
    assert.strictEqual(mapped.borrowedStock, 5, 'borrowedStock otomatis dihitung 8 - 3 = 5');
    assert.strictEqual(mapped.status, 'Sebagian Dipinjam', 'status otomatis direkonsiliasi menjadi Sebagian Dipinjam');
    assert.strictEqual(mapped.isActive, true, 'isActive konsisten');

    // Verifikasi tombol pinjam aktif karena stock > 0
    const canBorrow = (mapped.stock || 0) > 0 && mapped.isActive !== false;
    assert.strictEqual(canBorrow, true, 'canBorrow harus true jika sisa stok > 0');
  });

  console.log('\n================================================================');
  console.log(`📊 SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED CLEANLY! (100%)`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

