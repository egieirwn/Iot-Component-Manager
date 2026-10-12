# IoT Component Manager - Campus IoT

Sistem manajemen inventaris dan peminjaman komponen IoT berbasis web untuk laboratorium kampus. Proyek ini dikembangkan sebagai bagian dari program magang, mengimplementasikan desain UI/UX dari Figma dan alur sistem (BPMN) yang telah ditentukan.

## 🚀 Fitur Utama
Berdasarkan alur sistem yang dirancang, aplikasi ini mencakup:
1.  **Authentication:** Login, Register, Verifikasi Email, dan Lupa Password (dengan validasi email kampus).
2.  **Inventory:** Dashboard, Pencarian Komponen, Filter Kategori, dan Detail Komponen.
3.  **Borrowing:** Form Peminjaman, Konfirmasi, dan Riwayat Peminjaman.
4.  **Return:** Pengembalian Komponen dan Update Status Inventaris (Dalam Pengembangan).

## 🛠️ Teknologi yang Digunakan
*   **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6)
*   **Tools:** Git, GitHub, Visual Studio Code
*   **Metode:** Responsive Web Design, DOM Manipulation

## 📁 Struktur Folder
Proyek ini menggunakan struktur folder berbasis fitur (*Feature-based Folder Structure*) agar kode mudah dikelola dan diskalakan:

Iot-Component-Manager/
├── index.html                        (Landing Page / Halaman Awal)
├── pages/
│   ├── auth/                         (Alur Autentikasi)
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── verify-email.html
│   │   ├── forgot-password.html
│   │   └── reset-email-sent.html
│   ├── inventory/                    (Alur Inventaris & Peminjaman)
│   │   ├── dashboard.html
│   │   ├── component.html
│   │   └── detail-component.html
│   ├── borrowing/                    (Alur Transaksi Peminjaman)
│   │   ├── form-peminjaman.html
│   │   ├── konfirmasi-peminjaman.html
│   │   ├── peminjaman-berhasil.html
│   │   └── peminjaman-saya.html      (Riwayat / Peminjaman Saya)
│   ├── return/                       (Alur Pengembalian - Folder Baru)
│   │   ├── form-pengembalian.html      (Belum ada, nanti dibuat)
│   │   └── pengembalian-berhasil.html  (Belum ada, nanti dibuat)
│   └── profile/
│       └── complete-profile.html
└── assets/
    ├── css/                          (Folder Baru untuk CSS)
    ├── js/
    │   └── data-component.js
    └── images/
        ├── arduino.png
        ├── dht22.png
        └── esp32.png