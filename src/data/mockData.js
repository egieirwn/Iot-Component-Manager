// Mock data inventaris laboratorium IoT Campus
export const currentUser = {
  name: 'Akira Tomoe',
  email: 'akira.tomoe@un.ac.id',
  nim: '2210511045',
  major: 'Teknik Informatika',
  university: 'Universitas',
  role: 'Mahasiswa',
  mainLab: 'Lab Sistem Tertanam'
};

export const initialComponents = [
  {
    id: 'arduino-uno-r3',
    code: 'MCU-00182',
    name: 'Arduino Uno R3',
    category: 'Mikrokontroler',
    stock: 12,
    maintenanceStock: 0,
    damagedStock: 0,
    totalStock: 14,
    condition: 'Baik',
    status: 'TERSEDIA',
    image: '/assets/images/arduino.png',
    description: 'Papan mikrokontroler berbasis ATmega328P untuk pembuatan purwarupa rangkaian elektronika dan proyek IoT dasar. Mudah diprogram dan kompatibel dengan berbagai sensor dan aktuator.',
    tags: ['MIKROKONTROLER', 'ARDUINO', 'ATMEGA328P'],
    location: 'Lab Sistem Tertanam · Lemari A · Rak 01',
    specs: {
      prosesor: 'ATmega328P',
      koneksi: 'USB Tipe-B',
      termasuk: 'Board Arduino Uno R3 · Kabel USB'
    },
    loanHistory: [
      { borrower: 'Akira Tomoe', borrowDate: '5 Okt 2026', returnDate: 'Jatuh tempo 12 Okt 2026', condition: 'Baik' }
    ]
  },
  {
    id: 'sensor-dht22',
    code: 'SNS-00324',
    name: 'Sensor DHT22 (Suhu & Kelembaban)',
    category: 'Sensor',
    stock: 3,
    maintenanceStock: 0,
    damagedStock: 0,
    totalStock: 4,
    condition: 'Baik',
    status: 'TERSEDIA',
    image: '/assets/images/dht22.png',
    description: 'Sensor digital untuk mengukur suhu dan kelembaban udara relatif dengan akurasi tinggi dan sinyal keluaran digital terkalibrasi. Cocok untuk proyek monitoring lingkungan dan stasiun cuaca IoT.',
    tags: ['SENSOR', 'SUHU', 'KELEMBABAN'],
    location: 'Lab Sistem Tertanam · Lemari C · Rak 02',
    specs: {
      prosesor: 'Keluaran Sinyal Digital',
      koneksi: '1-Wire Digital (Pin Data)',
      termasuk: 'Modul Sensor DHT22 · Resistor Pull-up'
    },
    loanHistory: [
      { borrower: 'Akira Tomoe', borrowDate: '1 Okt 2026', returnDate: 'Jatuh tempo 8 Okt 2026', condition: 'Baik' }
    ]
  },
  {
    id: 'esp32-devkit-v1',
    code: 'MCU-00214',
    name: 'ESP32 DevKit V1',
    category: 'Mikrokontroler',
    stock: 0,
    maintenanceStock: 0,
    damagedStock: 0,
    totalStock: 2,
    condition: 'Baik',
    status: 'DIPINJAM',
    image: '/assets/images/esp32.png',
    description: 'Modul mikrokontroler ESP32 untuk prototipe terhubung, jaringan sensor, dan sistem tertanam. Cocok untuk proyek IoT, otomasi, dan pengembangan embedded.',
    tags: ['MIKROKONTROLER', 'ESP32', 'WIFI'],
    location: 'Laboratorium Inovasi · Lemari B · Rak 03',
    borrowerInfo: {
      borrower: 'Ivan Barista',
      dueDate: '10 Okt 2026',
      notes: 'Belum tersedia untuk dipinjam. Jelajahi komponen lain yang tersedia.'
    },
    specs: {
      prosesor: 'ESP32 WROOM',
      koneksi: 'WiFi · Bluetooth',
      termasuk: 'Modul · Kabel Micro-USB'
    },
    loanHistory: [
      { borrower: 'Ivan Barista', borrowDate: '28 Sep 2026', returnDate: 'Belum kembali', condition: 'Baik' },
      { borrower: 'Rifky Pembohonk Publik', borrowDate: '12 Agu 2026', returnDate: '19 Agu 2026', condition: 'Sangat baik' }
    ]
  },
  {
    id: 'relay-module-4ch',
    code: 'MOD-00105',
    name: 'Relay Module 4 Channel',
    category: 'Modul',
    stock: 7,
    maintenanceStock: 0,
    damagedStock: 0,
    totalStock: 8,
    condition: 'Baik',
    status: 'TERSEDIA',
    image: '/assets/images/arduino.png',
    description: 'Modul relay 4 kanal 5V untuk mengendalikan perangkat berdaya listrik tinggi menggunakan saklar digital terisolasi optocoupler.',
    tags: ['MODUL', 'RELAY', '5V'],
    location: 'Lab Sistem Tertanam · Lemari B · Rak 01',
    specs: {
      prosesor: 'Optocoupler Isolation',
      koneksi: 'Pin Header 5V',
      termasuk: 'Modul Relay 4-Channel'
    },
    loanHistory: []
  },
  {
    id: 'kabel-jumper-mf',
    code: 'ACC-00042',
    name: 'Kabel Jumper Male to Female',
    category: 'Aksesoris',
    stock: 10,
    maintenanceStock: 0,
    damagedStock: 0,
    totalStock: 15,
    condition: 'Baik',
    status: 'TERSEDIA',
    image: '/assets/images/dht22.png',
    description: 'Set kabel jumper 20cm male-to-female 40 pin pita untuk kemudahan koneksi fleksibel antar breadboard dan modul elektronika.',
    tags: ['AKSESORIS', 'KABEL', 'JUMPER'],
    location: 'Lab Sistem Tertanam · Kotak Aksesoris 01',
    specs: {
      prosesor: 'Tembaga Berkualitas',
      koneksi: 'Male ke Female',
      termasuk: '40 Pin Kabel Pita 20cm'
    },
    loanHistory: []
  }
];

export const initialBorrowings = [
  {
    id: 'BORROW-001',
    componentId: 'sensor-dht22',
    componentName: 'Sensor DHT22 (Suhu & Kelembaban)',
    componentCode: 'SNS-00324',
    category: 'Sensor',
    quantity: 1,
    status: 'DIPINJAM',
    borrowDate: '2026-10-01',
    dueDate: '2026-10-08',
    remainingDays: '3 hari tersisa',
    pickupLab: 'Lab Sistem Tertanam',
    purpose: 'Monitoring lingkungan dan kelembaban ruang lab',
    notes: 'Kondisi sensor baik teruji',
    borrowerName: 'Akira Tomoe',
    borrowerNim: '2210511045'
  },
  {
    id: 'BORROW-002',
    componentId: 'arduino-uno-r3',
    componentName: 'Arduino Uno R3',
    componentCode: 'MCU-00182',
    category: 'Mikrokontroler',
    quantity: 2,
    status: 'DIPINJAM',
    borrowDate: '2026-10-05',
    dueDate: '2026-10-12',
    remainingDays: '7 hari tersisa',
    pickupLab: 'Lab Sistem Tertanam',
    purpose: 'Praktikum Sistem Tertanam & IoT',
    notes: 'Dilengkapi kabel USB Tipe-B',
    borrowerName: 'Akira Tomoe',
    borrowerNim: '2210511045'
  },
  {
    id: 'BORROW-000',
    componentId: 'esp32-devkit-v1',
    componentName: 'ESP32 DevKit V1',
    componentCode: 'MCU-00214',
    category: 'Mikrokontroler',
    quantity: 1,
    status: 'DIKEMBALIKAN',
    borrowDate: '2026-08-12',
    dueDate: '2026-08-19',
    returnDate: '2026-08-19',
    returnCondition: 'Baik',
    remainingDays: 'Selesai',
    pickupLab: 'Laboratorium Inovasi',
    purpose: 'Uji coba komunikasi BLE',
    notes: 'Komponen kembali lengkap dan berfungsi',
    borrowerName: 'Rifky Pembohonk Publik',
    borrowerNim: '2210511002'
  }
];
