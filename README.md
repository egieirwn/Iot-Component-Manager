# Campus IoT - Sistem Inventaris & Peminjaman Komponen Laboratorium

> **Integrasi Database PostgreSQL, Supabase Auth, Role-Based Access Control (RBAC) & Profil Pengguna**  
> Mengembangkan sistem inventaris laboratorium IoT dari penyimpanan lokal (*localStorage/mock*) menjadi aplikasi berskala produksi yang terintegrasi langsung dengan **Supabase PostgreSQL** dan **Supabase Auth**.

Aplikasi web modern berbasis **React 19 + Vite + Supabase** untuk manajemen inventaris perangkat keras IoT, modul mikrokontroler, sensor cerdas, serta sistem permohonan peminjaman dan pengembalian laboratorium kampus secara terintegrasi dan aman.

---

## 🏛️ Arsitektur & Mengapa Memilih Supabase?

Supabase dipilih sebagai backend platform karena menyediakan fondasi PostgreSQL berskala industri dengan fitur keamanan bawaan tingkat lanjut:

1. **PostgreSQL Relasional Terstruktur:** Memungkinkan relasi data yang kuat antara akun terautentikasi (`auth.users`), profil kampus (`profiles`), katalog inventaris (`components`), dan transaksi peminjaman (`borrowings`).
2. **Supabase Auth Bawaan:** Pengelolaan registrasi email kampus, verifikasi tautan email (*email confirmation*), alur reset kata sandi (*password recovery flow*), dan sesi JWT aman tanpa perlu membuat server autentikasi terpisah.
3. **Row Level Security (RLS):** Kebijakan otorisasi ditegakkan langsung di level database (*database-level access control*), bukan sekadar menyembunyikan tombol di frontend. Mahasiswa hanya dapat melihat dan memanipulasi peminjamannya sendiri.
4. **Transaksi Atomic & Anti Race-Condition (Stored Procedures / RPC):** Fungsi PostgreSQL `SECURITY DEFINER` dengan penguncian baris (`FOR UPDATE`) menjamin stok komponen tidak pernah bernilai negatif meskipun terjadi permintaan pinjam simultan, serta mencegah pengembalian ganda (*double return*).
5. **Ketahanan Offline / Fallback Transparan:** Service layer aplikasi dilengkapi fallback ke *localStorage/cache* lokal jika kredensial Supabase belum dimasukkan atau terjadi gangguan jaringan sementara, sehingga proses pengembangan dan pratinjau tidak pernah mengalami *crash*.

---

## 🗄️ Skema Database & Relasi Entitas

Skema lengkap siap dieksekusi di Supabase SQL Editor berada pada berkas:  
[`supabase/schema.sql`](file:///d:/Coding/Iot-Component-Manager/supabase/schema.sql)

```
       +---------------------------------------------+
       |                 auth.users                  |
       |  (Dikelola secara otomatis oleh Supabase)   |
       +---------------------------------------------+
                              |
                     1 to 1 (id = id)
                              v
       +---------------------------------------------+
       |               public.profiles               |
       |---------------------------------------------|
       | id (UUID, PK) -> references auth.users(id)  |
       | full_name (TEXT)                            |
       | role ('mahasiswa' | 'dosen' | 'admin')      |
       | requested_role (TEXT, misal: 'dosen')       |
       | role_request_status ('none'|'pending'|...)  |
       | identity_number (TEXT, NIM / NIP)           |
       | study_program (TEXT, Jurusan/Prodi)         |
       | faculty (TEXT, Fakultas/Unit)               |
       | phone (TEXT, Kontak WhatsApp)               |
       | profile_completed (BOOLEAN)                 |
       | created_at, updated_at (TIMESTAMPTZ)        |
       +---------------------------------------------+
               |                             |
               | 1 to Many                   |
               v                             |
+------------------------------------+       |
|         public.borrowings          |       |
|------------------------------------|       |
| id (TEXT, PK, 'BRW-...')           |       |
| user_id (UUID, FK -> profiles.id)  |       |
| component_id (TEXT, FK -> comps.id)|       |
| component_name, component_code     |       |
| quantity (INTEGER, > 0)            |       |
| borrow_date, due_date (TEXT)       |       |
| duration_days, remaining_days      |       |
| pickup_lab (TEXT)                  |       |
| purpose, notes (TEXT)              |       |
| status ('DIPINJAM'|'DIKEMBALIKAN') |       |
| return_date, return_condition      |       |
| return_notes, checklist (JSONB)    |       |
| receipt_code (TEXT, 'RT-2026-...') |       |
+------------------------------------+       |
               ^                             |
               | references component_id     |
+------------------------------------+       |
|         public.components          |       |
|------------------------------------|       |
| id (TEXT, PK, 'arduino-uno-r3')    |<------+
| code (TEXT, UNIQUE, 'MCU-00182')   |
| name, category, condition, status  |
| stock, maintenance_stock, damaged  |
| total_stock (INTEGER)              |
| image, description, tags (TEXT[])  |
| location, specs, borrower_info     |
+------------------------------------+
```

---

## 🛡️ Kebijakan Hak Akses & Row Level Security (RLS)

Aplikasi memiliki tiga tingkatan peran (*RBAC*):
1. **Mahasiswa (`mahasiswa`):**
   - Peran default otomatis untuk setiap pendaftar baru.
   - Dapat melihat seluruh katalog komponen dan stok yang tersedia.
   - Hanya dapat melihat, meminjam, dan mengembalikan transaksi atas nama dirinya sendiri (`user_id = auth.uid()`).
   - Tidak dapat mengubah peran dirinya sendiri, menyetujui pengajuan dosen, atau memodifikasi stok secara langsung.
2. **Dosen / Peneliti (`dosen`):**
   - Saat mendaftar dengan memilih tipe dosen, akun akan berstatus `role = 'mahasiswa'`, `requested_role = 'dosen'`, dan `role_request_status = 'pending'`.
   - Membutuhkan persetujuan administrator sebelum hak akses dosen diaktifkan.
   - Setelah disetujui, dosen dapat memantau seluruh transaksi peminjaman laboratorium mahasiswa bimbingan.
3. **Administrator (`admin`):**
   - Tidak dapat didaftarkan secara publik melalui form registrasi biasa.
   - Memiliki kendali penuh: menambah/mengedit komponen, mengelola stok maintenance/rusak, meninjau permohonan peran dosen, dan mengaudit seluruh transaksi.

### Ringkasan RLS Policy & Proteksi Integritas:
- **`profiles`:**
  - `SELECT`: Diizinkan untuk pengguna terautentikasi (untuk menampilkan nama peminjam/anggota lab).
  - `INSERT`: Pengguna dapat menyisipkan profil awal miliknya sendiri dibatasi role `mahasiswa`.
  - `UPDATE`: Hanya pemilik profil (`auth.uid() = id`) atau Administrator. Trigger `protect_profile_roles()` menolak upaya pengguna biasa mengubah kolom `role`, memanipulasi kolom audit review, atau menyetujui (`approved`) permohonannya sendiri.
  - `RPC Review & Resubmit`: Administrator meninjau via `rpc_review_role_request`, dan pemohon mengajukan ulang via `rpc_resubmit_role_request`.
- **`components`:**
  - `SELECT`: Pengguna biasa hanya dapat melihat komponen aktif (`is_active = TRUE`), sementara Administrator dapat melihat seluruh komponen aktif maupun nonaktif (`is_active = TRUE OR public.is_admin()`).
  - `INSERT/UPDATE/DELETE`: Hanya akun dengan peran `admin`. Mutasi stok oleh mahasiswa dilakukan secara eksklusif melalui transaksi atomik RPC `rpc_borrow_component` dan `rpc_return_component`.
  - `Proteksi Hard Delete`: Trigger `prevent_component_hard_delete()` memblokir penghapusan permanen jika komponen pernah dicatat dalam transaksi `borrowings`. Admin diarahkan menggunakan fitur *Soft Delete / Nonaktifkan* via `rpc_toggle_component_active`.
- **`borrowings`:**
  - `SELECT`: Pengguna hanya melihat data miliknya (`user_id = auth.uid()`), sementara Dosen dan Admin dapat melihat seluruh data.
  - `INSERT`: Hanya diizinkan untuk peminjaman atas nama pengguna itu sendiri (`user_id = auth.uid()`).
  - `UPDATE`: Pengguna dapat memperbarui catatan pengembalian miliknya sendiri.
  - `DELETE`: **Dilarang total**. Tidak disediakan policy `DELETE` pada tabel `borrowings` guna menjaga integritas riwayat pengembalian dan log audit inventaris kampus.

---

## ⚙️ Panduan Setup Supabase & Konfigurasi Lingkungan

### 1. Buat Proyek di Supabase
1. Daftar atau masuk ke [supabase.com](https://supabase.com/).
2. Buat proyek baru (*New Project*), tentukan nama (misal: `campus-iot-manager`) dan password database.
3. Tunggu hingga proses provisi database selesai (~1-2 menit).

### 2. Eksekusi Skema Database
1. Buka menu **SQL Editor** pada dashboard Supabase Anda.
2. Salin seluruh isi berkas [`supabase/schema.sql`](file:///d:/Coding/Iot-Component-Manager/supabase/schema.sql) dari repositori ini.
3. Tempel pada SQL Editor dan klik tombol **Run**.
4. Seluruh tabel (`profiles`, `components`, `borrowings`), indeks, trigger otomatis, RLS policies, RPC functions (`rpc_borrow_component`, `rpc_return_component`, `rpc_review_role_request`, `rpc_resubmit_role_request`, `rpc_toggle_component_active`), serta data awal 5 komponen IoT akan dibuat secara otomatis.

> [!TIP]
> **Pembaruan Skema Fase 2 (Area A & Area B):** Jika database Supabase sudah pernah dibuat sebelumnya, cukup jalankan skrip migrasi idempotent [`supabase/migration_audit_phase2.sql`](file:///d:/Coding/Iot-Component-Manager/supabase/migration_audit_phase2.sql) di Supabase SQL Editor untuk memperbarui kolom `is_active`, trigger proteksi hard delete, kolom audit verifikasi role dosen, dan fungsi RPC terkait.

### 3. Konfigurasi Autentikasi Supabase
1. Buka menu **Authentication** -> **URL Configuration**.
2. Atur **Site URL**:
   - Pengembangan lokal: `http://localhost:3000`
   - Produksi (misal Vercel): `https://nama-proyek.vercel.app`
3. Tambahkan ke daftar **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/reset-password`
   - `https://nama-proyek.vercel.app/auth/callback` (saat dideploy)
   - `https://nama-proyek.vercel.app/reset-password` (saat dideploy)

### 4. Konfigurasi Variabel Lingkungan Lokal (`.env.local`)
1. Salin berkas template `.env.example` menjadi `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Buka menu **Project Settings** -> **API** di Supabase.
3. Salin **Project URL** dan **anon public key**, lalu masukkan ke `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   > ⚠️ **PERHATIAN KEAMANAN:** Jangan pernah memasukkan `service_role key` atau password database ke dalam berkas frontend atau repositori git! Berkas `.env.local` telah diabaikan secara otomatis di `.gitignore`.

### 5. Cara Membuat Akun Administrator Pertama
Akun publik tidak pernah mendapatkan peran administrator secara otomatis. Untuk mengangkat akun menjadi admin:
1. Daftarkan akun melalui form registrasi `/register` (misal: `admin.lab@un.ac.id`).
2. Konfirmasikan email akun tersebut.
3. Buka **SQL Editor** di Supabase, lalu jalankan query:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE id IN (
     SELECT id FROM auth.users WHERE email = 'admin.lab@un.ac.id'
   );
   ```
4. Akun tersebut kini memiliki hak akses penuh sebagai Administrator Lab.

---

## 💻 Menjalankan Aplikasi Secara Lokal

```bash
# 1. Pasang dependensi
npm install

# 2. Jalankan development server
npm run dev
```
Buka peramban di: **`http://localhost:3000`**

### Uji Build Produksi
```bash
npm run build
```
Build terkompilasi bersih tanpa error (`dist/` terbuat dengan ukuran teroptimasi).

---

## 🧪 Skenario Pengujian Fitur Lengkap

### 1. Registrasi Akun & Pilihan Peran (`/register`)
- Akses `/register`. Masukkan nama lengkap, email `@un.ac.id`, kata sandi, dan konfirmasi.
- Pilih opsi peran **Mahasiswa** atau **Dosen / Peneliti**.
- Validasi form mencegah input kosong, spasi berlebih (`.trim()`), format email salah, atau kata sandi di bawah 8 karakter.
- Klik **Daftar**: Akun dibuat di Supabase Auth, trigger otomatis membuat entri profil, dan pengguna diarahkan ke `/verify-email`.

### 2. Verifikasi Email & Resend (`/verify-email`)
- Menampilkan petunjuk konfirmasi kotak masuk.
- Terdapat tombol **Kirim ulang email** jika email belum masuk.
- Tombol **Saya sudah klik link verifikasi** memeriksa status konfirmasi dan mengarahkan ke langkah pengisian profil.

### 3. Pengisian Profil Wajib (`/complete-profile`)
- Pengguna yang baru memverifikasi email otomatis diarahkan ke `/complete-profile`.
- Bidang disesuaikan dengan peran:
  - **Mahasiswa:** Nama Lengkap, NIM, Program Studi, Fakultas, Nomor Telepon / WA.
  - **Dosen:** Nama Lengkap, NIP, Departemen / Unit, Fakultas, Nomor Telepon / WA.
- Profil disimpan dengan `profile_completed = true`. Pengguna tidak dapat mengakses Dashboard sebelum profil ini lengkap (dilindungi oleh `ProtectedRoute`).

### 4. Dashboard & Greeting Dinamis Sesuai Waktu Lokal
- Menampilkan sapaan dinamis berdasarkan jam lokal perangkat:
  - `05:00 - 10:59`: "Selamat pagi, [Nama]!"
  - `11:00 - 14:59`: "Selamat siang, [Nama]!"
  - `15:00 - 18:59`: "Selamat sore, [Nama]!"
  - `19:00 - 04:59`: "Selamat malam, [Nama]!"
- Menampilkan nama depan dari profil terautentikasi dan ringkasan statistik inventaris database.

### 5. Navbar & Profil Pengguna (`/profile`)
- Topbar menampilkan inisial avatar dinamis (contoh: **AT** untuk Akira Tomoe), NIM, dan Program Studi.
- Mengklik avatar membuka menu dropdown: **Profil Saya** dan **Keluar (Logout)**.
- Halaman `/profile` menampilkan rincian data lengkap, badge peran, serta mode **Edit Profil** untuk memperbarui nomor telepon, jurusan, dan fakultas secara langsung tanpa reload halaman.
- Fitur **Ubah Email** terpisah mengirimkan tautan konfirmasi Supabase Auth ke email baru sebelum diterapkan.

### 6. Alur Peminjaman Komponen (Stok Berkurang Real-Time)
- Di katalog komponen (`/components`), pilih komponen yang tersedia lalu klik **Pinjam Komponen**.
- Data peminjam (Nama dan NIM) otomatis terisi dari profil aktif.
- Masukkan kuantitas dan tanggal pengembalian, lalu setujui tata tertib laboratorium.
- Setelah konfirmasi berhasil, stok di database otomatis berkurang, status beralih jika stok habis, dan transaksi tercatat di tabel peminjaman.

### 7. Alur Pengembalian Komponen 2-Kolom & Resi Bukti Pengembalian
- Buka **Peminjaman Saya** (`/borrowings`), klik tombol **Kembalikan** pada peminjaman aktif.
- Menampilkan tampilan formulir 2-kolom:
  - **Kiri:** Ringkasan item peminjaman terpilih, kode transaksi, dan lokasi pengambilan lab.
  - **Kanan:** 5 checklist kondisi perangkat (kemampuan baca sensor, fisik, kelengkapan jumper, resistor pull-up, label aset), pilihan toggle kondisi (**Berfungsi** / **Rusak**), dan catatan pengembalian.
- Klik **Kembalikan komponen**: sistem memproses mutasi stok di database dan menampilkan **Halaman Resi Pengembalian** (*"Pengembalian berhasil"*, kode resi `RT-2026-XXXX`, status `TERSEDIA`, tabel rincian penyerahan, dan notifikasi email bukti pengembalian).
- Transaksi berpindah ke tab **Riwayat Pengembalian** dan **tidak pernah dihapus**.

### 8. Lupa & Reset Kata Sandi (`/forgot-password` & `/reset-password`)
- Di `/forgot-password`, masukkan email kampus terdaftar. Sistem mengirim email pemulihan tanpa mengekspos apakah email terdaftar atau tidak (*protection against account enumeration*).
- Tautan pemulihan mengarahkan pengguna ke `/auth/callback?type=recovery` dan diteruskan ke `/reset-password`.
- Pengguna memasukkan kata sandi baru (minimal 8 karakter) dan menyimpannya ke Supabase Auth.

---

## 🌿 Informasi Git & Branching

- **`feat/dynamic-data`**: Branch aktif pengerjaan integrasi Supabase Database, Auth, Role, dan Profil Pengguna.
- **`migration-react-vite`**: Branch migrasi arsitektur React + Vite dari Modul 7.
- **`main`**: Branch baseline awal HTML statis.
