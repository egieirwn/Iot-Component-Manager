-- ==============================================================================
-- MIGRATION: WhatsApp Overdue Borrowing Notifications & Preference Schema
-- Project: IoT Component Manager
-- Purpose: Support overdue deadline tracking, WhatsApp notifications,
--          explicit consent, international phone formatting, and delivery logs.
-- ==============================================================================

-- 1. Tambah kolom preferensi WhatsApp di tabel profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_notification_opt_in BOOLEAN NOT NULL DEFAULT TRUE;

-- Sinkronkan phone jika kolom phone sudah ada di profiles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    UPDATE public.profiles
    SET phone_number = phone
    WHERE phone_number IS NULL AND phone IS NOT NULL;
  END IF;
END $$;

-- 2. Tambah kolom due_at dan tracking notifikasi di tabel borrowings
ALTER TABLE public.borrowings
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS overdue_notified_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS overdue_notification_status TEXT DEFAULT NULL;

-- Backfill due_at dari due_date jika due_at masih NULL
UPDATE public.borrowings
SET due_at = timezone('utc'::text, now() + interval '7 days')
WHERE due_at IS NULL AND status = 'DIPINJAM';

-- 3. Tabel log riwayat pengiriman notifikasi
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrowing_id TEXT REFERENCES public.borrowings(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  provider TEXT NOT NULL DEFAULT 'whatsapp_business',
  template_name TEXT DEFAULT 'overdue_borrowing_reminder',
  status TEXT NOT NULL, -- 'SENT' | 'FAILED' | 'SIMULATED' | 'SKIPPED'
  error_message TEXT,
  response_payload JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Indexes untuk query efisien
CREATE INDEX IF NOT EXISTS idx_borrowings_due_at ON public.borrowings(due_at);
CREATE INDEX IF NOT EXISTS idx_borrowings_overdue_notified_at ON public.borrowings(overdue_notified_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_borrowing_id ON public.notification_logs(borrowing_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON public.notification_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_profiles_whatsapp_opt_in ON public.profiles(whatsapp_notification_opt_in);

-- 5. Row Level Security (RLS)
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access to notification logs" ON public.notification_logs;
CREATE POLICY "Admins full access to notification logs"
  ON public.notification_logs
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users view own notification logs" ON public.notification_logs;
CREATE POLICY "Users view own notification logs"
  ON public.notification_logs
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.borrowings b
        WHERE b.id = notification_logs.borrowing_id AND b.user_id = auth.uid()
      )
    )
  );

-- 6. Helper RPC: Mengambil daftar peminjaman terlambat yang memenuhi syarat notifikasi
CREATE OR REPLACE FUNCTION public.get_overdue_borrowings_for_notification()
RETURNS TABLE (
  borrowing_id TEXT,
  component_id TEXT,
  component_name TEXT,
  user_id UUID,
  borrower_name TEXT,
  borrower_email TEXT,
  phone_number TEXT,
  whatsapp_opt_in BOOLEAN,
  due_at TIMESTAMPTZ,
  days_overdue INTEGER,
  pickup_lab TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id AS borrowing_id,
    b.component_id,
    b.component_name,
    b.user_id,
    COALESCE(p.full_name, b.borrower_name) AS borrower_name,
    b.borrower_email AS borrower_email,
    COALESCE(p.phone_number, p.phone) AS phone_number,
    COALESCE(p.whatsapp_notification_opt_in, TRUE) AS whatsapp_opt_in,
    b.due_at,
    GREATEST(1, EXTRACT(DAY FROM (now() - b.due_at))::INTEGER) AS days_overdue,
    COALESCE(b.pickup_lab, 'Laboratorium IoT') AS pickup_lab
  FROM public.borrowings b
  LEFT JOIN public.profiles p ON b.user_id = p.id
  WHERE b.status = 'DIPINJAM'
    AND b.due_at IS NOT NULL
    AND b.due_at < now()
    AND b.overdue_notified_at IS NULL; -- Mencegah notifikasi berulang untuk event jatuh tempo yang sama
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Helper RPC: Mencatat log notifikasi dan memperbarui status peminjaman
CREATE OR REPLACE FUNCTION public.record_overdue_notification_result(
  p_borrowing_id TEXT,
  p_recipient_phone TEXT,
  p_recipient_name TEXT,
  p_status TEXT, -- 'SENT' | 'FAILED' | 'SIMULATED' | 'SKIPPED'
  p_error_message TEXT DEFAULT NULL,
  p_response_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Insert ke notification_logs
  INSERT INTO public.notification_logs (
    borrowing_id,
    recipient_phone,
    recipient_name,
    provider,
    status,
    error_message,
    response_payload,
    sent_at
  ) VALUES (
    p_borrowing_id,
    p_recipient_phone,
    p_recipient_name,
    'whatsapp_business',
    p_status,
    p_error_message,
    p_response_payload,
    timezone('utc'::text, now())
  ) RETURNING id INTO v_log_id;

  -- Update borrowings: tandai telah dikirimi notifikasi jika SENT atau SIMULATED
  IF p_status IN ('SENT', 'SIMULATED') THEN
    UPDATE public.borrowings
    SET
      overdue_notified_at = timezone('utc'::text, now()),
      overdue_notification_status = p_status,
      updated_at = timezone('utc'::text, now())
    WHERE id = p_borrowing_id;
  ELSIF p_status LIKE 'SKIPPED%' THEN
    UPDATE public.borrowings
    SET
      overdue_notification_status = p_status,
      updated_at = timezone('utc'::text, now())
    WHERE id = p_borrowing_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'log_id', v_log_id,
    'borrowing_id', p_borrowing_id,
    'status', p_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
