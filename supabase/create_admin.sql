-- ==============================================================================
-- Script Pembuatan / Upgrade Akun Administrator Pertama (Supabase SQL Editor)
-- Langsung aktif tanpa verifikasi email dan bebas batasan rate limit
-- ==============================================================================

-- 1. Perbarui fungsi proteksi role agar tidak memblokir eksekusi SQL Editor langsung
CREATE OR REPLACE FUNCTION public.protect_profile_roles()
RETURNS TRIGGER AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Hanya terapkan proteksi jika pemanggilan berasal dari API client terautentikasi (auth.uid() tidak null)
  -- Jika dieksekusi langsung dari Supabase SQL Editor / database superuser, izinkan mutasi
  IF auth.uid() IS NOT NULL THEN
    SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();

    IF (caller_role IS DISTINCT FROM 'admin') THEN
      IF (NEW.role IS DISTINCT FROM OLD.role) OR
         (NEW.role_request_status IS DISTINCT FROM OLD.role_request_status) THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya administrator yang dapat mengubah role atau menyetujui pengajuan.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Perbaiki baris auth.users yang memiliki nilai NULL pada kolom token string
-- (Mencegah error Supabase GoTrue: "converting NULL to string is unsupported / Database error querying schema")
UPDATE auth.users
SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE email = 'superadmin.lab@un.ac.id';

-- 3. Buat atau upgrade user menjadi admin
DO $$
DECLARE
  new_admin_id UUID := gen_random_uuid();
  admin_email TEXT := 'superadmin.lab@un.ac.id';
  admin_password TEXT := 'admin12345'; -- Password untuk login
  admin_name TEXT := 'Super Admin Laboratorium';
BEGIN
  -- A. Jika akun sudah ada di auth.users sebelumnya
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = admin_email) THEN
    -- Pastikan email terkonfirmasi dan semua field string terisi
    UPDATE auth.users
    SET
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      encrypted_password = crypt(admin_password, gen_salt('bf')),
      confirmation_token = '',
      recovery_token = '',
      email_change_token_new = '',
      email_change = '',
      email_change_token_current = '',
      phone_change = '',
      phone_change_token = '',
      reauthentication_token = ''
    WHERE email = admin_email;

    -- Update profil menjadi admin
    INSERT INTO public.profiles (
      id,
      full_name,
      role,
      role_request_status,
      identity_number,
      study_program,
      faculty,
      phone,
      profile_completed
    ) VALUES (
      (SELECT id FROM auth.users WHERE email = admin_email),
      admin_name,
      'admin',
      'approved',
      '198001012005011001',
      'Pengelola Laboratorium IoT',
      'Fakultas Ilmu Komputer',
      '081234567890',
      TRUE
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'admin',
      role_request_status = 'approved',
      profile_completed = TRUE,
      full_name = admin_name;
    
    RAISE NOTICE 'Akun % yang sudah ada berhasil diperbaiki dan di-upgrade menjadi ADMIN!', admin_email;
  ELSE
    -- B. Buat akun baru di auth.users dengan semua field string terinisialisasi string kosong ('')
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      email_change_token_current,
      phone_change,
      phone_change_token,
      reauthentication_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_admin_id,
      'authenticated',
      'authenticated',
      admin_email,
      crypt(admin_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', admin_name),
      now(),
      now(),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    );

    -- C. Masukkan data profil admin
    INSERT INTO public.profiles (
      id,
      full_name,
      role,
      requested_role,
      role_request_status,
      identity_number,
      study_program,
      faculty,
      phone,
      profile_completed
    ) VALUES (
      new_admin_id,
      admin_name,
      'admin',
      NULL,
      'approved',
      '198001012005011001',
      'Pengelola Laboratorium IoT',
      'Fakultas Ilmu Komputer',
      '081234567890',
      TRUE
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'admin',
      role_request_status = 'approved',
      profile_completed = TRUE;

    RAISE NOTICE 'Akun admin % berhasil dibuat! Login dengan password: %', admin_email, admin_password;
  END IF;

  -- 4. Pastikan identitas terdaftar di auth.identities agar login GoTrue berjalan normal
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  SELECT
    u.id,
    u.id,
    u.id::text,
    jsonb_build_object(
      'sub', u.id::text,
      'email', u.email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  FROM auth.users u
  WHERE u.email = admin_email
    AND NOT EXISTS (
      SELECT 1 FROM auth.identities i
      WHERE i.user_id = u.id AND i.provider = 'email'
    );

END $$;
