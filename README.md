# Campus IoT - Sistem Inventaris & Peminjaman Komponen Laboratorium

> **Proyek Tugas Web Development — Modul 8: Data Dinamis & Logika Aplikasi**  
> Mengembangkan aplikasi web dua arah (*two-way interaction*) dari prototipe statis menjadi aplikasi fungsional siap uji (*Usability Testing*).

Aplikasi web modern berbasis **React 19 + Vite** untuk manajemen inventaris perangkat keras IoT, modul mikrokontroler, sensor cerdas, serta sistem permohonan peminjaman dan pengembalian laboratorium kampus.

---

## 🎯 Capaian & Pemenuhan Rubrik Penugasan Modul 8

Proyek ini telah memenuhi seluruh target dan kriteria penilaian Modul 8:

| Bobot | Komponen Penilaian | Status Implementasi |
| :--- | :--- | :--- |
| **25%** | **Data Dinamis & Fitur Search / Filter** | ✅ **Selesai**. Data komponen ditarik secara dinamis dari service layer asynchronous (`fetchComponents()`) dan dirender dengan `.map()`. Fitur pencarian kata kunci dan penyaringan kategori/status menyaring daftar secara instan tanpa me-reload halaman. |
| **25%** | **Fungsionalitas Form, Validasi & Sanitasi** | ✅ **Selesai**. Form peminjaman (`BorrowModal` dan `BorrowForm`) memvalidasi format angka kuantitas, NIM numerik, email, dan tanggal. Input dibersihkan dari spasi berlebih (`.trim()`), pesan error muncul tepat di bawah kolom (*inline error*), dan tombol submit terkunci dengan status loading spinner untuk mencegah duplikasi. |
| **20%** | **Kelengkapan UX States (Skeleton, Empty, Error, Toast)** | ✅ **Selesai**. Animasi *Loading Skeleton (Shimmer/Pulse)* saat memuat data, tampilan *Empty State* (*"Yah, komponen tidak ditemukan 🔍"*) lengkap dengan tombol reset, *Error State* dengan tombol coba lagi (*"Coba lagi ↻"*), serta sistem *Toast Notification* modern yang menggantikan seluruh `alert()` bawaan browser. |
| **15%** | **Kerapian Kode, Keamanan & Alur Git** | ✅ **Selesai**. Struktur folder modular, pemisahan service layer dan komponen UI, perlindungan kredensial `.env`, serta alur pengembangan aktif pada branch `feat/dynamic-data`. |
| **15%** | **Dokumentasi & Kesiapan Live Deployment** | ✅ **Selesai**. Dokumentasi lengkap arsitektur, panduan pengujian bagi mentor/dosen, log AI & perbaikan manual, serta konfigurasi deployment Vercel/Netlify. |

---

## 📁 Struktur Direktori Proyek

```text
iot-component-manager/
├── legacy-html/            # Arsip berkas HTML statis Modul 6 (baseline pembanding)
│   ├── assets/images/
│   ├── js/
│   └── *.html
├── public/
│   └── assets/images/      # Aset gambar perangkat (Arduino Uno, DHT22, ESP32)
├── src/                    # Kode Sumber Aplikasi React SPA
│   ├── components/
│   │   ├── common/         # Komponen UI umum: Toast.jsx, ComponentSkeleton.jsx
│   │   ├── components/     # Komponen spesifik: ComponentItem.jsx, BorrowModal.jsx, StatusBadge.jsx
│   │   └── layout/         # Komponen layout: Navbar.jsx, Sidebar.jsx
│   ├── data/               # Mock data awal inventaris, user profile, dan peminjaman
│   ├── layouts/            # MainLayout.jsx (Header + Sidebar + Content wrapper)
│   ├── pages/              # Halaman: Dashboard, Components, ComponentDetail, BorrowForm, BorrowConfirmation, Borrowings, Auth
│   ├── services/           # componentService.js (Layer akses data asynchronous & mutasi transaksi)
│   ├── App.jsx             # Definisi routing aplikasi (React Router v7)
│   ├── index.css           # Vanilla CSS Design System (variabel Figma, keyframes Skeleton & Toast)
│   └── main.jsx            # Entry point React (dibungkus ToastProvider)
├── index.html              # Entry point Vite SPA
├── package.json
├── package-lock.json
├── vite.config.js
└── .gitignore
```

---

## 💾 Arsitektur Sumber Data & Transaksi (*Data Persistence*)

- **Service Layer Asynchronous (`src/services/componentService.js`):**
  - Mengabstraksi seluruh pembacaan dan mutasi data melalui Promise (`fetchComponents`, `fetchComponentById`, `fetchBorrowings`, `processBorrowing`, `processReturn`).
  - Menyertakan latensi jaringan simulasi realistis (~350–450ms) agar transisi UX State (*Loading Skeleton* ke *Loaded*) dapat diamati dengan mulus.
- **Penyimpanan Terstruktur (`localStorage`):**
  - Kunci penyimpanan: `campus_iot_components`, `campus_iot_borrowings`, `campus_iot_user`.
  - Jika `localStorage` kosong, service otomatis melakukan *seeding* dari data awal `src/data/mockData.js`.
- **Integritas Stok & Histori Transaksi:**
  - **Peminjaman:** Mengurangi sisa stok komponen secara real-time (`stock: stock - quantity`). Jika stok menjadi 0, status otomatis beralih ke `DIPINJAM`.
  - **Pengembalian:** Transaksi yang selesai **tidak pernah dihapus**, melainkan statusnya diperbarui menjadi `DIKEMBALIKAN` beserta tanggal dan kondisi pengembalian.
  - **Triase Kondisi Pengembalian:**
    - `Baik`: Unit dikembalikan ke stok siap pakai (`stock`).
    - `Perlu Pengecekan / Longgar`: Unit dialihkan ke `maintenanceStock` (tidak masuk stok tersedia).
    - `Rusak`: Unit dialihkan ke `damagedStock` sehingga tidak dapat langsung dipinjam kembali sebelum perbaikan.

---

## 🧪 Panduan Pengujian Fitur untuk Penguji / Mentor

Silakan ikuti skenario pengujian interaktif berikut untuk memvalidasi fungsionalitas Modul 8:

### 1. Menguji Pencarian & Penyaringan Dinamis
1. Buka halaman **Katalog Komponen** (`/components`).
2. Perhatikan animasi **Loading Skeleton** berdenyut saat data dimuat pertama kali.
3. Ketik `"DHT22"` pada kolom pencarian: katalog langsung menyaring dan hanya menampilkan *Sensor DHT22*.
4. Pilih dropdown **Kategori: Mikrokontroler**: daftar menyaring kartu komponen mikrokontroler (*Arduino Uno R3*, *ESP32*).

### 2. Menguji Empty State & Tombol Reset
1. Pada kolom pencarian katalog, ketik kata kunci acak yang tidak ada, misalnya `"xyz999"`.
2. Halaman akan menampilkan **Empty State** bertuliskan:
   > *"Yah, komponen tidak ditemukan 🔍"*
3. Klik tombol **Reset Pencarian & Filter**: kolom pencarian dan filter dropdown akan dibersihkan dan seluruh komponen kembali tampil secara instan.

### 3. Menguji Validasi & Sanitasi Form Peminjaman
1. Pada kartu *Arduino Uno R3*, klik tombol **Pinjam Komponen**. Modal formulir peminjaman akan muncul melayang di layar.
2. Kosongkan kolom nama atau masukkan nilai kuantitas pinjam melebihi sisa stok (misalnya `99`), lalu klik **Konfirmasi Pinjam**.
3. Perhatikan pesan error berwarna merah yang muncul **tepat di bawah kolom yang bersangkutan** (*inline error* dengan ikon peringatan).
4. Masukkan data yang sah (Nama: `Budi Santoso`, NIM: `2210511088`, Jumlah: `1`), lalu klik **Konfirmasi Pinjam**.
5. Tombol akan terkunci dengan teks **"Memproses..."** dan animasi spinner.
6. Notifikasi **Toast Pop-up** berwarna hijau akan muncul di sudut kanan bawah (*"Peminjaman 1 unit Arduino Uno R3 berhasil dicatat!"*).
7. Stok Arduino Uno R3 pada katalog otomatis berkurang dari 12 unit menjadi 11 unit.

### 4. Menguji Alur Pengembalian & Triase Kondisi
1. Buka menu **Peminjaman Saya** (`/borrowings`).
2. Transaksi baru atas nama *Budi Santoso* langsung tercantum di tab **Peminjaman Aktif**.
3. Klik tombol **Kembalikan** pada baris transaksi.
4. Pilih kondisi barang (misal: *Baik* atau *Perlu Pengecekan*), lalu konfirmasi.
5. Pop-up Toast sukses muncul mengonfirmasi pengembalian. Transaksi berpindah dari tab *Peminjaman Aktif* ke tab *Riwayat Pengembalian*.

---

## 🛠️ Instalasi & Menjalankan Proyek Secara Lokal

### Prasyarat
- [Node.js](https://nodejs.org/) versi 18, 20, 22, atau 24.
- npm / pnpm / yarn.

### Menjalankan Server Pengembangan (Dev)
```bash
# 1. Pasang dependensi
npm install

# 2. Jalankan development server
npm run dev
# atau
npm start
```
Buka peramban di: **`http://localhost:3000`**

### Membangun Versi Produksi (Production Build)
```bash
npm run build
```
Hasil build terkompilasi bersih di direktori `dist/` (bebas error dan peringatan sintaks).

---

## 🚀 Panduan Deployment ke Layanan Cloud (Vercel / Netlify)

Proyek ini telah dikonfigurasi sebagai Single Page Application (SPA) berbasis Vite.

### Opsi A: Deploy ke Vercel (Disarankan)
1. Push branch `feat/dynamic-data` atau branch utama ke repositori GitHub publik.
2. Buka dashboard [Vercel](https://vercel.com/) dan pilih **Add New Project** -> **Import Git Repository**.
3. Pengaturan build otomatis terdeteksi:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Untuk memastikan routing SPA (`react-router-dom`) berfungsi saat halaman di-refresh, buat berkas `vercel.json` (jika belum ada):
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```
5. Klik **Deploy**. URL publik langsung aktif.

---

## 🤖 Log Prompt AI & Catatan Perbaikan Manual

| Area | Prompt AI / Permintaan Awal | Masalah yang Ditemukan | Perbaikan Manual yang Dilakukan |
| :--- | :--- | :--- | :--- |
| **CSS Media Query** | Mengimplementasikan styling modal dan form | Blok CSS modal tidak sengaja berada di dalam kurung kurawal `@media (max-width: 768px)`, sehingga styling desktop terpengaruh. | Memindahkan deklarasi `.modal-overlay`, `.form-group`, dll. ke scope global dan merapikan kurung kurawal media query. |
| **UX States (Toast)** | Menggantikan notifikasi browser | Kode sebelumnya masih menyisakan pemanggilan fungsi native browser `alert()` di beberapa berkas (`Borrowings`, `ComponentDetail`, `VerifyEmail`). | Membuat `ToastProvider` & hook `useToast` kustom berbasis React Context dan melenyapkan 100% pemanggilan `alert()`. |
| **Form Peminjaman** | Validasi input form peminjaman | Pemotongan stok sebelumnya hanya mengubah status string tanpa memotong kuantitas stok numerik (`stock - quantity`). | Mengintegrasikan `processBorrowing()` dengan revalidasi stok real-time, pengurangan sisa unit, dan validasi inline tepat di bawah field yang salah. |
| **Pencarian Katalog** | Menambahkan fitur pencarian | Saat pencarian tidak menemukan hasil, layar hanya menampilkan pesan teks polos tanpa opsi pemulihan. | Menambahkan tampilan Empty State berdesain khusus dengan ikon dan tombol pemulihan *Reset Pencarian & Filter*. |

---

## 🌿 Informasi Git & Branching

- **`feat/dynamic-data`**: Branch aktif pengerjaan penugasan Modul 8 (Data Dinamis & Logika Aplikasi).
- **`migration-react-vite`**: Branch migrasi arsitektur React + Vite dari Modul 7.
- **`main`**: Branch baseline murni HTML5 semantik Modul 6.
