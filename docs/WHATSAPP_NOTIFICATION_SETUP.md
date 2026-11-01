# Panduan Konfigurasi WhatsApp Overdue Notifications
**Project:** IoT Component Manager  
**Feature:** Notifikasi Pengingat Keterlambatan Pengembalian via WhatsApp Business Platform

---

## 1. Status Kesiapan Sistem

Sistem backend, database schema, aturan bisnis, validasi nomor internasional E.164, pencegahan notifikasi duplikat, dan Supabase Edge Function telah diimplementasikan sepenuhnya.

> [!NOTE]
> **Status Integrasi Live:** *Unconfigured / Simulation Mode*  
> Karena kredensial live Meta WhatsApp Business API belum dimasukkan ke Supabase Secrets, sistem saat ini beroperasi dalam mode aman (*Safe Simulation Mode*). Dalam mode ini, verifikasi kelayakan dan pencatatan log di database berjalan 100%, tanpa mengirim pesan langsung ke nomor HP fisik.

---

## 2. Kebutuhan Kredensial Meta WhatsApp Cloud API

Untuk mengaktifkan pengiriman pesan WhatsApp secara nyata ke nomor mahasiswa/dosen, siapkan komponen berikut dari [Meta for Developers](https://developers.facebook.com/):

1. **Meta Business Account & WhatsApp Business App:**
   - Buat aplikasi bertipe **Business** di Meta Developer Console.
   - Tambahkan produk **WhatsApp**.
2. **Phone Number ID:**
   - Dapatkan dari dashboard WhatsApp > API Setup (contoh: `109283746501928`).
3. **System User Permanent Access Token:**
   - Buat System User di Meta Business Manager dengan permission `whatsapp_business_messaging` dan `whatsapp_business_management`.
   - Generate token permanen (*Permanent Access Token*).
4. **Template Pesan WhatsApp Resmi (Approved Template):**
   - Nama template: `overdue_borrowing_reminder`
   - Kategori: `UTILITY`
   - Bahasa: `id` (Indonesia)
   - Isi Pesan Body:
     ```text
     Halo {{1}}, pengingat dari Laboratorium Kampus IoT: Peminjaman komponen {{2}} Anda telah melewati batas waktu pengembalian sebanyak {{3}} hari. Mohon segera mengembalikan komponen ke {{4}}. Terima kasih.
     ```
   - Variabel:
     - `{{1}}`: Nama Mahasiswa/Peminjam
     - `{{2}}`: Nama Komponen IoT
     - `{{3}}`: Jumlah hari keterlambatan
     - `{{4}}`: Lokasi Laboratorium Pengembalian

---

## 3. Cara Memasang Kredensial ke Supabase Secrets

Jalankan perintah berikut menggunakan Supabase CLI pada terminal proyek Anda:

```bash
# Simpan Permanent Access Token
supabase secrets set WHATSAPP_API_TOKEN="EAAxxxxxxx..."

# Simpan ID Nomor Telepon WhatsApp Pengirim
supabase secrets set WHATSAPP_PHONE_NUMBER_ID="109283746501928"

# Simpan Nama Template (Opsional jika menggunakan default)
supabase secrets set WHATSAPP_TEMPLATE_NAME="overdue_borrowing_reminder"
```

Kredensial ini tersimpan secara aman di server Supabase Edge Runtime dan **TIDAK PERNAH** terekspos ke kode frontend React/Vite.

---

## 4. Deploy Supabase Edge Function

Jalankan perintah deploy untuk mempublikasikan Edge Function ke proyek Supabase Anda:

```bash
supabase functions deploy send-overdue-whatsapp --no-verify-jwt
```

---

## 5. Menjadwalkan Otomasi Cron Harian (Supabase pg_cron)

Agar sistem secara otomatis memeriksa keterlambatan setiap hari (misalnya pukul 09:00 WIB / 02:00 UTC), jalankan query berikut di **Supabase SQL Editor**:

```sql
-- Aktifkan ekstensi pg_net dan pg_cron jika belum aktif
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Jadwalkan cron job setiap hari pukul 02:00 UTC (09:00 WIB)
SELECT cron.schedule(
  'dispatch-overdue-whatsapp-reminders',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xoaqhfrmxmvwqduzgjvu.supabase.co/functions/v1/send-overdue-whatsapp',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

## 6. Verifikasi & Pengujian

- **Format Nomor Telepon:** Otomatis dikonversi ke format internasional E.164 (`0812...` -> `+62812...`).
- **Consent (Persetujuan):** Pengguna dapat mengaktifkan/menonaktifkan di halaman **Profil Akun**. Pengguna yang menonaktifkan tidak akan pernah dikirimi pesan (`SKIPPED_NO_CONSENT`).
- **Pencegahan Spam:** Kolom `overdue_notified_at` memastikan bahwa setiap event keterlambatan hanya memicu **1 kali pengingat**.
- **Log Pengiriman:** Seluruh riwayat pengiriman dan respons tersimpan rapi di tabel `public.notification_logs`.
