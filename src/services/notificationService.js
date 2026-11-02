import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

/**
 * Standardize phone numbers to international E.164 format (+62...)
 * Handles 08..., 628..., 8..., and standard +62...
 */
export const formatE164Phone = (phone) => {
  if (!phone || typeof phone !== 'string') return null;
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '').trim();

  let formatted = cleaned;
  if (formatted.startsWith('+')) {
    formatted = formatted;
  } else if (formatted.startsWith('08')) {
    formatted = '+62' + formatted.substring(1);
  } else if (formatted.startsWith('628')) {
    formatted = '+' + formatted;
  } else if (formatted.startsWith('8')) {
    formatted = '+62' + formatted;
  }

  // E.164 format regex: + followed by 10 to 15 digits
  const e164Regex = /^\+[1-9]\d{9,14}$/;
  if (!e164Regex.test(formatted)) {
    return null;
  }
  return formatted;
};

/**
 * Validasi apakah nomor telepon valid untuk penerimaan notifikasi WhatsApp
 */
export const validatePhoneNumber = (phone) => {
  if (!phone || !phone.trim()) {
    return { valid: false, error: 'Nomor telepon tidak boleh kosong.' };
  }
  const formatted = formatE164Phone(phone);
  if (!formatted) {
    return {
      valid: false,
      error: 'Format nomor telepon tidak valid. Gunakan format internasional (contoh: 08123456789 atau +628123456789).'
    };
  }
  return { valid: true, formatted };
};

/**
 * Evaluasi kelayakan pengiriman notifikasi keterlambatan (Pure Business Logic)
 * Aturan:
 * 1. Peminjaman harus aktif ('DIPINJAM'). Transaksi 'DIKEMBALIKAN' TIDAK boleh dikirimi reminder.
 * 2. Transaksi telah melewati tenggat jatuh tempo (due_at < now() atau due_date telah lewat).
 * 3. Belum pernah dikirimi notifikasi untuk event ini (overdue_notified_at IS NULL).
 * 4. Pengguna harus memberikan persetujuan eksplisit (whatsapp_opt_in === true).
 * 5. Pengguna memiliki nomor telepon valid berformat internasional E.164.
 */
export const evaluateNotificationEligibility = (borrowing, profile = {}) => {
  if (!borrowing) {
    return { eligible: false, reason: 'Transaksi peminjaman tidak ditemukan.' };
  }

  if (borrowing.status === 'DIKEMBALIKAN') {
    return { eligible: false, reason: 'Komponen sudah dikembalikan. Notifikasi dibatalkan.' };
  }

  if (borrowing.status !== 'DIPINJAM') {
    return { eligible: false, reason: 'Status transaksi bukan peminjaman aktif.' };
  }

  // Evaluasi jatuh tempo
  const now = new Date();
  let isOverdue = false;

  if (borrowing.due_at) {
    isOverdue = new Date(borrowing.due_at) < now;
  } else if (borrowing.dueDate) {
    // Fallback parsing date string e.g. "12 Feb 2026"
    const parsedDate = new Date(borrowing.dueDate);
    if (!isNaN(parsedDate.getTime())) {
      isOverdue = parsedDate < now;
    }
  }

  if (!isOverdue) {
    return { eligible: false, reason: 'Peminjaman belum melewati batas jatuh tempo.' };
  }

  // Pencegahan notifikasi berulang untuk event yang sama
  if (borrowing.overdue_notified_at || borrowing.overdueNotifiedAt) {
    return { eligible: false, reason: 'Notifikasi keterlambatan sudah pernah dikirimkan sebelumnya.' };
  }

  // Izin eksplisit (Consent check)
  const optIn = profile.whatsapp_notification_opt_in ?? profile.whatsappOptIn ?? true;
  if (optIn === false) {
    return { eligible: false, status: 'SKIPPED_NO_CONSENT', reason: 'Peminjam tidak mengizinkan pengiriman notifikasi WhatsApp.' };
  }

  // Validasi nomor telepon
  const rawPhone = profile.phone_number || profile.phone || borrowing.phone;
  const formattedPhone = formatE164Phone(rawPhone);
  if (!formattedPhone) {
    return { eligible: false, status: 'SKIPPED_NO_PHONE', reason: 'Nomor telepon peminjam tidak valid atau belum diisi.' };
  }

  return {
    eligible: true,
    formattedPhone,
    borrowerName: profile.full_name || borrowing.borrowerName || 'Peminjam',
    componentName: borrowing.componentName || 'Komponen IoT'
  };
};

/**
 * Mengambil log pengiriman notifikasi WhatsApp (Admin only)
 */
export const fetchNotificationLogs = async (limit = 50) => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('notification_logs')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching notification logs:', error);
    throw new Error(error.message || 'Gagal memuat log notifikasi.');
  }

  return data || [];
};

/**
 * Memicu eksekusi pengecekan keterlambatan via Edge Function atau RPC fallback
 */
export const triggerOverdueNotificationCheck = async () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase belum dikonfigurasi.');
  }

  try {
    // 1. Coba panggil Supabase Edge Function
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke(
      'send-overdue-whatsapp',
      { method: 'POST' }
    );

    if (!edgeError && edgeData) {
      return edgeData;
    }

    // 2. Fallback: Eksekusi client-side via RPC jika Edge Function belum dideploy
    const { data: eligibleItems, error: rpcErr } = await supabase.rpc(
      'get_overdue_borrowings_for_notification'
    );

    if (rpcErr) throw rpcErr;

    const results = {
      total_eligible: (eligibleItems || []).length,
      sent: 0,
      simulated: 0,
      skipped_no_consent: 0,
      skipped_no_phone: 0,
      details: []
    };

    for (const item of (eligibleItems || [])) {
      if (item.whatsapp_opt_in === false) {
        await supabase.rpc('record_overdue_notification_result', {
          p_borrowing_id: item.borrowing_id,
          p_recipient_phone: item.phone_number || 'NONE',
          p_recipient_name: item.borrower_name,
          p_status: 'SKIPPED_NO_CONSENT',
          p_error_message: 'User opted out of WhatsApp reminders.'
        });
        results.skipped_no_consent++;
        continue;
      }

      const formatted = formatE164Phone(item.phone_number);
      if (!formatted) {
        await supabase.rpc('record_overdue_notification_result', {
          p_borrowing_id: item.borrowing_id,
          p_recipient_phone: item.phone_number || 'INVALID',
          p_recipient_name: item.borrower_name,
          p_status: 'SKIPPED_NO_PHONE',
          p_error_message: 'Invalid phone format.'
        });
        results.skipped_no_phone++;
        continue;
      }

      // Catat sebagai SIMULATED karena Edge Function / Live API token tidak ada di client
      await supabase.rpc('record_overdue_notification_result', {
        p_borrowing_id: item.borrowing_id,
        p_recipient_phone: formatted,
        p_recipient_name: item.borrower_name,
        p_status: 'SIMULATED',
        p_response_payload: {
          note: 'Mode simulasi: Live WhatsApp credentials belum dikonfigurasi di Supabase Secrets.',
          recipient: formatted,
          component: item.component_name
        }
      });
      results.simulated++;
    }

    return { success: true, results, simulated: true };
  } catch (err) {
    console.error('triggerOverdueNotificationCheck error:', err);
    throw err;
  }
};
