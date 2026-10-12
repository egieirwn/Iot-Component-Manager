// Isi file data-komponen.js
const daftarKomponen = [
    { nama: "Sensor DHT22 (Suhu & Kelembaban)", kategori: "Sensor", stok: 3, kondisi: "Berfungsi", status: "TERSEDIA" },
    { nama: "ESP32 DevKit V1", kategori: "Mikrokontroler", stok: 0, kondisi: "Berfungsi", status: "DIPINJAM" },
    { nama: "Relay Module 4 Channel", kategori: "Modul", stok: 7, kondisi: "Berfungsi", status: "TERSEDIA" },
    { nama: "Arduino Uno R3", kategori: "Mikrokontroler", stok: 5, kondisi: "Berfungsi", status: "TERSEDIA" },
    { nama: "Relay Module 4 Channel", kategori: "Modul", stok: 7, kondisi: "Berfungsi", status: "TERSEDIA" },
    { nama: "Kabel Jumper Male to Female", kategori: "Aksesoris", stok: 10, kondisi: "Berfungsi", status: "TERSEDIA" },
];

const tbody = document.getElementById('data-komponen');
daftarKomponen.forEach(item => {
    let statusTeks = item.status === "TERSEDIA" ? "TERSEDIA" : "DIPINJAM";
    let baris = `
        <tr>
            <td>${item.nama}</td>
            <td>${item.kategori}</td>
            <td>${item.stok}</td>
            <td>${item.kondisi}</td>
            <td><strong>[${statusTeks}]</strong></td>
            <td><button onclick="lihatDetail('${item.nama}')">Lihat detail</button></td>
        </tr>
    `;
    tbody.innerHTML += baris;
});