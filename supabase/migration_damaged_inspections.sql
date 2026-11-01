-- ==============================================================================
-- MIGRATION: Damaged Component Return & Admin Inspection Workflow
-- Project: IoT Component Manager
-- Purpose: Track damaged / needs inspection returns, separate hold inventory,
--          provide Admin resolution workflow (usable, under_repair, retired)
-- ==============================================================================

-- 1. Create table for component inspections
CREATE TABLE IF NOT EXISTS public.component_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrowing_id TEXT REFERENCES public.borrowings(id) ON DELETE SET NULL,
  component_id TEXT NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  component_name TEXT NOT NULL,
  component_code TEXT,
  component_image TEXT,
  borrower_name TEXT,
  borrower_email TEXT,
  borrower_nim TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  reported_condition TEXT NOT NULL, -- 'Perlu Pengecekan' | 'Rusak'
  damage_notes TEXT,
  inspection_status TEXT NOT NULL DEFAULT 'pending_inspection', -- 'pending_inspection' | 'under_repair' | 'inspected'
  decision TEXT, -- 'usable' | 'under_repair' | 'retired'
  decision_notes TEXT,
  inspected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  inspected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_inspections_status ON public.component_inspections(inspection_status);
CREATE INDEX IF NOT EXISTS idx_inspections_component_id ON public.component_inspections(component_id);
CREATE INDEX IF NOT EXISTS idx_inspections_borrowing_id ON public.component_inspections(borrowing_id);

-- 3. Row Level Security (RLS)
ALTER TABLE public.component_inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access to inspections" ON public.component_inspections;
CREATE POLICY "Admins full access to inspections"
  ON public.component_inspections
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can view own inspections" ON public.component_inspections;
CREATE POLICY "Users can view own inspections"
  ON public.component_inspections
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      borrower_email = auth.jwt() ->> 'email'
      OR EXISTS (
        SELECT 1 FROM public.borrowings b
        WHERE b.id = component_inspections.borrowing_id AND b.user_id = auth.uid()
      )
    )
  );

-- 4. Update rpc_return_component to create inspection record on damaged / inspection returns
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
  v_remaining_borrowed BIGINT := 0;
  v_new_status TEXT;
  v_inspection_id UUID := NULL;
BEGIN
  -- 1. Lock transaksi peminjaman
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

  -- 3. Lock komponen
  SELECT * INTO v_comp
  FROM public.components
  WHERE id = v_borrow.component_id
  FOR UPDATE;

  -- 4. Hitung distribusi stok berdasarkan kondisi
  v_new_stock := COALESCE(v_comp.stock, 0);
  v_new_maint := COALESCE(v_comp.maintenance_stock, 0);
  v_new_dmg := COALESCE(v_comp.damaged_stock, 0);

  IF p_condition IN ('Baik', 'Berfungsi') THEN
    -- Kembali ke stok tersedia
    v_new_stock := v_new_stock + v_borrow.quantity;
  ELSIF p_condition = 'Perlu Pengecekan' THEN
    -- Masuk ke stok maintenance/hold pemeriksaan
    v_new_maint := v_new_maint + v_borrow.quantity;
  ELSIF p_condition = 'Rusak' THEN
    -- Masuk ke stok rusak/hold perbaikan
    v_new_dmg := v_new_dmg + v_borrow.quantity;
  ELSE
    v_new_stock := v_new_stock + v_borrow.quantity;
  END IF;

  -- 5. Hitung sisa peminjaman aktif lainnya
  SELECT COALESCE(SUM(quantity), 0) INTO v_remaining_borrowed
  FROM public.borrowings
  WHERE component_id = v_borrow.component_id
    AND status = 'DIPINJAM'
    AND id <> p_borrow_id;

  -- 6. Hitung status baru
  v_new_status := public.calculate_component_status(
    v_comp.total_stock,
    v_new_stock,
    v_remaining_borrowed,
    v_new_maint,
    v_new_dmg,
    v_comp.is_active
  );

  -- 7. Update stok & status komponen
  IF v_comp.id IS NOT NULL THEN
    UPDATE public.components
    SET
      stock = v_new_stock,
      maintenance_stock = v_new_maint,
      damaged_stock = v_new_dmg,
      status = v_new_status,
      updated_at = timezone('utc'::text, now())
    WHERE id = v_comp.id;
  END IF;

  -- 8. Jika kondisi bukan Baik/Berfungsi, buat catatan inspeksi untuk Admin
  IF p_condition IN ('Perlu Pengecekan', 'Rusak') THEN
    INSERT INTO public.component_inspections (
      borrowing_id,
      component_id,
      component_name,
      component_code,
      component_image,
      borrower_name,
      borrower_email,
      borrower_nim,
      quantity,
      reported_condition,
      damage_notes,
      inspection_status
    ) VALUES (
      p_borrow_id,
      v_comp.id,
      COALESCE(v_comp.name, v_borrow.component_name),
      v_comp.code,
      v_comp.image,
      v_borrow.borrower_name,
      v_borrow.borrower_email,
      v_borrow.nim,
      v_borrow.quantity,
      p_condition,
      p_notes,
      'pending_inspection'
    ) RETURNING id INTO v_inspection_id;
  END IF;

  -- 9. Format tanggal & resi
  v_return_date_str := to_char(now(), 'DD Mon YYYY - HH24:MI') || ' WIB';
  v_receipt_code := 'RT-' || to_char(now(), 'YYYY') || '-' || lpad(floor(random() * 9000 + 1000)::text, 4, '0');

  -- 10. Update transaksi peminjaman
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
    'borrowing', row_to_json(v_updated_borrowing),
    'new_stock', v_new_stock,
    'new_maintenance_stock', v_new_maint,
    'new_damaged_stock', v_new_dmg,
    'new_status', v_new_status,
    'receipt_code', v_receipt_code,
    'inspection_id', v_inspection_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC rpc_resolve_inspection: Dipanggil oleh Admin untuk memverifikasi inspeksi
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
  v_admin_profile RECORD;
BEGIN
  -- 1. Verifikasi role admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Admin yang dapat memproses keputusan inspeksi.';
  END IF;

  -- 2. Validasi input decision
  IF p_decision NOT IN ('usable', 'under_repair', 'retired') THEN
    RAISE EXCEPTION 'Keputusan inspeksi tidak valid. Pilih antara: usable, under_repair, atau retired.';
  END IF;

  -- 3. Lock inspection record
  SELECT * INTO v_insp
  FROM public.component_inspections
  WHERE id = p_inspection_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Catatan inspeksi tidak ditemukan.';
  END IF;

  -- 4. Lock komponen terkait
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

  -- 5. Terapkan efek keputusan pada akuntansi stok (mencegah double count)
  IF p_decision = 'usable' THEN
    -- Komponen dinyatakan layak pakai: keluarkan dari hold pemeriksaan/rusak, masukkan ke stok tersedia
    IF v_insp.reported_condition = 'Perlu Pengecekan' OR v_insp.inspection_status = 'under_repair' THEN
      v_new_maint := GREATEST(0, v_new_maint - v_insp.quantity);
    ELSE
      v_new_dmg := GREATEST(0, v_new_dmg - v_insp.quantity);
    END IF;
    v_new_stock := v_new_stock + v_insp.quantity;

  ELSIF p_decision = 'under_repair' THEN
    -- Komponen perlu diservis: jika sebelumnya tercatat rusak, pindahkan ke maintenance stock
    IF v_insp.reported_condition = 'Rusak' AND v_insp.inspection_status = 'pending_inspection' THEN
      v_new_dmg := GREATEST(0, v_new_dmg - v_insp.quantity);
      v_new_maint := v_new_maint + v_insp.quantity;
    END IF;
    -- Stok tersedia tetap tidak bertambah karena unit masih diservis

  ELSIF p_decision = 'retired' THEN
    -- Komponen diafkir/rusak permanen: hapus dari hold dan kurangi total_stock
    IF v_insp.reported_condition = 'Perlu Pengecekan' OR v_insp.inspection_status = 'under_repair' THEN
      v_new_maint := GREATEST(0, v_new_maint - v_insp.quantity);
    ELSE
      v_new_dmg := GREATEST(0, v_new_dmg - v_insp.quantity);
    END IF;
    v_new_total := GREATEST(0, v_new_total - v_insp.quantity);
    -- Stok tersedia tetap karena sebelumnya memang tidak tersedia
  END IF;

  -- 6. Hitung peminjaman aktif saat ini
  SELECT COALESCE(SUM(quantity), 0) INTO v_active_borrowed
  FROM public.borrowings
  WHERE component_id = v_comp.id
    AND status = 'DIPINJAM';

  -- 7. Hitung status baru secara otomatis
  v_new_status := public.calculate_component_status(
    v_new_total,
    v_new_stock,
    v_active_borrowed,
    v_new_maint,
    v_new_dmg,
    v_comp.is_active
  );

  -- 8. Update data komponen
  UPDATE public.components
  SET
    stock = v_new_stock,
    total_stock = v_new_total,
    maintenance_stock = v_new_maint,
    damaged_stock = v_new_dmg,
    status = v_new_status,
    updated_at = timezone('utc'::text, now())
  WHERE id = v_comp.id;

  -- 9. Update catatan inspeksi
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
