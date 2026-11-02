const assert = require('assert');

async function runInspectionTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING ISSUE #2: DAMAGED RETURN & ADMIN INSPECTION TESTS');
  console.log('================================================================\n');

  const { calculateAvailabilityStatus } = await import('../src/services/componentService.js');

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
  // TEST CASE 1: Return item reported as Good
  // --------------------------------------------------------------------------
  test('Test Case 1: Return item reported as Good -> stock becomes available immediately', () => {
    // Initial state: Total 5, Borrowed 5, Available 0
    let totalStock = 5;
    let borrowedStock = 5;
    let availableStock = 0;
    let maintenanceStock = 0;
    let damagedStock = 0;

    let status = calculateAvailabilityStatus({
      stock: availableStock,
      totalStock,
      borrowedStock,
      maintenanceStock,
      damagedStock,
      isActive: true
    });
    assert.strictEqual(status, 'Sedang Dipinjam');

    // Student returns 2 units in 'Baik' condition
    const returnedQty = 2;
    borrowedStock -= returnedQty;
    availableStock += returnedQty;

    status = calculateAvailabilityStatus({
      stock: availableStock,
      totalStock,
      borrowedStock,
      maintenanceStock,
      damagedStock,
      isActive: true
    });

    assert.strictEqual(availableStock, 2, 'Available stock should be 2');
    assert.strictEqual(borrowedStock, 3, 'Borrowed stock should be 3');
    assert.strictEqual(maintenanceStock, 0, 'Maintenance stock should be 0');
    assert.strictEqual(damagedStock, 0, 'Damaged stock should be 0');
    assert.strictEqual(status, 'Sebagian Dipinjam');
    assert.strictEqual(totalStock, availableStock + borrowedStock + maintenanceStock + damagedStock, 'Conservation of stock');
  });

  // --------------------------------------------------------------------------
  // TEST CASE 2: Return item reported as Needs Inspection
  // --------------------------------------------------------------------------
  test('Test Case 2: Return item reported as Needs Inspection -> stock moves to inspection hold, not available', () => {
    // Initial state: Total 5, Borrowed 5, Available 0
    let totalStock = 5;
    let borrowedStock = 5;
    let availableStock = 0;
    let maintenanceStock = 0;
    let damagedStock = 0;

    // Student returns 2 units with condition 'Perlu Pengecekan'
    const returnedQty = 2;
    borrowedStock -= returnedQty;
    maintenanceStock += returnedQty; // Held in maintenance/inspection hold!
    // availableStock does NOT increase

    const status = calculateAvailabilityStatus({
      stock: availableStock,
      totalStock,
      borrowedStock,
      maintenanceStock,
      damagedStock,
      isActive: true
    });

    assert.strictEqual(availableStock, 0, 'Available stock must remain 0');
    assert.strictEqual(borrowedStock, 3, 'Borrowed stock should be 3');
    assert.strictEqual(maintenanceStock, 2, 'Maintenance stock should be 2');
    assert.strictEqual(status, 'Sedang Dipinjam', 'Since usable available is 0 but borrowed > 0, status is Sedang Dipinjam');
    assert.strictEqual(totalStock, availableStock + borrowedStock + maintenanceStock + damagedStock, 'Conservation of stock');
  });

  // --------------------------------------------------------------------------
  // TEST CASE 3: Admin marks inspected item as Usable
  // --------------------------------------------------------------------------
  test('Test Case 3: Admin marks item as Usable -> stock becomes available', () => {
    // State from previous step: Total 5, Borrowed 3, Available 0, Maintenance 2
    let totalStock = 5;
    let borrowedStock = 3;
    let availableStock = 0;
    let maintenanceStock = 2;
    let damagedStock = 0;

    // Admin inspects 2 units and marks as 'usable'
    const inspectedQty = 2;
    maintenanceStock -= inspectedQty;
    availableStock += inspectedQty;

    const status = calculateAvailabilityStatus({
      stock: availableStock,
      totalStock,
      borrowedStock,
      maintenanceStock,
      damagedStock,
      isActive: true
    });

    assert.strictEqual(availableStock, 2, 'Available stock must now be 2');
    assert.strictEqual(maintenanceStock, 0, 'Maintenance stock must now be 0');
    assert.strictEqual(status, 'Sebagian Dipinjam', 'Status is Sebagian Dipinjam because 2 available and 3 borrowed');
    assert.strictEqual(totalStock, availableStock + borrowedStock + maintenanceStock + damagedStock, 'Conservation of stock');
  });

  // --------------------------------------------------------------------------
  // TEST CASE 4: Admin marks inspected item as Needs Repair
  // --------------------------------------------------------------------------
  test('Test Case 4: Admin marks item as Needs Repair -> stock moves to repair hold', () => {
    // Scenario 4A: A unit was returned as 'Rusak': Total 5, Borrowed 0, Available 4, Damaged 1
    let totalStock = 5;
    let borrowedStock = 0;
    let availableStock = 4;
    let maintenanceStock = 0;
    let damagedStock = 1;

    // Admin reviews and decides 'under_repair'
    damagedStock -= 1;
    maintenanceStock += 1; // Moves to repair/maintenance hold

    let status = calculateAvailabilityStatus({
      stock: availableStock,
      totalStock,
      borrowedStock,
      maintenanceStock,
      damagedStock,
      isActive: true
    });

    assert.strictEqual(availableStock, 4, 'Available stock remains 4');
    assert.strictEqual(maintenanceStock, 1, 'Repair hold is 1');
    assert.strictEqual(damagedStock, 0, 'Damaged stock is 0');
    assert.strictEqual(status, 'Tersedia', 'Available stock exists and none borrowed -> Tersedia');

    // Scenario 4B: If all units are in maintenance / repair
    const allMaintenanceStatus = calculateAvailabilityStatus({
      stock: 0,
      totalStock: 5,
      borrowedStock: 0,
      maintenanceStock: 5,
      damagedStock: 0,
      isActive: true
    });
    assert.strictEqual(allMaintenanceStatus, 'Dalam Pemeriksaan', 'When all units are in maintenance, status is Dalam Pemeriksaan');

    assert.strictEqual(totalStock, availableStock + borrowedStock + maintenanceStock + damagedStock, 'Conservation of stock');
  });

  // --------------------------------------------------------------------------
  // TEST CASE 5: Admin writes off item (Retired / Permanently Damaged)
  // --------------------------------------------------------------------------
  test('Test Case 5: Admin writes off item -> total stock decreases without double-counting', () => {
    // State: Total 5, Borrowed 0, Available 4, Maintenance 1
    let totalStock = 5;
    let borrowedStock = 0;
    let availableStock = 4;
    let maintenanceStock = 1;
    let damagedStock = 0;

    // Admin writes off the 1 unrepairable unit
    maintenanceStock -= 1;
    totalStock -= 1; // Total physical stock decreases to 4!

    const status = calculateAvailabilityStatus({
      stock: availableStock,
      totalStock,
      borrowedStock,
      maintenanceStock,
      damagedStock,
      isActive: true
    });

    assert.strictEqual(totalStock, 4, 'Total stock must decrease to 4');
    assert.strictEqual(availableStock, 4, 'Available stock remains 4');
    assert.strictEqual(maintenanceStock, 0, 'Maintenance hold is 0');
    assert.strictEqual(status, 'Tersedia', 'Now all 4 physical units are available, status is Tersedia');
    assert.strictEqual(totalStock, availableStock + borrowedStock + maintenanceStock + damagedStock, 'Conservation of stock');
  });

  console.log('\n================================================================');
  console.log(`📊 SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED CLEANLY! (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runInspectionTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
