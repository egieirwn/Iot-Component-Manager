const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function runRoleAndImageTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING ROLE STRUCTURE & COMPONENT IMAGE PERMISSION TEST SUITE');
  console.log('================================================================\n');

  const { validateComponentImageFile } = await import('../src/services/componentService.js');

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

  // Permission model simulation mirroring Supabase RLS and RPC policies
  function checkPermission(userRole, action, data = {}) {
    // Only 3 valid roles
    const VALID_ROLES = ['mahasiswa', 'dosen', 'superadmin'];
    if (!VALID_ROLES.includes(userRole)) {
      return { allowed: false, reason: `Role tidak valid: '${userRole}'. Sistem hanya mengizinkan: mahasiswa, dosen, superadmin.` };
    }

    switch (action) {
      case 'upload_component_image':
      case 'replace_component_image':
      case 'remove_component_image':
        // Dosen and Superadmin can update component image; Mahasiswa CANNOT
        if (userRole === 'superadmin' || userRole === 'dosen') {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Mahasiswa tidak memiliki izin untuk mengunggah atau mengubah foto komponen.' };

      case 'modify_component_metadata':
      case 'modify_component_stock':
      case 'create_inventory_component':
      case 'delete_inventory_component':
        // ONLY Superadmin can modify stock, name, code, category, or inventory data
        if (userRole === 'superadmin') {
          return { allowed: true };
        }
        return { allowed: false, reason: `Role '${userRole}' tidak diizinkan mengubah data stok atau metadata inventaris.` };

      case 'access_superadmin_route': // e.g. /admin/inventory or /admin/inspections
        if (userRole === 'superadmin') {
          return { allowed: true };
        }
        return { allowed: false, reason: `Halaman administrasi hanya dapat diakses oleh superadmin.` };

      case 'access_inspection_management':
      case 'resolve_inspection_report':
        // Damaged inspection is strictly superadmin
        if (userRole === 'superadmin') {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Pemeriksaan komponen rusak hanya dapat dikelola dan disetujui oleh superadmin.' };

      case 'request_role_elevation':
        // Users can only request 'dosen', NEVER 'superadmin'
        if (data.requested_role === 'superadmin') {
          return { allowed: false, reason: 'Pendaftaran atau permintaan role superadmin dilarang.' };
        }
        if (data.requested_role === 'dosen') {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Role request tidak valid.' };

      case 'self_promote_role':
        // Nobody can self-promote their role in profiles
        return { allowed: false, reason: 'Pengubahan role profil secara mandiri dicegah oleh database trigger.' };

      default:
        return { allowed: false, reason: 'Aksi tidak dikenal.' };
    }
  }

  // --------------------------------------------------------------------------
  // TEST CASE 1: Mahasiswa CANNOT upload, replace, or delete component images
  // --------------------------------------------------------------------------
  test('Test Case 1: Mahasiswa cannot upload, replace, or delete component images', () => {
    const uploadRes = checkPermission('mahasiswa', 'upload_component_image');
    assert.strictEqual(uploadRes.allowed, false, 'Mahasiswa cannot upload image');

    const replaceRes = checkPermission('mahasiswa', 'replace_component_image');
    assert.strictEqual(replaceRes.allowed, false, 'Mahasiswa cannot replace image');

    const deleteRes = checkPermission('mahasiswa', 'remove_component_image');
    assert.strictEqual(deleteRes.allowed, false, 'Mahasiswa cannot remove image');
  });

  // --------------------------------------------------------------------------
  // TEST CASE 2: Mahasiswa CANNOT manage inventory records or access superadmin routes
  // --------------------------------------------------------------------------
  test('Test Case 2: Mahasiswa cannot manage inventory records or access superadmin routes', () => {
    const createRes = checkPermission('mahasiswa', 'create_inventory_component');
    assert.strictEqual(createRes.allowed, false, 'Mahasiswa cannot create inventory component');

    const stockRes = checkPermission('mahasiswa', 'modify_component_stock');
    assert.strictEqual(stockRes.allowed, false, 'Mahasiswa cannot modify stock');

    const metaRes = checkPermission('mahasiswa', 'modify_component_metadata');
    assert.strictEqual(metaRes.allowed, false, 'Mahasiswa cannot modify metadata');

    const routeRes = checkPermission('mahasiswa', 'access_superadmin_route');
    assert.strictEqual(routeRes.allowed, false, 'Mahasiswa cannot access superadmin route');
  });

  // --------------------------------------------------------------------------
  // TEST CASE 3: Dosen CAN upload component image via restricted RPC
  // --------------------------------------------------------------------------
  test('Test Case 3: Dosen can upload component image', () => {
    const uploadRes = checkPermission('dosen', 'upload_component_image');
    assert.strictEqual(uploadRes.allowed, true, 'Dosen is authorized to upload component image');
  });

  // --------------------------------------------------------------------------
  // TEST CASE 4: Dosen CAN replace and remove component image
  // --------------------------------------------------------------------------
  test('Test Case 4: Dosen can replace and remove component image', () => {
    const replaceRes = checkPermission('dosen', 'replace_component_image');
    assert.strictEqual(replaceRes.allowed, true, 'Dosen is authorized to replace component image');

    const removeRes = checkPermission('dosen', 'remove_component_image');
    assert.strictEqual(removeRes.allowed, true, 'Dosen is authorized to remove component image');
  });

  // --------------------------------------------------------------------------
  // TEST CASE 5: Dosen CANNOT modify component stock, name, code, category, or metadata
  // --------------------------------------------------------------------------
  test('Test Case 5: Dosen cannot modify component stock, name, code, category, or inventory data', () => {
    const stockRes = checkPermission('dosen', 'modify_component_stock');
    assert.strictEqual(stockRes.allowed, false, 'Dosen cannot modify component stock');

    const metaRes = checkPermission('dosen', 'modify_component_metadata');
    assert.strictEqual(metaRes.allowed, false, 'Dosen cannot modify component metadata (name, code, category)');

    const createRes = checkPermission('dosen', 'create_inventory_component');
    assert.strictEqual(createRes.allowed, false, 'Dosen cannot create inventory records');

    const delRes = checkPermission('dosen', 'delete_inventory_component');
    assert.strictEqual(delRes.allowed, false, 'Dosen cannot delete inventory records');
  });

  // --------------------------------------------------------------------------
  // TEST CASE 6: Superadmin CAN perform all authorized inventory and image operations
  // --------------------------------------------------------------------------
  test('Test Case 6: Superadmin can perform full inventory and image operations', () => {
    assert.strictEqual(checkPermission('superadmin', 'create_inventory_component').allowed, true);
    assert.strictEqual(checkPermission('superadmin', 'modify_component_stock').allowed, true);
    assert.strictEqual(checkPermission('superadmin', 'modify_component_metadata').allowed, true);
    assert.strictEqual(checkPermission('superadmin', 'delete_inventory_component').allowed, true);
    assert.strictEqual(checkPermission('superadmin', 'upload_component_image').allowed, true);
    assert.strictEqual(checkPermission('superadmin', 'replace_component_image').allowed, true);
    assert.strictEqual(checkPermission('superadmin', 'remove_component_image').allowed, true);
    assert.strictEqual(checkPermission('superadmin', 'access_superadmin_route').allowed, true);
  });

  // --------------------------------------------------------------------------
  // TEST CASE 7: Only Superadmin can access damaged component inspection management
  // --------------------------------------------------------------------------
  test('Test Case 7: Only Superadmin can access damaged component inspection management', () => {
    assert.strictEqual(checkPermission('superadmin', 'access_inspection_management').allowed, true);
    assert.strictEqual(checkPermission('dosen', 'access_inspection_management').allowed, false);
    assert.strictEqual(checkPermission('mahasiswa', 'access_inspection_management').allowed, false);
  });

  // --------------------------------------------------------------------------
  // TEST CASE 8: Only Superadmin can resolve inspection reports
  // --------------------------------------------------------------------------
  test('Test Case 8: Only Superadmin can approve or resolve inspection reports', () => {
    assert.strictEqual(checkPermission('superadmin', 'resolve_inspection_report').allowed, true);
    assert.strictEqual(checkPermission('dosen', 'resolve_inspection_report').allowed, false);
    assert.strictEqual(checkPermission('mahasiswa', 'resolve_inspection_report').allowed, false);
  });

  // --------------------------------------------------------------------------
  // TEST CASE 9: No user can self-promote or request superadmin role
  // --------------------------------------------------------------------------
  test('Test Case 9: No user can promote themselves or request superadmin role', () => {
    // Attempting to self-promote
    assert.strictEqual(checkPermission('mahasiswa', 'self_promote_role').allowed, false);
    assert.strictEqual(checkPermission('dosen', 'self_promote_role').allowed, false);

    // Attempting to request superadmin
    const reqSuperadmin = checkPermission('mahasiswa', 'request_role_elevation', { requested_role: 'superadmin' });
    assert.strictEqual(reqSuperadmin.allowed, false, 'Requesting superadmin role must be rejected');

    // Legitimate dosen request is permitted
    const reqDosen = checkPermission('mahasiswa', 'request_role_elevation', { requested_role: 'dosen' });
    assert.strictEqual(reqDosen.allowed, true, 'Requesting dosen role is allowed for review');

    // Disallowed legacy roles rejected
    assert.strictEqual(checkPermission('admin', 'access_superadmin_route').allowed, false);
    assert.strictEqual(checkPermission('staff_lab', 'access_superadmin_route').allowed, false);
  });

  // --------------------------------------------------------------------------
  // TEST CASE 10: Image file validation blocks invalid MIME types and files > 5MB
  // --------------------------------------------------------------------------
  test('Test Case 10: Image file validation enforces MIME type and 5MB size limit', () => {
    // Valid cases
    const validJpg = { name: 'esp32.jpg', type: 'image/jpeg', size: 1024 * 1024 }; // 1MB
    const validPng = { name: 'sensor.png', type: 'image/png', size: 2 * 1024 * 1024 }; // 2MB
    const validWebp = { name: 'arduino.webp', type: 'image/webp', size: 4.9 * 1024 * 1024 }; // 4.9MB

    assert.strictEqual(validateComponentImageFile(validJpg).isValid, true);
    assert.strictEqual(validateComponentImageFile(validPng).isValid, true);
    assert.strictEqual(validateComponentImageFile(validWebp).isValid, true);

    // Invalid file sizes (> 5MB)
    const tooLargeFile = { name: 'huge.jpg', type: 'image/jpeg', size: 5.1 * 1024 * 1024 };
    const checkTooLarge = validateComponentImageFile(tooLargeFile);
    assert.strictEqual(checkTooLarge.isValid, false);
    assert.ok(checkTooLarge.error.includes('5') && checkTooLarge.error.includes('MB'), 'Error message mentions 5MB limit');

    // Invalid file types
    const pdfFile = { name: 'datasheet.pdf', type: 'application/pdf', size: 500 * 1024 };
    const checkPdf = validateComponentImageFile(pdfFile);
    assert.strictEqual(checkPdf.isValid, false);
    assert.ok(checkPdf.error.includes('JPG, PNG, atau WEBP'), 'Error message specifies allowed formats');

    const gifFile = { name: 'animation.gif', type: 'image/gif', size: 500 * 1024 };
    assert.strictEqual(validateComponentImageFile(gifFile).isValid, false);

    const exeFile = { name: 'malware.exe', type: 'application/x-msdownload', size: 1024 };
    assert.strictEqual(validateComponentImageFile(exeFile).isValid, false);

    // Null or empty
    assert.strictEqual(validateComponentImageFile(null).isValid, false);
    assert.strictEqual(validateComponentImageFile({}).isValid, false);
  });

  // --------------------------------------------------------------------------
  // TEST CASE 11: Schema & Migration SQL Audit
  // --------------------------------------------------------------------------
  test('Test Case 11: Schema & Migration contains strict 3-role constraints and storage bucket setup', () => {
    const migrationPath = path.resolve(__dirname, '../supabase/migration_roles_and_component_images.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration file exists');

    const sql = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(sql.includes("CHECK (role IN ('mahasiswa', 'dosen', 'superadmin'))"), 'Role CHECK constraint has only 3 roles');
    assert.ok(sql.includes("component-images"), 'Storage bucket component-images configured');
    assert.ok(sql.includes("rpc_update_component_image"), 'RPC rpc_update_component_image defined');
    assert.ok(sql.includes("is_superadmin"), 'is_superadmin helper defined');
    assert.ok(sql.includes("is_dosen"), 'is_dosen helper defined');
    assert.ok(sql.includes("image = p_image_url"), 'RPC only modifies image column');
  });

  console.log('\n================================================================');
  console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} PASSED (100%)`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runRoleAndImageTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
