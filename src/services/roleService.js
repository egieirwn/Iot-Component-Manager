// Service layer untuk verifikasi permohonan role dosen (Area B)
// Menggunakan RPC Supabase PostgreSQL yang aman (SECURITY DEFINER dengan kontrol admin)

import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Mengambil seluruh daftar pengajuan role dosen (Khusus Administrator)
 */
export const fetchRoleRequests = async () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase belum dikonfigurasi.');
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        role,
        requested_role,
        role_request_status,
        identity_number,
        study_program,
        faculty,
        phone,
        avatar_url,
        role_reviewed_by,
        role_reviewed_at,
        role_rejection_reason,
        created_at,
        updated_at
      `)
      .or('role_request_status.in.(pending,approved,rejected),requested_role.eq.dosen')
      .order('updated_at', { ascending: false });

    if (error) {
      // Jika kolom audit belum ada (karena migration_audit_phase2.sql belum dijalankan di SQL Editor),
      // fallback ke kolom dasar agar UI tetap bisa memuat profil pemohon role dosen
      if (error.code === '42703' || error.message?.includes('role_reviewed_by') || error.message?.includes('does not exist')) {
        console.warn('Kolom audit role_reviewed_* belum ada di profiles. Harap jalankan supabase/migration_audit_phase2.sql di SQL Editor.');
        const fallbackRes = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            role,
            requested_role,
            role_request_status,
            identity_number,
            study_program,
            faculty,
            phone,
            avatar_url,
            created_at,
            updated_at
          `)
          .or('role_request_status.in.(pending,approved,rejected),requested_role.eq.dosen')
          .order('updated_at', { ascending: false });

        if (fallbackRes.error) {
          throw new Error(fallbackRes.error.message);
        }

        return (fallbackRes.data || []).map(p => ({
          ...p,
          role_reviewed_by: null,
          role_reviewed_at: null,
          role_rejection_reason: null
        }));
      }

      throw new Error(error.message || 'Gagal memuat data pengajuan role.');
    }

    return data || [];
  } catch (err) {
    console.error('fetchRoleRequests error:', err);
    throw err;
  }
};

/**
 * Menyetujui atau menolak pengajuan role dosen (Khusus Administrator via RPC)
 * @param {Object} params
 * @param {string} params.targetUserId - UUID akun pemohon
 * @param {'approve'|'reject'} params.action - Aksi verifikasi
 * @param {string} [params.rejectionReason] - Alasan penolakan jika ditolak
 */
export const reviewRoleRequest = async ({ targetUserId, action, rejectionReason = '' }) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase belum dikonfigurasi.');
  }

  try {
    const { data, error } = await supabase.rpc('rpc_review_role_request', {
      p_target_user_id: targetUserId,
      p_action: action,
      p_rejection_reason: rejectionReason
    });

    if (error) {
      throw new Error(error.message || 'Gagal memproses peninjauan pengajuan role.');
    }

    return data;
  } catch (err) {
    console.error('reviewRoleRequest error:', err);
    throw err;
  }
};

/**
 * Pemohon mengajukan ulang verifikasi peran dosen (Mahasiswa / Dosen yang ditolak via RPC)
 * @param {Object} params
 * @param {string} params.identityNumber - NIP Dosen
 * @param {string} params.studyProgram - Program Studi
 * @param {string} params.faculty - Fakultas
 */
export const resubmitRoleRequest = async ({ identityNumber, studyProgram, faculty }) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase belum dikonfigurasi.');
  }

  try {
    const { data, error } = await supabase.rpc('rpc_resubmit_role_request', {
      p_identity_number: identityNumber.trim(),
      p_study_program: studyProgram.trim(),
      p_faculty: faculty.trim()
    });

    if (error) {
      throw new Error(error.message || 'Gagal mengirimkan pengajuan verifikasi role.');
    }

    return data;
  } catch (err) {
    console.error('resubmitRoleRequest error:', err);
    throw err;
  }
};
