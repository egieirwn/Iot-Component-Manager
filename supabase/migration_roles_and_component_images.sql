-- ==============================================================================
-- MIGRATION: 3-Role Structure Correction & Component Image Upload Permissions
-- Project: IoT Component Manager
-- Official Roles: 'mahasiswa', 'dosen', 'superadmin'
-- Purpose:
--   1. Migrate existing 'admin' roles to 'superadmin' safely
--   2. Enforce CHECK (role IN ('mahasiswa', 'dosen', 'superadmin'))
--   3. Create 'component-images' storage bucket with RLS policies
--   4. Provide secure RPC 'rpc_update_component_image' for Dosen & Superadmin
--   5. Restrict inspection resolution & inventory mutations strictly to Superadmin
-- ==============================================================================

-- 1. HAPUS CHECK CONSTRAINT LAMA PADA TABEL PROFILES TERLEBIH DAHULU
-- Constraint lama harus dilepas terlebih dahulu agar PostgreSQL mengizinkan nilai 'superadmin'
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_requested_role_check;

-- Hapus juga jika ada constraint dinamis lain yang memeriksa kolom role
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'profiles'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%role%'
      AND con.conname NOT IN ('profiles_role_check', 'profiles_requested_role_check')
  ) LOOP
    EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- 2. MIGRASI DATA ROLE YANG ADA
-- Ubah akun 'admin' yang ada menjadi 'superadmin' tanpa menghapus data
UPDATE public.profiles
SET role = 'superadmin'
WHERE role = 'admin' OR role = 'staff_lab' OR (role NOT IN ('mahasiswa', 'dosen', 'superadmin') AND full_name ILIKE '%admin%');

-- 3. TERAPKAN CHECK CONSTRAINT BARU DENGAN 3 ROLE RESMI
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('mahasiswa', 'dosen', 'superadmin'));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_requested_role_check
  CHECK (requested_role IN ('none', 'dosen'));

-- 3. HELPER FUNCTIONS UNTUK VERIFIKASI ROLE
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Alias untuk backward compatibility (mengecek superadmin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT public.is_superadmin();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_dosen()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'dosen'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. UPDATE TRIGGER PROTEKSI ROLE PROFILE
-- Pengguna TIDAK PERNAH bisa mempromosikan diri ke superadmin
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_profile_role_update()
RETURNS TRIGGER AS $$
DECLARE
  caller_role TEXT;
BEGIN
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();

  -- Jika bukan superadmin
  IF (caller_role IS DISTINCT FROM 'superadmin') THEN
    -- Pengguna biasa tidak boleh mengubah role secara langsung
    IF (NEW.role IS DISTINCT FROM OLD.role) THEN
      RAISE EXCEPTION 'Akses ditolak: Hanya Superadmin yang dapat mengubah role akun.';
    END IF;

    -- Pengguna biasa tidak boleh menyetujui sendiri permintaan role
    IF (NEW.role_request_status IN ('approved', 'rejected') AND OLD.role_request_status = 'pending') THEN
      RAISE EXCEPTION 'Akses ditolak: Hanya Superadmin yang dapat menyetujui verifikasi role.';
    END IF;

    -- Pengguna hanya boleh meminta role 'dosen' (TIDAK PERNAH superadmin)
    IF (NEW.requested_role IS DISTINCT FROM OLD.requested_role) THEN
      IF (NEW.requested_role NOT IN ('none', 'dosen')) THEN
        RAISE EXCEPTION 'Akses ditolak: Permintaan role tidak valid. Hanya pengajuan dosen yang didukung.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. UPDATE TRIGGER REGISTRASI USER BARU
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  req_role TEXT;
  assigned_role TEXT;
  status_req TEXT;
BEGIN
  req_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'mahasiswa'));

  -- Role superadmin TIDAK PERNAH diberikan otomatis melalui registrasi publik
  IF req_role = 'dosen' THEN
    assigned_role := 'mahasiswa';
    status_req := 'pending';
  ELSE
    assigned_role := 'mahasiswa';
    status_req := 'none';
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    requested_role,
    role_request_status,
    phone,
    phone_number,
    whatsapp_notification_opt_in
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    assigned_role,
    CASE WHEN req_role = 'dosen' THEN 'dosen' ELSE 'none' END,
    status_req,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    TRUE
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. PERBARUI RLS PADA TABEL INVENTARIS (COMPONENTS)
-- Dosen TIDAK memiliki hak akses direct UPDATE pada tabel components
-- Hanya Superadmin yang boleh melakukan INSERT, UPDATE, DELETE langsung pada components
DROP POLICY IF EXISTS "Admins can insert components" ON public.components;
CREATE POLICY "Superadmin can insert components"
  ON public.components
  FOR INSERT
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "Admins can update components" ON public.components;
CREATE POLICY "Superadmin can update components"
  ON public.components
  FOR UPDATE
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "Admins can delete components" ON public.components;
CREATE POLICY "Superadmin can delete components"
  ON public.components
  FOR DELETE
  USING (public.is_superadmin());

-- 7. BUAT BUCKET STORAGE UNTUK FOTO KOMPONEN
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'component-images',
  'component-images',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 8. KEBIJAKAN STORAGE (RLS STORAGE.OBJECTS)
-- A. Siapa saja (termasuk publik dan mahasiswa) dapat melihat foto komponen
DROP POLICY IF EXISTS "Public can view component images" ON storage.objects;
CREATE POLICY "Public can view component images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'component-images');

-- B. Hanya Dosen dan Superadmin yang dapat mengunggah foto komponen
DROP POLICY IF EXISTS "Dosen and Superadmin can upload component images" ON storage.objects;
CREATE POLICY "Dosen and Superadmin can upload component images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'component-images'
    AND auth.uid() IS NOT NULL
    AND (public.is_superadmin() OR public.is_dosen())
  );

-- C. Hanya Dosen dan Superadmin yang dapat memperbarui foto komponen
DROP POLICY IF EXISTS "Dosen and Superadmin can update component images" ON storage.objects;
CREATE POLICY "Dosen and Superadmin can update component images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'component-images'
    AND auth.uid() IS NOT NULL
    AND (public.is_superadmin() OR public.is_dosen())
  )
  WITH CHECK (
    bucket_id = 'component-images'
    AND auth.uid() IS NOT NULL
    AND (public.is_superadmin() OR public.is_dosen())
  );

-- D. Hanya Dosen dan Superadmin yang dapat menghapus foto komponen
DROP POLICY IF EXISTS "Dosen and Superadmin can delete component images" ON storage.objects;
CREATE POLICY "Dosen and Superadmin can delete component images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'component-images'
    AND auth.uid() IS NOT NULL
    AND (public.is_superadmin() OR public.is_dosen())
  );

-- 9. RPC KHUSUS: rpc_update_component_image
-- Memungkinkan Dosen & Superadmin memperbarui HANYA kolom foto (image) komponen
-- Mencegah manipulasi stok, nama, kategori, kode, atau spesifikasi komponen oleh Dosen
CREATE OR REPLACE FUNCTION public.rpc_update_component_image(
  p_component_id TEXT,
  p_image_url TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_caller_role TEXT;
  v_comp RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: Anda harus login untuk memperbarui foto komponen.';
  END IF;

  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('dosen', 'superadmin') THEN
    RAISE EXCEPTION 'Akses ditolak: Mahasiswa tidak memiliki izin untuk mengunggah atau mengubah foto komponen.';
  END IF;

  SELECT * INTO v_comp FROM public.components WHERE id = p_component_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Komponen dengan ID % tidak ditemukan.', p_component_id;
  END IF;

  -- Default fallback jika url kosong
  IF p_image_url IS NULL OR TRIM(p_image_url) = '' THEN
    p_image_url := '/assets/images/arduino.png';
  END IF;

  -- Update HANYA kolom image dan updated_at
  UPDATE public.components
  SET
    image = p_image_url,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_component_id;

  RETURN jsonb_build_object(
    'success', true,
    'component_id', p_component_id,
    'image', p_image_url,
    'updated_by_role', v_caller_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. UPDATE KEBIJAKAN INSPEKSI & RPC RESOLUTION
-- Hanya Superadmin yang berwenang mengelola dan memutuskan laporan inspeksi kerusakan
DROP POLICY IF EXISTS "Admins full access to inspections" ON public.component_inspections;
CREATE POLICY "Superadmin full access to inspections"
  ON public.component_inspections
  FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

CREATE OR REPLACE FUNCTION public.rpc_resolve_inspection(
  p_inspection_id UUID,
  p_decision TEXT, -- 'usable' | 'under_repair' | 'retired'
  p_notes TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  v_insp RECORD;
  v_comp RECORD;
  v_new_stock INTEGER;
  v_new_maint INTEGER;
  v_new_dmg INTEGER;
  v_new_total INTEGER;
  v_active_borrowed BIGINT := 0;
  v_new_status TEXT;
BEGIN
  -- Verifikasi role superadmin
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Superadmin yang berwenang memutuskan laporan inspeksi komponen.';
  END IF;

  IF p_decision NOT IN ('usable', 'under_repair', 'retired') THEN
    RAISE EXCEPTION 'Keputusan inspeksi tidak valid. Pilih antara: usable, under_repair, atau retired.';
  END IF;

  SELECT * INTO v_insp
  FROM public.component_inspections
  WHERE id = p_inspection_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Catatan inspeksi tidak ditemukan.';
  END IF;

  SELECT * INTO v_comp
  FROM public.components
  WHERE id = v_insp.component_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Komponen terkait inspeksi ini tidak ditemukan.';
  END IF;

  v_new_stock := COALESCE(v_comp.stock, 0);
  v_new_maint := COALESCE(v_comp.maintenance_stock, 0);
  v_new_dmg := COALESCE(v_comp.damaged_stock, 0);
  v_new_total := COALESCE(v_comp.total_stock, 0);

  IF p_decision = 'usable' THEN
    IF v_insp.reported_condition = 'Perlu Pengecekan' OR v_insp.inspection_status = 'under_repair' THEN
      v_new_maint := GREATEST(0, v_new_maint - v_insp.quantity);
    ELSE
      v_new_dmg := GREATEST(0, v_new_dmg - v_insp.quantity);
    END IF;
    v_new_stock := v_new_stock + v_insp.quantity;

  ELSIF p_decision = 'under_repair' THEN
    IF v_insp.reported_condition = 'Rusak' AND v_insp.inspection_status = 'pending_inspection' THEN
      v_new_dmg := GREATEST(0, v_new_dmg - v_insp.quantity);
      v_new_maint := v_new_maint + v_insp.quantity;
    END IF;

  ELSIF p_decision = 'retired' THEN
    IF v_insp.reported_condition = 'Perlu Pengecekan' OR v_insp.inspection_status = 'under_repair' THEN
      v_new_maint := GREATEST(0, v_new_maint - v_insp.quantity);
    ELSE
      v_new_dmg := GREATEST(0, v_new_dmg - v_insp.quantity);
    END IF;
    v_new_total := GREATEST(0, v_new_total - v_insp.quantity);
  END IF;

  SELECT COALESCE(SUM(quantity), 0) INTO v_active_borrowed
  FROM public.borrowings
  WHERE component_id = v_comp.id
    AND status = 'DIPINJAM';

  v_new_status := public.calculate_component_status(
    v_new_total,
    v_new_stock,
    v_active_borrowed,
    v_new_maint,
    v_new_dmg,
    v_comp.is_active
  );

  UPDATE public.components
  SET
    stock = v_new_stock,
    total_stock = v_new_total,
    maintenance_stock = v_new_maint,
    damaged_stock = v_new_dmg,
    status = v_new_status,
    updated_at = timezone('utc'::text, now())
  WHERE id = v_comp.id;

  UPDATE public.component_inspections
  SET
    inspection_status = CASE WHEN p_decision = 'under_repair' THEN 'under_repair' ELSE 'inspected' END,
    decision = p_decision,
    decision_notes = p_notes,
    inspected_by = auth.uid(),
    inspected_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_inspection_id;

  RETURN jsonb_build_object(
    'success', true,
    'decision', p_decision,
    'component_id', v_comp.id,
    'new_stock', v_new_stock,
    'new_total_stock', v_new_total,
    'new_maintenance_stock', v_new_maint,
    'new_damaged_stock', v_new_dmg,
    'new_status', v_new_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. UPDATE VERIFIKASI ROLE DOSEN: rpc_review_role_request
-- Hanya Superadmin yang berwenang meninjau permohonan role
CREATE OR REPLACE FUNCTION public.rpc_review_role_request(
  p_target_user_id UUID,
  p_action TEXT, -- 'approved' | 'rejected'
  p_rejection_reason TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  v_target RECORD;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Superadmin yang dapat meninjau pengajuan role.';
  END IF;

  IF p_action NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Aksi tidak valid. Gunakan "approved" atau "rejected".';
  END IF;

  SELECT * INTO v_target FROM public.profiles WHERE id = p_target_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengguna target tidak ditemukan.';
  END IF;

  IF v_target.role = 'superadmin' THEN
    RAISE EXCEPTION 'Tidak dapat mengubah role akun superadmin.';
  END IF;

  IF p_action = 'approved' THEN
    UPDATE public.profiles
    SET
      role = 'dosen',
      requested_role = 'none',
      role_request_status = 'approved',
      role_reviewed_by = auth.uid(),
      role_reviewed_at = timezone('utc'::text, now()),
      role_rejection_reason = '',
      updated_at = timezone('utc'::text, now())
    WHERE id = p_target_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'user_id', p_target_user_id,
      'status', 'approved',
      'new_role', 'dosen'
    );
  ELSE
    UPDATE public.profiles
    SET
      role = 'mahasiswa',
      requested_role = 'none',
      role_request_status = 'rejected',
      role_reviewed_by = auth.uid(),
      role_reviewed_at = timezone('utc'::text, now()),
      role_rejection_reason = COALESCE(p_rejection_reason, 'Pengajuan ditolak oleh administrator.'),
      updated_at = timezone('utc'::text, now())
    WHERE id = p_target_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'user_id', p_target_user_id,
      'status', 'rejected',
      'new_role', 'mahasiswa'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

