# Campus IoT - Sistem Inventaris & Peminjaman Komponen Laboratorium

Aplikasi web modern untuk manajemen inventaris perangkat keras IoT, modul mikrokontroler, dan sistem peminjaman komponen laboratorium kampus.

Proyek ini telah dimigrasikan dari baseline HTML5 statis semantik (Modul 6) menjadi aplikasi Single Page Application (SPA) berbasis **React 19 + Vite** dengan desain antarmuka responsif dan alur transaksi yang terstruktur.

---

## 📁 Struktur Proyek

```text
iot-component-manager/
├── legacy-html/            # Arsip berkas HTML statis Modul 6 (baseline)
│   ├── assets/images/
│   ├── js/
│   └── *.html
├── public/
│   └── assets/images/      # Aset gambar perangkat (Arduino, DHT22, ESP32)
├── src/                    # Sumber kode aplikasi React
│   ├── components/         # Komponen UI modular (Navbar, Sidebar, StatusBadge, dll.)
│   ├── data/               # Mock data awal inventaris, user profile, dan peminjaman
│   ├── layouts/            # Layout utama aplikasi
│   ├── pages/              # Halaman aplikasi (Dashboard, Katalog, Detail, Form, Pengembalian)
│   ├── services/           # Service layer transaksi & data persistence (localStorage)
│   ├── App.jsx             # Routing aplikasi (React Router v7)
│   ├── index.css           # Vanilla CSS Design System (variabel HSL, typography Inter)
│   └── main.jsx            # Entry point React
├── index.html              # Entry point Vite SPA
├── package.json
├── package-lock.json
├── vite.config.js
└── .gitignore
```

---

## 🚀 Fitur Utama & Ruang Lingkup Prototipe

1. **Katalog & Detail Komponen**
   - Pencarian komponen secara real-time dan penyaringan berdasarkan kategori / status.
   - Halaman detail komprehensif memuat spesifikasi teknis, lokasi penyimpanan di lab, status ketersediaan, serta riwayat sirkulasi.
2. **Alur Peminjaman Komponen Terverifikasi**
   - Validasi ketat kuantitas pinjam terhadap sisa stok inventaris secara real-time.
   - Pencatatan identitas peminjam otomatis (NIM, Nama Mahasiswa, Program Studi).
   - Aksesibilitas form penuh (`htmlFor` dan `id` terhubung).
   - Halaman pratinjau konfirmasi sebelum pemotongan stok dilakukan.
3. **Manajemen Pengembalian & Triase Kondisi Barang**
   - **Histori Tidak Terhapus:** Transaksi peminjaman yang selesai diubah statusnya menjadi `DIKEMBALIKAN` dan dipindahkan ke tab *Riwayat Pengembalian*.
   - **Pemilihan Kondisi Barang:** Teknisi / asisten lab dapat memilih kondisi pengembalian:
     - **Baik:** Unit dikembalikan ke stok siap pakai (`stock`).
     - **Perlu Pengecekan / Longgar:** Unit dialokasikan ke stok pemeliharaan (`maintenanceStock`).
     - **Rusak:** Unit dialokasikan ke stok rusak (`damagedStock`), sehingga tidak dapat langsung dipinjam kembali.
4. **Data Persistence & Reset**
   - Data inventaris dan riwayat transaksi disimpan pada `localStorage` browser.
   - Disediakan fungsi `resetToDefaultData()` untuk mengembalikan inventaris ke kondisi mock awal sewaktu-waktu.

---

## 🛠️ Instalasi & Menjalankan Proyek

### Prasyarat
- [Node.js](https://nodejs.org/) versi 18 atau lebih baru.
- npm / pnpm / yarn.

### Menjalankan Server Pengembangan (Dev)
```bash
# 1. Pasang dependensi
npm install

# 2. Jalankan development server
npm run dev
```
Aplikasi dapat diakses melalui peramban di `http://localhost:3000` (atau port yang ditentukan Vite).

### Membangun Versi Produksi (Build)
```bash
npm run build
```
Hasil build produksi yang dioptimalkan akan tersimpan di direktori `dist/`.

---

## 🌿 Informasi Git & Branching

- **`main`**: Mempertahankan baseline murni HTML5 semantik Modul 6.
- **`migration-react-vite`**: Branch pengembangan aktif aplikasi React + Vite.
