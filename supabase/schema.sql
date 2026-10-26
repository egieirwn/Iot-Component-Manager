-- ==============================================================================
-- Schema Supabase PostgreSQL untuk IoT Component Manager
-- Tabel: profiles, components, borrowings + Row Level Security (RLS) & RPC Functions
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABEL PROFILES (Terkoneksi ke auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'mahasiswa' CHECK (role IN ('mahasiswa', 'dosen', 'admin')),
  requested_role TEXT CHECK (requested_role IN ('mahasiswa', 'dosen', 'admin')),
  role_request_status TEXT NOT NULL DEFAULT 'none' CHECK (role_request_status IN ('none', 'pending', 'approved', 'rejected')),
  identity_number TEXT DEFAULT '', -- NIM untuk mahasiswa, NIP untuk dosen
  study_program TEXT DEFAULT '',   -- Program studi atau Jurusan
  faculty TEXT DEFAULT '',         -- Fakultas atau Unit
  phone TEXT DEFAULT '',           -- Nomor telepon WhatsApp/kontak
  avatar_url TEXT DEFAULT '',      -- URL foto profil
  profile_completed BOOLEAN NOT NULL DEFAULT FALSE,
  role_reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  role_reviewed_at TIMESTAMPTZ,
  role_rejection_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index pencarian profil
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_identity_number ON public.profiles(identity_number);

-- 3. TABEL COMPONENTS (Inventaris Komponen IoT)
CREATE TABLE IF NOT EXISTS public.components (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  maintenance_stock INTEGER NOT NULL DEFAULT 0 CHECK (maintenance_stock >= 0),
  damaged_stock INTEGER NOT NULL DEFAULT 0 CHECK (damaged_stock >= 0),
  total_stock INTEGER NOT NULL DEFAULT 0 CHECK (total_stock >= 0),
  condition TEXT NOT NULL DEFAULT 'Baik',
  status TEXT NOT NULL DEFAULT 'TERSEDIA' CHECK (status IN ('TERSEDIA', 'DIPINJAM', 'HABIS', 'MAINTENANCE', 'NONAKTIF')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  image TEXT DEFAULT '',
  description TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  location TEXT DEFAULT '',
  specs JSONB DEFAULT '{}'::jsonb,
  borrower_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_components_category ON public.components(category);
CREATE INDEX IF NOT EXISTS idx_components_status ON public.components(status);

-- 4. TABEL BORROWINGS (Riwayat & Transaksi Peminjaman)
CREATE TABLE IF NOT EXISTS public.borrowings (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  component_id TEXT REFERENCES public.components(id) ON DELETE SET NULL,
  component_name TEXT NOT NULL,
  component_code TEXT NOT NULL,
  category TEXT DEFAULT '',
  borrower_name TEXT NOT NULL,
  borrower_nim TEXT DEFAULT '',
  borrower_email TEXT DEFAULT '',
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  borrow_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  duration_days INTEGER DEFAULT 3,
  remaining_days TEXT DEFAULT '',
  pickup_lab TEXT DEFAULT 'Lab Sistem Tertanam',
  purpose TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'DIPINJAM' CHECK (status IN ('DIPINJAM', 'DIKEMBALIKAN')),
  return_date TEXT DEFAULT NULL,
  return_condition TEXT DEFAULT NULL,
  return_notes TEXT DEFAULT NULL,
  checklist JSONB DEFAULT '[]'::jsonb,
  receipt_code TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_borrowings_user_id ON public.borrowings(user_id);
CREATE INDEX IF NOT EXISTS idx_borrowings_component_id ON public.borrowings(component_id);
CREATE INDEX IF NOT EXISTS idx_borrowings_status ON public.borrowings(status);

-- ==============================================================================
-- 5. TRIGGERS & FUNCTIONS
-- ==============================================================================

-- A. Auto-update timestamp 'updated_at'
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trigger_components_updated_at ON public.components;
CREATE TRIGGER trigger_components_updated_at
  BEFORE UPDATE ON public.components
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trigger_borrowings_updated_at ON public.borrowings;
CREATE TRIGGER trigger_borrowings_updated_at
  BEFORE UPDATE ON public.borrowings
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- B. Handle New User Signup from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_requested_role TEXT;
  v_role_request_status TEXT;
  v_role TEXT;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_requested_role := NEW.raw_user_meta_data->>'requested_role';

  -- Aturan Keamanan Role:
  -- Role publik default selalu 'mahasiswa'.
  -- Jika user meminta role 'dosen', role tetap 'mahasiswa' dan status permintaan menjadi 'pending'.
  -- Role 'admin' TIDAK PERNAH diberikan otomatis melalui registrasi publik.
  IF v_requested_role = 'dosen' THEN
    v_role := 'mahasiswa';
    v_role_request_status := 'pending';
  ELSE
    v_role := 'mahasiswa';
    v_requested_role := NULL;
    v_role_request_status := 'none';
  END IF;

  INSERT INTO public.profiles (
    id,
    full_name,
    role,
    requested_role,
    role_request_status,
    profile_completed
  ) VALUES (
    NEW.id,
    v_full_name,
    v_role,
    v_requested_role,
    v_role_request_status,
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Mencegah kegagalan registrasi Supabase Auth jika terjadi error transient pada tabel profil
  RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- C. Proteksi Integritas Role: Mencegah user biasa mengubah role diri sendiri melalui API client
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

-- D. Proteksi Hard Delete Komponen: Mencegah penghapusan jika ada riwayat transaksi
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

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrowings ENABLE ROW LEVEL SECURITY;

-- Helper function: cek apakah user adalah admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- A. PROFILES POLICIES
-- Siapa saja yang terautentikasi dapat membaca profil (diperlukan untuk menampilkan nama peminjam/anggota lab)
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Pengguna dapat membuat profil awal miliknya sendiri (fallback jika trigger belum selesai), dibatasi role mahasiswa
CREATE POLICY "Users can insert own initial profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND role = 'mahasiswa'
  );

-- Pengguna hanya dapat memperbarui profil miliknya sendiri, atau Admin dapat memperbarui semua
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- B. COMPONENTS POLICIES
-- Mahasiswa & Dosen hanya dapat melihat komponen aktif, Admin dapat melihat semua
CREATE POLICY "Active components are viewable by everyone, all by admin"
  ON public.components FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE OR public.is_admin());

-- Hanya Admin yang boleh INSERT, UPDATE, DELETE komponen secara langsung
CREATE POLICY "Admins can insert components"
  ON public.components FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update components"
  ON public.components FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete components"
  ON public.components FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- C. BORROWINGS POLICIES
-- Pengguna hanya dapat melihat peminjaman miliknya sendiri, kecuali Admin atau Dosen dapat melihat semua
CREATE POLICY "Users can view own borrowings or staff can view all"
  ON public.borrowings FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'dosen')
    )
  );

-- Pengguna dapat mengajukan peminjaman atas namanya sendiri
CREATE POLICY "Users can insert own borrowing"
  ON public.borrowings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Pengguna dapat memperbarui peminjaman miliknya (misal untuk mencatat pengembalian), atau Admin
CREATE POLICY "Users can update own borrowing or admin can update"
  ON public.borrowings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Proteksi Data: Transaksi peminjaman TIDAK BOLEH dihapus (riwayat harus selalu tersimpan)
-- Tidak dibuat policy DELETE untuk borrowings!

-- ==============================================================================
-- 7. ATOMIC RPC TRANSACTIONS (Mencegah Race Conditions & Stok Negatif)
-- ==============================================================================

-- A. Atomic Peminjaman Komponen
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
  -- 0. Validasi autentikasi caller (Mencegah peminjaman anonim / unauthenticated)
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied: You must be logged in to borrow components.';
  END IF;

  -- 1. Validasi input
  IF p_quantity < 1 THEN
    RAISE EXCEPTION 'Jumlah pinjam harus minimal 1 unit.';
  END IF;

  -- 2. Ambil komponen dengan FOR UPDATE lock untuk mencegah race condition
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

-- B. Atomic Pengembalian Komponen
CREATE OR REPLACE FUNCTION public.rpc_return_component(
  p_borrow_id TEXT,
  p_condition TEXT DEFAULT 'Baik',
  p_notes TEXT DEFAULT '',
  p_checklist JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_borrow RECORD;
  v_comp RECORD;
  v_new_stock INTEGER;
  v_new_maint INTEGER;
  v_new_dmg INTEGER;
  v_return_date_str TEXT;
  v_receipt_code TEXT;
  v_updated_borrowing RECORD;
BEGIN
  -- 1. Ambil transaksi peminjaman dengan FOR UPDATE lock
  SELECT * INTO v_borrow
  FROM public.borrowings
  WHERE id = p_borrow_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi peminjaman tidak ditemukan.';
  END IF;

  -- 2. Validasi otorisasi caller: Harus login dan merupakan pemilik transaksi atau admin
  IF auth.uid() IS NULL
     OR (
       v_borrow.user_id IS DISTINCT FROM auth.uid()
       AND NOT public.is_admin()
     )
  THEN
    RAISE EXCEPTION 'Access denied: You can only return your own borrowing transactions.';
  END IF;

  IF v_borrow.status = 'DIKEMBALIKAN' THEN
    RAISE EXCEPTION 'Komponen dari transaksi ini sudah pernah dikembalikan sebelumnya.';
  END IF;

  -- 2. Ambil komponen
  SELECT * INTO v_comp
  FROM public.components
  WHERE id = v_borrow.component_id
  FOR UPDATE;

  -- 3. Hitung distribusi stok berdasarkan kondisi pengembalian
  v_new_stock := COALESCE(v_comp.stock, 0);
  v_new_maint := COALESCE(v_comp.maintenance_stock, 0);
  v_new_dmg := COALESCE(v_comp.damaged_stock, 0);

  IF p_condition IN ('Baik', 'Berfungsi') THEN
    v_new_stock := v_new_stock + v_borrow.quantity;
  ELSIF p_condition = 'Perlu Pengecekan' THEN
    v_new_maint := v_new_maint + v_borrow.quantity;
  ELSIF p_condition = 'Rusak' THEN
    v_new_dmg := v_new_dmg + v_borrow.quantity;
  ELSE
    v_new_stock := v_new_stock + v_borrow.quantity;
  END IF;

  -- 4. Update stok komponen
  IF v_comp.id IS NOT NULL THEN
    UPDATE public.components
    SET
      stock = v_new_stock,
      maintenance_stock = v_new_maint,
      damaged_stock = v_new_dmg,
      status = CASE WHEN v_new_stock > 0 THEN 'TERSEDIA' ELSE status END,
      updated_at = timezone('utc'::text, now())
    WHERE id = v_comp.id;
  END IF;

  -- 5. Format waktu pengembalian dan nomor resi
  v_return_date_str := to_char(now(), 'DD Mon YYYY - HH24:MI') || ' WIB';
  v_receipt_code := 'RT-' || to_char(now(), 'YYYY') || '-' || lpad(floor(random() * 9000 + 1000)::text, 4, '0');

  -- 6. Update transaksi peminjaman
  UPDATE public.borrowings
  SET
    status = 'DIKEMBALIKAN',
    return_date = v_return_date_str,
    return_condition = p_condition,
    return_notes = p_notes,
    checklist = p_checklist,
    receipt_code = v_receipt_code,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_borrow_id
  RETURNING * INTO v_updated_borrowing;

  RETURN jsonb_build_object(
    'success', true,
    'borrowing', to_jsonb(v_updated_borrowing),
    'receipt_code', v_receipt_code,
    'new_stock', v_new_stock
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- C. Soft Delete / Toggle Status Aktif Komponen (Admin Only)
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

-- D. Administrator Menyetujui atau Menolak Pengajuan Role Dosen
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
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya administrator yang dapat meninjau pengajuan role.';
  END IF;

  IF v_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Aksi tidak valid. Gunakan "approve" atau "reject".';
  END IF;

  SELECT * INTO v_target
  FROM public.profiles
  WHERE id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil pengguna target tidak ditemukan.';
  END IF;

  IF v_target.role = 'admin' THEN
    RAISE EXCEPTION 'Tidak dapat mengubah role akun administrator.';
  END IF;

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

-- E. Pemohon Mengajukan Ulang Permohonan Role Dosen
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: Anda harus login untuk mengajukan permohonan role.';
  END IF;

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

  IF v_nip = '' THEN
    RAISE EXCEPTION 'Nomor Induk Pegawai (NIP) / Identitas Dosen wajib diisi.';
  END IF;

  IF v_prog = '' OR v_fac = '' THEN
    RAISE EXCEPTION 'Program studi dan fakultas wajib diisi.';
  END IF;

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

-- ==============================================================================
-- 8. INITIAL SEED DATA (Komponen Awal IoT Laboratorium)
-- ==============================================================================

INSERT INTO public.components (
  id, code, name, category, stock, maintenance_stock, damaged_stock, total_stock, condition, status, image, description, tags, location, specs
) VALUES
(
  'arduino-uno-r3',
  'MCU-00182',
  'Arduino Uno R3',
  'Mikrokontroler',
  14, 0, 0, 14,
  'Baik',
  'TERSEDIA',
  '/assets/images/arduino.png',
  'Papan mikrokontroler berbasis ATmega328P untuk pembuatan purwarupa rangkaian elektronika dan proyek IoT dasar. Mudah diprogram dan kompatibel dengan berbagai sensor dan aktuator.',
  ARRAY['MIKROKONTROLER', 'ARDUINO', 'ATMEGA328P'],
  'Lab Sistem Tertanam · Lemari A · Rak 01',
  '{"prosesor": "ATmega328P", "koneksi": "USB Tipe-B", "termasuk": "Board Arduino Uno R3 · Kabel USB"}'::jsonb
),
(
  'sensor-dht22',
  'SNS-00324',
  'Sensor DHT22 (Suhu & Kelembaban)',
  'Sensor',
  4, 0, 0, 4,
  'Baik',
  'TERSEDIA',
  '/assets/images/dht22.png',
  'Sensor digital untuk mengukur suhu dan kelembaban udara relatif dengan akurasi tinggi dan sinyal keluaran digital terkalibrasi. Cocok untuk proyek monitoring lingkungan dan stasiun cuaca IoT.',
  ARRAY['SENSOR', 'SUHU', 'KELEMBABAN'],
  'Lab Sistem Tertanam · Lemari C · Rak 02',
  '{"prosesor": "Keluaran Sinyal Digital", "koneksi": "1-Wire Digital (Pin Data)", "termasuk": "Modul Sensor DHT22 · Resistor Pull-up"}'::jsonb
),
(
  'esp32-devkit-v1',
  'MCU-00214',
  'ESP32 DevKit V1',
  'Mikrokontroler',
  2, 0, 0, 2,
  'Baik',
  'TERSEDIA',
  '/assets/images/esp32.png',
  'Modul mikrokontroler ESP32 untuk prototipe terhubung, jaringan sensor, dan sistem tertanam. Cocok untuk proyek IoT, otomasi, dan pengembangan embedded.',
  ARRAY['MIKROKONTROLER', 'ESP32', 'WIFI'],
  'Laboratorium Inovasi · Lemari B · Rak 03',
  '{"prosesor": "ESP32 WROOM", "koneksi": "WiFi · Bluetooth", "termasuk": "Modul · Kabel Micro-USB"}'::jsonb
),
(
  'relay-module-4ch',
  'MOD-00105',
  'Relay Module 4 Channel',
  'Modul',
  8, 0, 0, 8,
  'Baik',
  'TERSEDIA',
  '/assets/images/arduino.png',
  'Modul relay 4 kanal 5V untuk mengendalikan perangkat berdaya listrik tinggi menggunakan saklar digital terisolasi optocoupler.',
  ARRAY['MODUL', 'RELAY', '5V'],
  'Lab Sistem Tertanam · Lemari B · Rak 01',
  '{"prosesor": "Optocoupler Isolation", "koneksi": "Pin Header 5V", "termasuk": "Modul Relay 4-Channel"}'::jsonb
),
(
  'kabel-jumper-mf',
  'ACC-00042',
  'Kabel Jumper Male to Female',
  'Aksesoris',
  15, 0, 0, 15,
  'Baik',
  'TERSEDIA',
  '/assets/images/dht22.png',
  'Set kabel jumper 20cm male-to-female 40 pin pita untuk kemudahan koneksi fleksibel antar breadboard dan modul elektronika.',
  ARRAY['AKSESORIS', 'KABEL', 'JUMPER'],
  'Lab Sistem Tertanam · Kotak Aksesoris 01',
  '{"prosesor": "Tembaga Berkualitas", "koneksi": "Male ke Female", "termasuk": "40 Pin Kabel Pita 20cm"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  stock = EXCLUDED.stock,
  total_stock = EXCLUDED.total_stock,
  status = EXCLUDED.status;
