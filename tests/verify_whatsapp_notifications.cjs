const assert = require('assert');

async function runWhatsAppTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING ISSUE #3: WHATSAPP OVERDUE NOTIFICATIONS TEST SUITE');
  console.log('================================================================\n');

  const { formatE164Phone, validatePhoneNumber, evaluateNotificationEligibility } = await import(
    '../src/services/notificationService.js'
  );

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
  // TEST CASE 1: International Phone Formatting (E.164)
  // --------------------------------------------------------------------------
  test('Test Case 1: Phone Formatting to E.164 standard (+62...)', () => {
    assert.strictEqual(formatE164Phone('081234567890'), '+6281234567890', '08 prefix converted to +628');
    assert.strictEqual(formatE164Phone('6281234567890'), '+6281234567890', '628 prefix prepended with +');
    assert.strictEqual(formatE164Phone('+6281234567890'), '+6281234567890', '+628 prefix preserved');
    assert.strictEqual(formatE164Phone('0812-3456-7890'), '+6281234567890', 'Hyphens cleaned');
    assert.strictEqual(formatE164Phone(' 0812 3456 7890 '), '+6281234567890', 'Spaces cleaned');
    assert.strictEqual(formatE164Phone('123'), null, 'Too short number rejected');
    assert.strictEqual(formatE164Phone('abcd-efgh'), null, 'Alphabetic input rejected');
    assert.strictEqual(formatE164Phone(''), null, 'Empty string rejected');
    assert.strictEqual(formatE164Phone(null), null, 'Null rejected');

    const validCheck = validatePhoneNumber('081234567890');
    assert.strictEqual(validCheck.valid, true);
    assert.strictEqual(validCheck.formatted, '+6281234567890');

    const invalidCheck = validatePhoneNumber('123');
    assert.strictEqual(invalidCheck.valid, false);
  });

  // --------------------------------------------------------------------------
  // TEST CASE 2: Overdue Deadline Evaluation
  // --------------------------------------------------------------------------
  test('Test Case 2: Overdue Evaluation (due_at < now -> eligible, due_at > now -> ineligible)', () => {
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days ago
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days in future

    const overdueBorrowing = {
      id: 'BRW-001',
      componentName: 'ESP32 DevKit V1',
      status: 'DIPINJAM',
      due_at: pastDate,
      overdue_notified_at: null
    };

    const profile = {
      full_name: 'Budi Santoso',
      phone_number: '081234567890',
      whatsapp_notification_opt_in: true
    };

    const eligibleResult = evaluateNotificationEligibility(overdueBorrowing, profile);
    assert.strictEqual(eligibleResult.eligible, true, 'Past due date should be eligible');
    assert.strictEqual(eligibleResult.formattedPhone, '+6281234567890');

    const notOverdueBorrowing = {
      ...overdueBorrowing,
      id: 'BRW-002',
      due_at: futureDate
    };

    const notEligibleResult = evaluateNotificationEligibility(notOverdueBorrowing, profile);
    assert.strictEqual(notEligibleResult.eligible, false, 'Future due date must not be eligible');
  });

  // --------------------------------------------------------------------------
  // TEST CASE 3: Returned Borrowings Exclusion
  // --------------------------------------------------------------------------
  test('Test Case 3: Returned borrowings must NEVER receive overdue reminders', () => {
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

    const returnedBorrowing = {
      id: 'BRW-003',
      componentName: 'Arduino Uno R3',
      status: 'DIKEMBALIKAN', // Already returned
      due_at: pastDate,
      overdue_notified_at: null
    };

    const profile = {
      phone_number: '081234567890',
      whatsapp_notification_opt_in: true
    };

    const res = evaluateNotificationEligibility(returnedBorrowing, profile);
    assert.strictEqual(res.eligible, false, 'Returned borrowings must be strictly excluded');
  });

  // --------------------------------------------------------------------------
  // TEST CASE 4: User Consent Filtering
  // --------------------------------------------------------------------------
  test('Test Case 4: Respect explicit user opt-out consent (opt_in === false)', () => {
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const overdueBorrowing = {
      id: 'BRW-004',
      status: 'DIPINJAM',
      due_at: pastDate,
      overdue_notified_at: null
    };

    const optOutProfile = {
      full_name: 'Rian Pratama',
      phone_number: '081234567890',
      whatsapp_notification_opt_in: false // Opted out!
    };

    const res = evaluateNotificationEligibility(overdueBorrowing, optOutProfile);
    assert.strictEqual(res.eligible, false, 'Opted out user must not receive notification');
    assert.strictEqual(res.status, 'SKIPPED_NO_CONSENT');
  });

  // --------------------------------------------------------------------------
  // TEST CASE 5: Duplicate Reminder Prevention
  // --------------------------------------------------------------------------
  test('Test Case 5: Prevent duplicate reminders for the same overdue event', () => {
    const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const alreadyNotifiedDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();

    const alreadyNotifiedBorrowing = {
      id: 'BRW-005',
      status: 'DIPINJAM',
      due_at: pastDate,
      overdue_notified_at: alreadyNotifiedDate // Already notified yesterday!
    };

    const profile = {
      phone_number: '081234567890',
      whatsapp_notification_opt_in: true
    };

    const res = evaluateNotificationEligibility(alreadyNotifiedBorrowing, profile);
    assert.strictEqual(res.eligible, false, 'Must not send duplicate notification');
  });

  // --------------------------------------------------------------------------
  // TEST CASE 6: Missing or Invalid Phone Number Handling
  // --------------------------------------------------------------------------
  test('Test Case 6: Handle missing or invalid phone numbers safely', () => {
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const borrowing = {
      id: 'BRW-006',
      status: 'DIPINJAM',
      due_at: pastDate,
      overdue_notified_at: null
    };

    const noPhoneProfile = {
      phone_number: '',
      whatsapp_notification_opt_in: true
    };

    const res = evaluateNotificationEligibility(borrowing, noPhoneProfile);
    assert.strictEqual(res.eligible, false);
    assert.strictEqual(res.status, 'SKIPPED_NO_PHONE');
  });

  console.log('\n================================================================');
  console.log(`📊 SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED CLEANLY! (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runWhatsAppTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
