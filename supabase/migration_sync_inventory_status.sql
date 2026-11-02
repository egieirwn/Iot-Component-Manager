-- ==============================================================================
-- Supabase Migration Script: Inventory Stock & Availability Status Synchronization
-- Issue: fix: synchronize inventory availability with stock changes (Priority P0)
-- Jalankan skrip ini langsung di Supabase SQL Editor
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PERBARUI CONSTRAINT STATUS PADA TABEL COMPONENTS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE public.components DROP CONSTRAINT IF EXISTS components_status_check;
  ALTER TABLE public.components ADD CONSTRAINT components_status_check
    CHECK (status IN (
      'Tersedia', 'Sebagian Dipinjam', 'Sedang Dipinjam', 'Tidak Tersedia', 'Dalam Pemeriksaan', 'Nonaktif',
      'TERSEDIA', 'DIPINJAM', 'HABIS', 'MAINTENANCE', 'NONAKTIF'
    ));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 2. FUNGSI HELPER: MENGHITUNG STATUS KETERSEDIAAN KOMPONEN
-- Menggunakan tipe NUMERIC agar kompatibel dengan INTEGER maupun BIGINT (SUM)
-- Aturan Status:
-- - 'Tidak Tersedia': Jika is_active = false ATAU (available = 0 AND borrowed = 0 AND maint = 0 AND dmg = 0)
-- - 'Tersedia': Jika available > 0 AND borrowed = 0
-- - 'Sebagian Dipinjam': Jika available > 0 AND borrowed > 0
-- - 'Sedang Dipinjam': Jika available = 0 AND borrowed > 0
-- - 'Dalam Pemeriksaan': Jika available = 0 AND borrowed = 0 AND (maint > 0 OR dmg > 0)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.calculate_component_status(INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS public.calculate_component_status(NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, BOOLEAN);

CREATE OR REPLACE FUNCTION public.calculate_component_status(
  p_total_stock NUMERIC,
  p_available_stock NUMERIC,
  p_borrowed_stock NUMERIC,
  p_maintenance_stock NUMERIC,
  p_damaged_stock NUMERIC,
  p_is_active BOOLEAN DEFAULT TRUE
)
RETURNS TEXT AS $$
BEGIN
  IF p_is_active IS FALSE THEN
    RETURN 'Tidak Tersedia';
  END IF;

  IF COALESCE(p_available_stock, 0) > 0 THEN
    IF COALESCE(p_borrowed_stock, 0) > 0 THEN
      RETURN 'Sebagian Dipinjam';
    ELSE
      RETURN 'Tersedia';
    END IF;
  ELSE
    -- Available stock == 0
    IF COALESCE(p_borrowed_stock, 0) > 0 THEN
      RETURN 'Sedang Dipinjam';
    ELSIF (COALESCE(p_maintenance_stock, 0) > 0 OR COALESCE(p_damaged_stock, 0) > 0) THEN
      RETURN 'Dalam Pemeriksaan';
    ELSE
      RETURN 'Tidak Tersedia';
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ------------------------------------------------------------------------------
-- 3. TRIGGER PADA TABEL COMPONENTS: SINKRONISASI STATUS OTOMATIS
-- Menghitung status berdasarkan sisa stok dan total peminjaman aktif saat ini
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_component_inventory_status()
RETURNS TRIGGER AS $$
DECLARE
  v_borrowed_count BIGINT := 0;
BEGIN
  -- Hitung unit yang sedang aktif dipinjam untuk komponen ini
  SELECT COALESCE(SUM(quantity), 0)
  INTO v_borrowed_count
  FROM public.borrowings
  WHERE component_id = NEW.id
    AND status = 'DIPINJAM';

  -- Jika status tidak diatur secara eksplisit ke 'Nonaktif', hitung status yang benar
  IF NEW.is_active IS FALSE THEN
    NEW.status := 'Tidak Tersedia';
  ELSE
    NEW.status := public.calculate_component_status(
      NEW.total_stock,
      NEW.stock,
      v_borrowed_count,
      NEW.maintenance_stock,
      NEW.damaged_stock,
      NEW.is_active
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_component_status ON public.components;
CREATE TRIGGER trigger_sync_component_status
  BEFORE INSERT OR UPDATE OF stock, total_stock, maintenance_stock, damaged_stock, is_active
  ON public.components
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_component_inventory_status();

-- ------------------------------------------------------------------------------
-- 4. TRIGGER PADA TABEL BORROWINGS: SINKRONISASI STATUS KOMPONEN SETELAH TRANSAKSI
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_component_status_from_borrowing()
RETURNS TRIGGER AS $$
DECLARE
  v_comp_id TEXT;
  v_comp RECORD;
  v_borrowed_count BIGINT := 0;
  v_new_status TEXT;
BEGIN
  v_comp_id := COALESCE(NEW.component_id, OLD.component_id);

  IF v_comp_id IS NOT NULL THEN
    SELECT * INTO v_comp FROM public.components WHERE id = v_comp_id;

    IF FOUND THEN
      SELECT COALESCE(SUM(quantity), 0)
      INTO v_borrowed_count
      FROM public.borrowings
      WHERE component_id = v_comp_id
        AND status = 'DIPINJAM';

      v_new_status := public.calculate_component_status(
        v_comp.total_stock,
        v_comp.stock,
        v_borrowed_count,
        v_comp.maintenance_stock,
        v_comp.damaged_stock,
        v_comp.is_active
      );

      UPDATE public.components
      SET
        status = v_new_status,
        updated_at = timezone('utc'::text, now())
      WHERE id = v_comp_id
        AND status IS DISTINCT FROM v_new_status;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_borrowing_status_change ON public.borrowings;
CREATE TRIGGER trigger_sync_borrowing_status_change
  AFTER INSERT OR UPDATE OF status, quantity OR DELETE
  ON public.borrowings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_component_status_from_borrowing();

-- ------------------------------------------------------------------------------
-- 5. PERBARUI ATOMIC RPC FUNCTION: rpc_borrow_component
-- Menghitung status baru secara tepat ('Sebagian Dipinjam' vs 'Sedang Dipinjam')
-- ------------------------------------------------------------------------------
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
  v_current_borrowed BIGINT := 0;
  v_total_borrowed BIGINT := 0;
BEGIN
  -- 0. Validasi autentikasi caller (Mencegah peminjaman anonim)
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
  IF NOT v_comp.is_active OR v_comp.status IN ('NONAKTIF', 'Nonaktif', 'Tidak Tersedia') THEN
    RAISE EXCEPTION 'Komponen ini sedang dinonaktifkan oleh administrator dan tidak dapat dipinjam.';
  END IF;

  IF v_comp.stock < p_quantity THEN
    RAISE EXCEPTION 'Stok tidak mencukupi! Tersisa % unit, diminta % unit.', v_comp.stock, p_quantity;
  END IF;

  -- 3. Hitung jumlah peminjaman aktif saat ini ditambah peminjaman baru
  SELECT COALESCE(SUM(quantity), 0) INTO v_current_borrowed
  FROM public.borrowings
  WHERE component_id = p_component_id AND status = 'DIPINJAM';

  v_total_borrowed := v_current_borrowed + p_quantity;

  -- 4. Hitung stok dan status baru yang akurat
  v_new_stock := v_comp.stock - p_quantity;
  v_new_status := public.calculate_component_status(
    v_comp.total_stock,
    v_new_stock,
    v_total_borrowed,
    v_comp.maintenance_stock,
    v_comp.damaged_stock,
    v_comp.is_active
  );

  -- 5. Potong stok komponen dan simpan status tersinkronisasi
  UPDATE public.components
  SET
    stock = v_new_stock,
    status = v_new_status,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_component_id;

  -- 6. Buat ID transaksi unik
  v_borrow_id := 'BRW-' || floor(extract(epoch from now()) * 1000)::text;

  -- 7. Insert catatan peminjaman
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
    'remaining_stock', v_new_stock,
    'status', v_new_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 6. PERBARUI ATOMIC RPC FUNCTION: rpc_return_component
-- Memulihkan stok dan menghitung status ketersediaan berdasarkan sisa pinjaman
-- ------------------------------------------------------------------------------
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

  -- 3. Ambil komponen dengan FOR UPDATE lock
  SELECT * INTO v_comp
  FROM public.components
  WHERE id = v_borrow.component_id
  FOR UPDATE;

  -- 4. Hitung distribusi stok berdasarkan kondisi pengembalian
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

  -- 5. Hitung sisa peminjaman aktif lainnya untuk komponen ini (setelah transaksi ini dikembalikan)
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

  -- 8. Format waktu pengembalian dan nomor resi
  v_return_date_str := to_char(now(), 'DD Mon YYYY - HH24:MI') || ' WIB';
  v_receipt_code := 'RT-' || to_char(now(), 'YYYY') || '-' || lpad(floor(random() * 9000 + 1000)::text, 4, '0');

  -- 9. Update transaksi peminjaman
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
    'new_stock', v_new_stock,
    'status', v_new_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 7. REKONSILIASI DATA EKSIS DI TABEL COMPONENTS
-- Perbarui status seluruh komponen yang ada sesuai kalkulasi akurat saat ini
-- ------------------------------------------------------------------------------
UPDATE public.components c
SET
  status = public.calculate_component_status(
    c.total_stock,
    c.stock,
    COALESCE((
      SELECT SUM(b.quantity)
      FROM public.borrowings b
      WHERE b.component_id = c.id
        AND b.status = 'DIPINJAM'
    ), 0)::NUMERIC,
    c.maintenance_stock,
    c.damaged_stock,
    c.is_active
  ),
  updated_at = timezone('utc'::text, now());
