# 🏫 Absensi Sekolah

![node >=18](https://img.shields.io/badge/node-%3E%3D18-green)
![express 5.x](https://img.shields.io/badge/express-5.x-blue)
![prisma ORM](https://img.shields.io/badge/prisma-ORM-purple)
![postgresql](https://img.shields.io/badge/database-PostgreSQL-blue)
![jwt auth](https://img.shields.io/badge/auth-JWT-orange)
![license MIT](https://img.shields.io/badge/license-MIT-green)

Backend API untuk sistem **manajemen absensi sekolah** berbasis **Node.js + Express + Prisma**.  
Proyek ini dibuat modular agar mudah dikembangkan, dilengkapi dengan **notifikasi Telegram**, **ekspor Excel & PDF**, **cron job otomatis**, serta **role-based access control** yang terstruktur.

---

## 🚀 Fitur Utama

- **Authentication & Authorization**
  - Login dengan JWT, password di-hash menggunakan bcrypt.
  - Role: `SUPER_ADMIN`, `ADMIN`, `GURU`, `WALAS`, `KESISWAAN`.

- **Manajemen Data**
  - CRUD Siswa (dengan import massal via Excel/RFID)
  - CRUD Guru & User
  - CRUD Kelas & Tahun Ajaran
  - CRUD Jadwal Pelajaran

- **Absensi**
  - Pencatatan kehadiran harian berbasis RFID.
  - Finalisasi absensi dengan sistem majority-rules (`FinalAbsensi`).
  - Status: `HADIR`, `SAKIT`, `IZIN`, `ALPHA`.

- **Rekapitulasi & Laporan**
  - Ekspor rekap absensi ke **Excel** (ExcelJS & xlsx).
  - Ekspor laporan ke **PDF** (PDFKit).

- **Notifikasi Telegram**
  - Pengiriman notifikasi otomatis via Telegram Bot API.

- **Penjadwalan Otomatis**
  - Cron job untuk pembuatan tahun ajaran baru & penyalinan kelas.

- **Struktur Modular**
  - Routes, controllers, middleware, dan utils terorganisir rapi.

---

## 📁 Struktur Direktori

```
absensi_sekolah/
├── bin/                        # Entry point server (www)
├── prisma/
│   ├── schema.prisma           # Schema database (Prisma)
│   └── seed.js                 # Data awal database
├── public/
│   └── stylesheets/            # Static CSS
├── src/
│   ├── controllers/            # Logic handler tiap resource
│   │   ├── authController.js
│   │   ├── siswaController.js
│   │   ├── guruController.js
│   │   ├── kelasController.js
│   │   ├── absensiController.js
│   │   ├── jadwalController.js
│   │   └── rekapController.js
│   ├── middleware/             # Middleware global (auth, role, upload)
│   │   ├── verifyToken.js
│   │   ├── checkRole.js
│   │   └── upload.js
│   ├── routes/                 # Routing modular
│   │   ├── index.js
│   │   ├── authRoutes.js
│   │   ├── siswaRoutes.js
│   │   ├── guruRoutes.js
│   │   ├── absensiRoutes.js
│   │   └── rekapRoutes.js
│   └── utils/                  # Helper functions
│       ├── telegram.js
│       ├── excelHelper.js
│       └── cronJob.js
├── views/                      # Template Jade
├── app.js                      # Konfigurasi Express
├── prisma.config.ts
├── .env                        # Konfigurasi environment
└── package.json
```

---

## ⚙️ Instalasi & Setup

### 1. Clone Repository

```bash
git clone https://github.com/Dipsii1/absensi_sekolah.git
cd absensi_sekolah
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Konfigurasi Environment

Buat file `.env` di root project:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/absensi_sekolah"
JWT_SECRET="your_jwt_secret_key"
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"
TELEGRAM_CHAT_ID="your_chat_id"
PORT=3000
```

### 4. Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Jalankan migrasi database
npx prisma migrate dev --name init

# (Opsional) Seed data awal
npm run seed
```

### 5. Jalankan Aplikasi

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

Aplikasi berjalan di → `http://localhost:3000`

---

## 🛠️ Tech Stack

| Kategori | Teknologi |
|---|---|
| Runtime | Node.js ≥18 |
| Framework | Express.js v5 |
| ORM | Prisma v5 |
| Database | PostgreSQL |
| Auth | JWT + bcrypt |
| Scheduler | node-cron |
| Notifikasi | node-telegram-bot-api |
| Export | ExcelJS, xlsx, PDFKit |
| Upload | Multer |
| HTTP Client | Axios |

---

## 📋 Scripts

| Script | Perintah | Keterangan |
|---|---|---|
| Start | `npm start` | Jalankan server production |
| Dev | `npm run dev` | Jalankan dengan nodemon |
| Seed | `npm run seed` | Isi data awal database |
| Migrate | `npx prisma migrate dev` | Jalankan migrasi DB |
| Studio | `npx prisma studio` | Buka Prisma Studio (GUI) |

---

## 🔐 Role & Akses

| Role | Deskripsi |
|---|---|
| `SUPER_ADMIN` | Akses penuh ke seluruh sistem |
| `ADMIN` | Manajemen data siswa, guru, kelas |
| `GURU` | Input & lihat absensi kelas sendiri |
| `WALAS` | Wali kelas — rekap absensi per kelas |
| `KESISWAAN` | Lihat & ekspor laporan absensi |

---

## 📡 API Endpoints

> Base URL: `http://localhost:3000/api`  
> 🔒 = Memerlukan header `Authorization: Bearer <token>`

---

### 🔑 Auth

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| `POST` | `/auth/login` | ❌ | Login user, mengembalikan JWT token |
| `POST` | `/auth/logout` | 🔒 | Logout & invalidasi sesi |
| `GET` | `/auth/me` | 🔒 | Ambil data user yang sedang login |
| `PUT` | `/auth/change-password` | 🔒 | Ganti password user |

---

### 👤 User

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| `GET` | `/users` | 🔒 | Ambil semua data user |
| `GET` | `/users/:id` | 🔒 | Ambil detail user berdasarkan ID |
| `POST` | `/users` | 🔒 | Tambah user baru |
| `PUT` | `/users/:id` | 🔒 | Update data user |
| `DELETE` | `/users/:id` | 🔒 | Hapus user |

---

### 👨‍🏫 Guru

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| `GET` | `/guru` | 🔒 | Ambil semua data guru |
| `GET` | `/guru/:id` | 🔒 | Ambil detail guru berdasarkan ID |
| `POST` | `/guru` | 🔒 | Tambah data guru baru |
| `PUT` | `/guru/:id` | 🔒 | Update data guru |
| `DELETE` | `/guru/:id` | 🔒 | Hapus data guru |

---

### 🎒 Siswa

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| `GET` | `/siswa` | 🔒 | Ambil semua data siswa |
| `GET` | `/siswa/:id` | 🔒 | Ambil detail siswa berdasarkan ID |
| `POST` | `/siswa` | 🔒 | Tambah siswa baru |
| `PUT` | `/siswa/:id` | 🔒 | Update data siswa |
| `DELETE` | `/siswa/:id` | 🔒 | Hapus data siswa |
| `POST` | `/siswa/import` | 🔒 | Import massal siswa via file Excel |
| `GET` | `/siswa/export` | 🔒 | Export data siswa ke Excel |

---

### 🏫 Kelas

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| `GET` | `/kelas` | 🔒 | Ambil semua kelas |
| `GET` | `/kelas/:id` | 🔒 | Ambil detail kelas |
| `POST` | `/kelas` | 🔒 | Tambah kelas baru |
| `PUT` | `/kelas/:id` | 🔒 | Update data kelas |
| `DELETE` | `/kelas/:id` | 🔒 | Hapus kelas |
| `GET` | `/kelas/:id/siswa` | 🔒 | Ambil daftar siswa di kelas tertentu |

---

### 📅 Tahun Ajaran

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| `GET` | `/tahun-ajaran` | 🔒 | Ambil semua tahun ajaran |
| `GET` | `/tahun-ajaran/aktif` | 🔒 | Ambil tahun ajaran yang sedang aktif |
| `POST` | `/tahun-ajaran` | 🔒 | Tambah tahun ajaran baru |
| `PUT` | `/tahun-ajaran/:id` | 🔒 | Update tahun ajaran |
| `PUT` | `/tahun-ajaran/:id/aktifkan` | 🔒 | Set tahun ajaran sebagai aktif |
| `DELETE` | `/tahun-ajaran/:id` | 🔒 | Hapus tahun ajaran |

---

### 🗓️ Jadwal

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| `GET` | `/jadwal` | 🔒 | Ambil semua jadwal pelajaran |
| `GET` | `/jadwal/:id` | 🔒 | Ambil detail jadwal |
| `GET` | `/jadwal/kelas/:kelasId` | 🔒 | Ambil jadwal berdasarkan kelas |
| `POST` | `/jadwal` | 🔒 | Tambah jadwal pelajaran |
| `PUT` | `/jadwal/:id` | 🔒 | Update jadwal |
| `DELETE` | `/jadwal/:id` | 🔒 | Hapus jadwal |

---

### ✅ Absensi

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| `GET` | `/absensi` | 🔒 | Ambil data absensi (filter: tanggal, kelas) |
| `GET` | `/absensi/:id` | 🔒 | Ambil detail absensi |
| `POST` | `/absensi` | 🔒 | Catat absensi manual |
| `POST` | `/absensi/rfid` | ❌ | Catat absensi via RFID tag |
| `PUT` | `/absensi/:id` | 🔒 | Update status absensi |
| `DELETE` | `/absensi/:id` | 🔒 | Hapus data absensi |
| `POST` | `/absensi/finalisasi` | 🔒 | Finalisasi absensi harian (majority-rules) |

---

### 📊 Rekapitulasi & Laporan

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| `GET` | `/rekap/kelas/:kelasId` | 🔒 | Rekap absensi per kelas & periode |
| `GET` | `/rekap/siswa/:siswaId` | 🔒 | Rekap absensi per siswa |
| `GET` | `/rekap/export/excel` | 🔒 | Export rekap absensi ke Excel |
| `GET` | `/rekap/export/pdf` | 🔒 | Export rekap absensi ke PDF |

---

## 👤 Developer

**Dipsii1** — [github.com/Dipsii1](https://github.com/Dipsii1)
