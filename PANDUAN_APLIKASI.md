# 📘 Dokumentasi & Panduan Penggunaan Sistem Campus IoT

Dokumen ini berisi penjelasan lengkap mengenai arsitektur teknologi, bahasa pemrograman, backend yang digunakan, serta panduan langkah demi langkah penggunaan website **Campus IoT - Sistem Inventaris & Peminjaman Laboratorium**.

---

## 🛠️ 1. Teknologi & Bahasa Pemrograman yang Digunakan

Aplikasi ini dibangun menggunakan arsitektur modern berbasis **Single Page Application (SPA)** pada sisi frontend dan **Backend-as-a-Service (BaaS)** berbasis cloud pada sisi backend.

### A. Bahasa Pemrograman
1. **JavaScript (ES6+)**: Bahasa utama untuk logika aplikasi di sisi klien, manajemen state antarmuka, komunikasi API asinkron (*async/await*), dan penanganan rute dinamis.
2. **HTML5 & JSX (JavaScript XML)**: Digunakan untuk merancang struktur antarmuka komponen yang reaktif dan semantik.
3. **CSS3 (Custom Vanilla Design System)**: Seluruh tampilan dibangun dengan CSS murni menggunakan sistem variabel CSS (*Design Tokens*), tata letak Flexbox/Grid, responsif untuk semua ukuran layar (Desktop, Tablet, HP), tanpa ketergantungan library CSS berat pihak ketiga.
4. **SQL (PostgreSQL & PL/pgSQL)**: Bahasa query dan pemrograman database di sisi backend untuk mengelola skema relasional, fungsi transaksi tersimpan (*Stored Procedures / RPC*), *trigger*, dan aturan keamanan baris (*Row Level Security / RLS*).

---

### B. Framework & Library Frontend
* **React 19**: Pustaka JavaScript deklaratif berbasis komponen untuk mengelola status antarmuka pengguna secara efisien.
* **Vite 6**: Alat *build tool* dan server pengembangan berkecepatan tinggi dengan fitur *Hot Module Replacement (HMR)* dan bundler Rollup teroptimasi.
* **React Router v7 (`react-router-dom`)**: Pengelola navigasi multi-halaman sisi klien (*client-side routing*) tanpa memuat ulang (*reload*) halaman peramban.
* **Lucide React**: Kumpulan ikon vektor modern yang ringan dan konsisten di seluruh antarmuka.

---

### C. Backend Platform: Supabase (PostgreSQL Cloud)
Sebagai pengganti server backend konvensional (seperti Express/Laravel), aplikasi ini memanfaatkan **Supabase** yang terhubung langsung melalui Supabase JavaScript SDK:

1. **Database Relasional (PostgreSQL):**
   * Menyimpan data profil pengguna, master katalog komponen IoT, spesifikasi teknis, jumlah stok fisik, dan transaksi peminjaman.
2. **Supabase Authentication:**
   * Menangani sistem login, registrasi akun, verifikasi tautan email (*Email Confirmation*), sesi login berbasis JSON Web Token (JWT), dan pemulihan kata sandi (*Password Recovery*).
3. **Database Functions & RPC (Remote Procedure Calls):**
   * Menggunakan fungsi PL/pgSQL atomik dengan penguncian baris (`FOR UPDATE`) untuk memproses peminjaman dan pengembalian komponen. Ini mencegah masalah *race condition* (stok tidak akan minus meski dipinjam bersamaan) dan mencegah klaim pengembalian ganda (*double return*).
4. **Row Level Security (RLS):**
   * Kebijakan keamanan otorisasi ditegakkan langsung di level database. Mahasiswa hanya dapat membaca dan memodifikasi data peminjamannya sendiri, sedangkan Admin memiliki hak akses penuh.
5. **Supabase Storage:**
   * Wadah penyimpanan berkas (*cloud object storage*) berbasis CDN untuk menyimpan foto asli komponen IoT secara terpusat.

---

### D. Infrastruktur Hosting & Analitik
* **Cloudflare Pages:** Hosting web live global dengan jaringan CDN Edge berkecepatan tinggi, dilengkapi konfigurasi fallback SPA (`200.html`).
* **Microsoft Clarity:** Pelacak analitik gratis tingkat lanjut untuk memantau rekaman sesi interaksi pengguna (*session recordings*), peta panas (*heatmaps*), dan mendeteksi kendala navigasi (*dead/rage clicks*).

---

## 👥 2. Hak Akses & Peran Pengguna (User Roles)

Sistem menerapkan **Role-Based Access Control (RBAC)** dengan 3 tingkatan peran:
1. **Mahasiswa (Student):** Peran bawaan saat pertama kali mendaftar. Dapat menjelajahi katalog komponen, melihat ketersediaan stok, mengajukan peminjaman, serta memantau status peminjaman milik sendiri.
2. **Dosen / Peneliti (Lecturer / Researcher):** Memiliki hak peminjaman untuk kebutuhan pengajaran, modul praktikum, atau proyek penelitian laboratorium.
3. **Administrator (Lab Manager):** Pengelola laboratorium dengan hak akses tertinggi. Mengelola katalog komponen (tambah, edit, stok rusak/maintenance, arsip), memverifikasi pengembalian fisik, dan menyetujui pengajuan peran Dosen.

---

## 📖 3. Panduan Penggunaan Website (User Guide)

### A. Alur Autentikasi & Akun

1. **Pendaftaran Akun Baru (Register):**
   * Buka menu **Daftar Akun**.
   * Masukkan Nama Lengkap, Email kampus, dan Kata Sandi (minimal 6 karakter).
   * Buka kotak masuk email Anda dan klik tautan konfirmasi dari Supabase.
2. **Masuk ke Sistem (Login):**
   * Masukkan email dan kata sandi yang telah terverifikasi.
3. **Melengkapi Profil Pengguna:**
   * Saat pertama kali masuk, Anda akan diarahkan untuk melengkapi data akademik:
     * Nomor Induk (NIM untuk Mahasiswa / NIP untuk Dosen).
     * Program Studi / Jurusan.
     * Fakultas / Unit.
     * Nomor Telepon / WhatsApp aktif (untuk keperluan konfirmasi pengambilan komponen).
4. **Pengajuan Peran Dosen (Bagi Dosen):**
   * Pada halaman **Profil**, terdapat opsi pengajuan verifikasi peran Dosen dengan mengisi NIP resmi. Pengajuan ini akan ditinjau oleh Administrator Lab.

---

### B. Alur Peminjaman Komponen (Untuk Mahasiswa / Dosen)

1. **Mencari Komponen:**
   * Masuk ke menu **Katalog Komponen** di bilah navigasi samping (*Sidebar*).
   * Gunakan kolom pencarian untuk mengetik nama komponen (misal: *ESP32, Sensor Suhu, Arduino*).
   * Manfaatkan tombol filter kategori: **Semua**, **Mikrokontroler**, **Sensor**, **Modul**, atau **Aksesoris**.
2. **Melihat Detail & Spesifikasi:**
   * Klik kartu komponen untuk membuka halaman rincian.
   * Anda dapat memeriksa spesifikasi teknis (prosesor, koneksi antarmuka, kelengkapan), lokasi rak penyimpanan di laboratorium, dan sisa stok fisik yang tersedia.
3. **Mengajukan Peminjaman:**
   * Klik tombol **Pinjam Komponen** pada komponen yang berstatus **TERSEDIA**.
   * Lengkapi formulir peminjaman:
     * **Jumlah Unit**: Tentukan kuantitas yang dibutuhkan (tidak boleh melebihi stok yang tersedia).
     * **Durasi Peminjaman**: Pilih durasi waktu pinjam (misal: 3 hari, 7 hari, atau 14 hari).
     * **Tanggal Pengambilan**: Tentukan kapan komponen akan diambil di lab.
     * **Keperluan**: Tuliskan tujuan penggunaan (misal: *Tugas Akhir IoT Sistem Smart Garden, Praktikum Jaringan Nirkabel*).
     * **Lokasi Pengambilan**: Pilih ruangan lab yang ditunjuk (default: *Lab Sistem Tertanam*).
   * Klik **Lanjutkan ke Konfirmasi**, periksa kembali rincian, lalu klik **Konfirmasi Peminjaman**.
4. **Menerima Bukti Peminjaman:**
   * Sistem akan menerbitkan **Kode Bukti Peminjaman** unik (contoh: `BRW-202611-0012`).
   * Tunjukkan kode ini atau sebutkan identitas Anda kepada teknisi/admin laboratorium saat mengambil barang fisik di lab.
5. **Memantau Status di "Peminjaman Saya":**
   * Masuk ke menu **Peminjaman Saya** untuk memantau status peminjaman aktif, tanggal batas waktu (*due date*), dan sisa hari sebelum jatuh tempo.

---

### C. Alur Pengelolaan Laboratorium (Khusus Administrator)

Menu Administrator hanya dapat diakses oleh akun yang memiliki role `admin`.

1. **Melihat Statistik Laboratorium (Dashboard):**
   * Memantau ringkasan total aset komponen, jumlah unit yang sedang dipinjam mahasiswa, komponen dalam masa pemeliharaan (*maintenance*), dan stok yang rusak.
2. **Manajemen Katalog Komponen (`/admin/inventory`):**
   * **Menambah Komponen Baru:**
     * Klik tombol **+ Tambah Komponen**.
     * Isi Kode Komponen (misal: `MCU-00215`), Nama, Kategori, Kondisi Fisik, Stok Tersedia, Stok Maintenance, Stok Rusak, dan Lokasi Rak.
     * Tentukan URL atau file foto komponen untuk katalog visual.
     * Klik **Tambahkan ke Inventaris**.
   * **Mengubah Data & Stok Komponen:**
     * Klik ikon **Edit** pada baris komponen untuk memperbarui rincian, memperbaiki stok fisik, atau memperbarui lokasi penyimpanan.
   * **Mengarsipkan / Nonaktifkan Komponen:**
     * Tombol *toggle* aktif/nonaktif memungkinkan admin menyembunyikan komponen yang sedang tidak boleh dipinjam tanpa menghapus data historisnya.
3. **Memproses Pengembalian Komponen:**
   * Saat peminjam mengembalikan perangkat keras ke laboratorium:
     * Buka daftar peminjaman aktif.
     * Klik tombol **Proses Pengembalian**.
     * Lakukan cek fisik kelengkapan komponen menggunakan *checklist* yang tersedia.
     * Pilih kondisi fisik saat kembali (*Baik*, *Perlu Maintenance*, atau *Rusak*).
     * Masukkan catatan pengembalian (jika ada).
     * Klik **Konfirmasi Pengembalian**.
     * Sistem secara otomatis mengembalikan jumlah stok ke katalog dan menerbitkan bukti transaksi selesai.
4. **Meninjau Pengajuan Peran Dosen (`/admin/role-requests`):**
   * Memeriksa daftar pemohon yang mengajukan kenaikan peran menjadi Dosen/Peneliti.
   * Admin dapat menekan tombol **Setujui** atau **Tolak** (disertai alasan penolakan yang transparan).

---

## 💻 4. Menjalankan Aplikasi di Komputer Lokal (Development)

Jika Anda ingin menjalankan atau mengembangkan aplikasi ini di komputer lokal:

### Prasyarat
* **Node.js** versi 18 atau lebih baru.
* Akun **Supabase** dengan file konfigurasi `.env`.

### Langkah-Langkah:
1. **Buka Terminal di folder project:**
   ```bash
   cd Campus-IoT-Inventory
   ```
2. **Pasang dependensi pustaka:**
   ```bash
   npm install
   ```
3. **Konfigurasi Environment Variable (`.env`):**
   Buat file `.env` di folder utama project dan isi dengan kredensial Supabase Anda:
   ```env
   VITE_SUPABASE_URL=https://proyek-anda.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5c...
   VITE_CLARITY_ID=z6bebo10ef
   ```
4. **Jalankan server pengembangan:**
   ```bash
   npm run dev
   ```
   Buka peramban di alamat: `http://localhost:3000`
5. **Membangun versi produksi (Build):**
   ```bash
   npm run build
   ```
   Hasil build akan tersimpan di dalam folder `dist/` dan siap di-deploy ke Cloudflare Pages atau hosting statis lainnya.

---

*Dokumen ini dibuat secara khusus untuk dokumentasi teknis dan panduan operasional sistem Campus IoT Laboratorium.*

