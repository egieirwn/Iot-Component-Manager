-- ==============================================================================
-- Supabase Migration Script: Area A (Inventory Hard Delete Protection & is_active)
-- & Area B (Lecturer Role Request Verification Workflow & Audit Trails)
-- Jalankan skrip ini langsung di Supabase SQL Editor
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. AREA A: TABEL COMPONENTS (is_active & Soft Delete / Protection)
-- ------------------------------------------------------------------------------

-- Tambahkan kolom is_active jika belum ada
ALTER TABLE public.components 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Perbarui CHECK constraint pada status jika belum mengizinkan 'NONAKTIF'
DO $$
BEGIN
  ALTER TABLE public.components DROP CONSTRAINT IF EXISTS components_status_check;
  ALTER TABLE public.components ADD CONSTRAINT components_status_check
    CHECK (status IN ('TERSEDIA', 'DIPINJAM', 'HABIS', 'MAINTENANCE', 'NONAKTIF'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- RLS: Siswa & Dosen hanya bisa melihat komponen aktif (is_active = true), Admin melihat semua
DROP POLICY IF EXISTS "Components are viewable by everyone" ON public.components;
DROP POLICY IF EXISTS "Active components are viewable by everyone, all by admin" ON public.components;

CREATE POLICY "Active components are viewable by everyone, all by admin"
  ON public.components FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE OR public.is_admin());

-- Trigger: Mencegah penghapusan permanen (hard delete) jika komponen pernah dipinjam
CREATE OR REPLACE FUNCTION public.prevent_component_hard_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.borrowings WHERE component_id = OLD.id) THEN
    RAISE EXCEPTION 'Komponen tidak dapat dihapus permanen karena memiliki riwayat peminjaman. Silakan nonaktifkan komponen.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_component_delete ON public.components;
CREATE TRIGGER trigger_prevent_component_delete
  BEFORE DELETE ON public.components
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_component_hard_delete();

-- RPC: Mengaktifkan atau menonaktifkan komponen (Soft delete)
CREATE OR REPLACE FUNCTION public.rpc_toggle_component_active(
  p_component_id TEXT,
  p_is_active BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
  v_comp RECORD;
  v_new_status TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya administrator yang dapat mengubah status komponen.';
  END IF;

  SELECT * INTO v_comp FROM public.components WHERE id = p_component_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Komponen tidak ditemukan.';
  END IF;

  IF p_is_active THEN
    v_new_status := CASE WHEN v_comp.stock > 0 THEN 'TERSEDIA' ELSE 'HABIS' END;
  ELSE
    v_new_status := 'NONAKTIF';
  END IF;

  UPDATE public.components
  SET
    is_active = p_is_active,
    status = v_new_status,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_component_id;

  RETURN jsonb_build_object(
    'success', true,
    'component_id', p_component_id,
    'is_active', p_is_active,
    'status', v_new_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Perbarui rpc_borrow_component agar memvalidasi is_active
CREATE OR REPLACE FUNCTION public.rpc_borrow_component(
  p_component_id TEXT,
  p_quantity INTEGER,
  p_borrower_name TEXT,
  p_borrower_nim TEXT,
  p_borrower_email TEXT,
  p_purpose TEXT,
  p_notes TEXT,
  p_return_date TEXT,
  p_duration_days INTEGER DEFAULT 3
)
RETURNS JSONB AS $$
DECLARE
  v_comp RECORD;
  v_new_stock INTEGER;
  v_new_status TEXT;
  v_borrow_id TEXT;
  v_new_borrowing RECORD;
BEGIN
  -- 0. Validasi autentikasi caller (Mencegah peminjaman anonim)
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied: You must be logged in to borrow components.';
  END IF;

  -- 1. Validasi input
  IF p_quantity < 1 THEN
    RAISE EXCEPTION 'Jumlah pinjam harus minimal 1 unit.';
  END IF;

  -- 2. Ambil komponen dengan FOR UPDATE lock
  SELECT * INTO v_comp
  FROM public.components
  WHERE id = p_component_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Komponen tidak ditemukan di inventaris.';
  END IF;

  -- Validasi status keaktifan komponen
  IF NOT v_comp.is_active OR v_comp.status = 'NONAKTIF' THEN
    RAISE EXCEPTION 'Komponen ini sedang dinonaktifkan oleh administrator dan tidak dapat dipinjam.';
  END IF;

  IF v_comp.stock < p_quantity THEN
    RAISE EXCEPTION 'Stok tidak mencukupi! Tersisa % unit, diminta % unit.', v_comp.stock, p_quantity;
  END IF;

  -- 3. Hitung stok dan status baru
  v_new_stock := v_comp.stock - p_quantity;
  IF v_new_stock = 0 THEN
    v_new_status := 'DIPINJAM';
  ELSE
    v_new_status := 'TERSEDIA';
  END IF;

  -- 4. Potong stok komponen
  UPDATE public.components
  SET
    stock = v_new_stock,
    status = v_new_status,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_component_id;

  -- 5. Buat ID transaksi unik
  v_borrow_id := 'BRW-' || floor(extract(epoch from now()) * 1000)::text;

  -- 6. Insert catatan peminjaman
  INSERT INTO public.borrowings (
    id,
    user_id,
    component_id,
    component_name,
    component_code,
    category,
    borrower_name,
    borrower_nim,
    borrower_email,
    quantity,
    borrow_date,
    due_date,
    duration_days,
    remaining_days,
    pickup_lab,
    purpose,
    notes,
    status
  ) VALUES (
    v_borrow_id,
    auth.uid(),
    v_comp.id,
    v_comp.name,
    v_comp.code,
    v_comp.category,
    TRIM(p_borrower_name),
    TRIM(p_borrower_nim),
    TRIM(p_borrower_email),
    p_quantity,
    to_char(now(), 'YYYY-MM-DD'),
    p_return_date,
    p_duration_days,
    p_duration_days || ' hari tersisa',
    COALESCE(SPLIT_PART(v_comp.location, '·', 1), 'Lab Sistem Tertanam'),
    TRIM(p_purpose),
    TRIM(p_notes),
    'DIPINJAM'
  )
  RETURNING * INTO v_new_borrowing;

  RETURN jsonb_build_object(
    'success', true,
    'borrowing', to_jsonb(v_new_borrowing),
    'remaining_stock', v_new_stock
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------------------------
-- 2. AREA B: TABEL PROFILES (Audit Fields & Verifikasi Role Dosen)
-- ------------------------------------------------------------------------------

-- Kolom audit verifikasi role
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role_reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role_reviewed_at TIMESTAMPTZ;

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role_rejection_reason TEXT DEFAULT '';

-- Trigger proteksi role: Mencegah eskalasi role mandiri & penipuan status
CREATE OR REPLACE FUNCTION public.protect_profile_roles()
RETURNS TRIGGER AS $$
DECLARE
  caller_role TEXT;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();

    -- Jika bukan admin
    IF (caller_role IS DISTINCT FROM 'admin') THEN
      -- 1. Pengguna biasa TIDAK PERNAH boleh mengubah role akun secara langsung
      IF (NEW.role IS DISTINCT FROM OLD.role) THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya administrator yang dapat mengubah role akun.';
      END IF;

      -- 2. Pengguna biasa TIDAK BOLEH menyetujui pengajuannya sendiri (menjadi 'approved')
      IF (NEW.role_request_status = 'approved' AND OLD.role_request_status IS DISTINCT FROM 'approved') THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya administrator yang dapat menyetujui verifikasi role.';
      END IF;

      -- 3. Pengguna biasa TIDAK BOLEH memanipulasi kolom audit review
      IF (NEW.role_reviewed_by IS DISTINCT FROM OLD.role_reviewed_by) OR
         (NEW.role_reviewed_at IS DISTINCT FROM OLD.role_reviewed_at) THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya administrator yang dapat mengisi metadata peninjauan.';
      END IF;

      -- 4. Pengguna biasa hanya boleh mengajukan ulang dari 'none' atau 'rejected' ke 'pending' dengan requested_role = 'dosen'
      IF (NEW.role_request_status IS DISTINCT FROM OLD.role_request_status) THEN
        IF NOT (
          (OLD.role_request_status IN ('none', 'rejected') OR OLD.role_request_status IS NULL)
          AND NEW.role_request_status = 'pending'
          AND NEW.requested_role = 'dosen'
          AND NEW.role = 'mahasiswa'
        ) THEN
          RAISE EXCEPTION 'Akses ditolak: Perubahan status pengajuan role tidak diizinkan.';
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_protect_profile_roles ON public.profiles;
CREATE TRIGGER trigger_protect_profile_roles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_roles();

-- RPC 1: Administrator Menyetujui atau Menolak Pengajuan Role Dosen
CREATE OR REPLACE FUNCTION public.rpc_review_role_request(
  p_target_user_id UUID,
  p_action TEXT,
  p_rejection_reason TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  v_target RECORD;
  v_action TEXT := LOWER(TRIM(p_action));
  v_reason TEXT := TRIM(COALESCE(p_rejection_reason, ''));
BEGIN
  -- 1. Otorisasi caller: Hanya administrator yang diizinkan
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya administrator yang dapat meninjau pengajuan role.';
  END IF;

  -- 2. Validasi parameter aksi
  IF v_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Aksi tidak valid. Gunakan "approve" atau "reject".';
  END IF;

  -- 3. Ambil data profil target
  SELECT * INTO v_target
  FROM public.profiles
  WHERE id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil pengguna target tidak ditemukan.';
  END IF;

  IF v_target.role = 'admin' THEN
    RAISE EXCEPTION 'Tidak dapat mengubah role akun administrator.';
  END IF;

  -- 4. Eksekusi Aksi Approve / Reject
  IF v_action = 'approve' THEN
    UPDATE public.profiles
    SET
      role = 'dosen',
      role_request_status = 'approved',
      role_reviewed_by = auth.uid(),
      role_reviewed_at = timezone('utc'::text, now()),
      role_rejection_reason = NULL,
      updated_at = timezone('utc'::text, now())
    WHERE id = p_target_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'approved',
      'user_id', p_target_user_id,
      'new_role', 'dosen'
    );
  ELSE
    -- Validasi alasan penolakan wajib diisi
    IF v_reason = '' THEN
      RAISE EXCEPTION 'Alasan penolakan pengajuan wajib diisi.';
    END IF;

    UPDATE public.profiles
    SET
      role = 'mahasiswa',
      role_request_status = 'rejected',
      role_reviewed_by = auth.uid(),
      role_reviewed_at = timezone('utc'::text, now()),
      role_rejection_reason = v_reason,
      updated_at = timezone('utc'::text, now())
    WHERE id = p_target_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'rejected',
      'user_id', p_target_user_id,
      'new_role', 'mahasiswa',
      'rejection_reason', v_reason
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 2: Pemohon Mengajukan Ulang Permohonan Role Dosen
CREATE OR REPLACE FUNCTION public.rpc_resubmit_role_request(
  p_identity_number TEXT,
  p_study_program TEXT,
  p_faculty TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user RECORD;
  v_nip TEXT := TRIM(COALESCE(p_identity_number, ''));
  v_prog TEXT := TRIM(COALESCE(p_study_program, ''));
  v_fac TEXT := TRIM(COALESCE(p_faculty, ''));
BEGIN
  -- 1. Caller harus login
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: Anda harus login untuk mengajukan permohonan role.';
  END IF;

  -- 2. Ambil profil caller
  SELECT * INTO v_user
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil pengguna tidak ditemukan.';
  END IF;

  IF v_user.role IN ('admin', 'dosen') THEN
    RAISE EXCEPTION 'Akun Anda sudah memiliki hak akses %.', v_user.role;
  END IF;

  IF v_user.role_request_status = 'pending' THEN
    RAISE EXCEPTION 'Pengajuan Anda saat ini masih dalam proses peninjauan oleh administrator laboratorium.';
  END IF;

  -- 3. Validasi kelengkapan data
  IF v_nip = '' THEN
    RAISE EXCEPTION 'Nomor Induk Pegawai (NIP) / Identitas Dosen wajib diisi.';
  END IF;

  IF v_prog = '' OR v_fac = '' THEN
    RAISE EXCEPTION 'Program studi dan fakultas wajib diisi.';
  END IF;

  -- 4. Update data profil: status kembali ke pending, tetap berstatus mahasiswa saat menunggu
  UPDATE public.profiles
  SET
    role = 'mahasiswa',
    requested_role = 'dosen',
    role_request_status = 'pending',
    role_rejection_reason = NULL,
    role_reviewed_by = NULL,
    role_reviewed_at = NULL,
    identity_number = v_nip,
    study_program = v_prog,
    faculty = v_fac,
    updated_at = timezone('utc'::text, now())
  WHERE id = auth.uid();

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Pengajuan verifikasi role dosen berhasil dikirimkan.',
    'status', 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
