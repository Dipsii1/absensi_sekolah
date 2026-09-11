# 🏫 Absensi Sekolah

![node >=18](https://img.shields.io/badge/node-%3E%3D18-green)
![express 5.x](https://img.shields.io/badge/express-5.x-blue)
![prisma ORM](https://img.shields.io/badge/prisma-ORM-purple)
![postgresql](https://img.shields.io/badge/database-PostgreSQL-blue)
![jwt auth](https://img.shields.io/badge/auth-JWT-orange)
![bullmq](https://img.shields.io/badge/queue-BullMQ-red)
![redis](https://img.shields.io/badge/cache-Redis-red)
![license MIT](https://img.shields.io/badge/license-MIT-green)

Backend API untuk sistem **manajemen absensi sekolah** berbasis **Node.js + Express + Prisma**.
Proyek ini dibuat modular agar mudah dikembangkan, dilengkapi dengan **notifikasi Telegram**, **ekspor Excel**, **cron job otomatis**, serta **role-based access control** yang terstruktur.

---

## 🚀 Fitur Utama

- **Authentication & Authorization**
  - Login staf/guru wajib melalui YBSMO; backend menerbitkan JWT setelah autentikasi berhasil.
  - Data guru menggunakan `id_user` YBSMO sebagai `NIP`; akun lokal dihubungkan ke guru yang sudah disinkronkan.
  - Role: `SUPER_ADMIN`, `ADMIN`, `GURU`, `WALAS`, `KESISWAAN`.
  - Middleware `requirePokja` untuk akses yang memerlukan keanggotaan Pokja.

- **Manajemen Data**
  - CRUD Siswa (dengan import massal via Excel)
  - CRUD Guru & User
  - CRUD Kelas & Tahun Ajaran
  - CRUD Jadwal Pelajaran
  - CRUD Mata Pelajaran
  - CRUD Orang Tua
  - CRUD Role (SUPER_ADMIN only)
  - CRUD RFID

- **Absensi**
  - Pencatatan kehadiran harian berbasis RFID (tap-in & tap-out).
  - Input absensi manual oleh Guru per jadwal pelajaran.
  - Input absensi manual oleh Walas per kelas.
  - Finalisasi absensi per siswa, per kelas, atau semua kelas.
  - Status: `Hadir`, `Izin`, `Sakit`, `Alpha`.

- **Rekapitulasi & Laporan**
  - Rekap absensi per kelas (harian, bulanan, semester, tahunan).
  - Rekap absensi per siswa (harian, mingguan, bulanan, tahunan).
  - Ekspor rekap absensi ke **Excel** (ExcelJS).

- **Notifikasi Telegram**
  - Pengiriman notifikasi otomatis via Telegram Bot API.

- **Penjadwalan Otomatis**
  - Cron job untuk pembuatan tahun ajaran baru & penyalinan kelas.
  - Cron job untuk auto-approve status request absensi.

- **Queue & Redis (Async Processing)**
  - Tap-in & tap-out RFID diproses secara asynchronous via **BullMQ** + **Redis**.
  - Endpoint langsung return `202 Accepted`, proses ke DB dan notifikasi Telegram dipelayani worker di background.
  - Retry otomatis (3x, 5s fixed backoff) bila worker gagal.

- **Status Request**
  - Permintaan perubahan status absensi oleh Guru.
  - Persetujuan oleh Walas.
  - Auto-approve oleh sistem jika expired.

- **Manajemen Kenaikan Kelas**
  - Atur status naik/tinggal/lulus per siswa per tahun ajaran.
  - Preview keputusan default (Naik untuk X/XI, Lulus untuk XII) sebelum submit.
  - Bulk submit via transaksi dengan validasi siswa harus terdaftar di kelas yang sesuai.

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
│   │   ├── authControllers.js
│   │   ├── siswaControllers.js
│   │   ├── guruControllers.js
│   │   ├── kelasControllers.js
│   │   ├── tahunControllers.js
│   │   ├── jadwalControllers.js
│   │   ├── mapelControllers.js
│   │   ├── orangtuaControllers.js
│   │   ├── usersControllers.js
│   │   ├── roleControllers.js
│   │   ├── rfidControllers.js
│   │   ├── absensiSiswaControllers.js
│   │   ├── detailAbsensiControllers.js
│   │   ├── finalAbsensiControllers.js
│   │   ├── rekapControllers.js
│   │   ├── exportControllers.js
│   │   ├── statusRequestControllers.js
│   │   └── kenaikanKelasControllers.js
│   ├── middleware/              # Middleware global
│   │   ├── auth.js             # verifyToken, checkRole, requirePokja
│   │   └── upload.js           # Multer upload handler
│   ├── routes/                 # Routing modular
│   │   ├── index.js
│   │   ├── authRoutes.js
│   │   ├── siswaRoutes.js
│   │   ├── guruRoutes.js
│   │   ├── kelasRoutes.js
│   │   ├── tahunRoutes.js
│   │   ├── jadwalRoutes.js
│   │   ├── mapelRoutes.js
│   │   ├── orangTuaRoutes.js
│   │   ├── usersRoutes.js
│   │   ├── roleRoutes.js
│   │   ├── rfidRoutes.js
│   │   ├── absensiSiswaRoutes.js
│   │   ├── detailAbsensiRoutes.js
│   │   ├── finalAbsensiRoutes.js
│   │   ├── rekapRoutes.js
│   │   ├── exportRoutes.js
│   │   ├── statusRequestRoutes.js
│   │   └── kenaikanKelasRoutes.js
│   ├── services/               # Service layer
│   │   ├── telegramServices.js
│   │   └── finalAbsensi.js
│   ├── cron/                   # Cron job scheduler
│   │   ├── tahunAjaran.js
│   │   └── autoApproveStatus.js
│   ├── queues/                  # BullMQ queue definitions
│   │   ├── tapInQueue.js
│   │   └── tapOutQueue.js
│   ├── workers/                 # BullMQ background workers
│   │   ├── tapInWorker.js
│   │   └── tapOutWorker.js
│   ├── helper/                  # Fungsi bantu (utils)
│   │   ├── autoCreateTahunAjaran.js
│   │   ├── dateUtils.js
│   │   ├── daysUtils.js
│   │   ├── helperFinalAbsensi.js
│   │   ├── reqStatusAbsensi.js
│   │   └── indexUtils.js
│   └── config/                  # Konfigurasi (Prisma client, Redis, dll)
│       ├── prisma.js
│       └── redis.js
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
PORT=3000
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

YSBO_API_BASE_URL="https://ysbmo.example.com/api/v1"
URL_FRONTEND="http://localhost:4321"
MOODLE_BASE_URL="https://moodle.example.com"

SUPER_ADMIN_USERNAME="your_super_admin_username"
SUPER_ADMIN_PASSWORD="your_super_admin_password"
```

### 4. Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Jalankan migrasi database
npx prisma migrate dev --name init

# Seed data awal
npm run seed

# CATATAN: seed saat ini menghapus SEMUA data transaksi & master,
# lalu membuat ulang satu akun SUPER_ADMIN dari variabel .env.
```

### 5. Jalankan Redis

```bash
# Linux/WSL
sudo service redis-server start

# Docker
docker run -p 6379:6379 redis:7
```

### 6. Jalankan Aplikasi

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
| Export | ExcelJS |
| Upload | Multer |
| HTTP Client | Axios |
| Queue | BullMQ |
| Cache/Message Broker | Redis |

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
| `ADMIN` | Manajemen data siswa, guru, kelas, jadwal |
| `GURU` | Input absensi per jadwal pelajaran |
| `WALAS` | Wali kelas — input & pratinjau absensi per kelas |
| `KESISWAAN` | Rekap absensi, finalisasi, & ekspor (wajib Pokja) |
| `SISWA` | Melihat profil, jadwal, dan rekap absensi pribadi |

---

## 📡 API Endpoints

> Base URL: `http://localhost:3000/api/v1`
> 🔒 = Memerlukan header `Authorization: Bearer <token>`

---

### 🔑 Auth

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| `POST` | `/auth/login` | ❌ | Login staf/guru wajib melalui YBSMO; mengembalikan `accessToken`, `ysboToken`, dan data user |
| `POST` | `/auth/moodle-login` | ❌ | Login siswa via Moodle, mengembalikan JWT + data siswa |
| `POST` | `/auth/logout` | 🔒 | Logout & invalidasi sesi |
| `GET` | `/auth/me` | 🔒 | Ambil data user yang sedang login (termasuk relasi `siswa`, `kelas`, `rfid` bila ada) |

---

### 👤 Users

| Method | Endpoint | Auth | Role | Deskripsi |
|--------|----------|------|------|-----------|
| `GET` | `/users` | 🔒 | Authenticated | Ambil semua data user |
| `GET` | `/users/:id` | 🔒 | Authenticated | Ambil detail user |
| `PUT` | `/users/:id` | 🔒 | `SUPER_ADMIN` | Update data user |
| `DELETE` | `/users/:id` | 🔒 | `SUPER_ADMIN` | Hapus user |

---

### 🎭 Role

| Method | Endpoint | Auth | Role | Deskripsi |
|--------|----------|------|------|-----------|
| `GET` | `/role` | 🔒 | `SUPER_ADMIN` | Ambil semua role |
| `GET` | `/role/:id` | 🔒 | `SUPER_ADMIN` | Ambil detail role |
| `POST` | `/role` | 🔒 | `SUPER_ADMIN` | Tambah role baru |
| `PUT` | `/role/:id` | 🔒 | `SUPER_ADMIN` | Update role |
| `DELETE` | `/role/:id` | 🔒 | `SUPER_ADMIN` | Hapus role |

---

### 👨‍🏫 Guru

| Method | Endpoint | Auth | Role | Deskripsi |
|--------|----------|------|------|-----------|
| `GET` | `/guru` | 🔒 | Authenticated | Ambil semua data guru |
| `GET` | `/guru/walas` | 🔒 | Authenticated | Ambil guru yang menjadi wali kelas |
| `GET` | `/guru/:id` | 🔒 | Authenticated | Ambil detail guru |
| `POST` | `/guru` | 🔒 | `ADMIN`, `SUPER_ADMIN` | Tambah data guru baru |
| `PUT` | `/guru/:id` | 🔒 | `ADMIN`, `SUPER_ADMIN` | Update data guru |
| `DELETE` | `/guru/:id` | 🔒 | `ADMIN`, `SUPER_ADMIN` | Hapus data guru |

---

### 👨‍👩‍👦 Orang Tua

| Method | Endpoint | Auth | Role | Deskripsi |
|--------|----------|------|------|-----------|
| `GET` | `/orang-tua` | 🔒 | Authenticated | Ambil semua data orang tua |
| `GET` | `/orang-tua/:id` | 🔒 | Authenticated | Ambil detail orang tua |
| `POST` | `/orang-tua` | 🔒 | `ADMIN`, `SUPER_ADMIN` | Tambah data orang tua |
| `PUT` | `/orang-tua/:id` | 🔒 | `ADMIN`, `SUPER_ADMIN` | Update data orang tua |
| `DELETE` | `/orang-tua/:id` | 🔒 | `ADMIN`, `SUPER_ADMIN` | Hapus data orang tua |

---

### 🎒 Siswa

| Method | Endpoint | Auth | Role | Deskripsi |
|--------|----------|------|------|-----------|
| `GET` | `/siswa` | 🔒 | Authenticated | Ambil semua data siswa |
| `GET` | `/siswa/:id` | 🔒 | Authenticated | Ambil detail siswa |
| `POST` | `/siswa` | 🔒 | `ADMIN`, `SUPER_ADMIN` | Tambah siswa baru |
| `PUT` | `/siswa/:id` | 🔒 | `ADMIN`, `SUPER_ADMIN` | Update data siswa |
| `DELETE` | `/siswa/:id` | 🔒 | `ADMIN`, `SUPER_ADMIN` | Hapus data siswa |
| `POST` | `/siswa/import` | 🔒 | `ADMIN`, `SUPER_ADMIN` | Import massal siswa via file Excel |

---

### 🏫 Kelas

| Method | Endpoint | Auth | Role | Deskripsi |
|--------|----------|------|------|-----------|
| `GET` | `/kelas` | 🔒 | Authenticated | Ambil semua kelas |
| `GET` | `/kelas/:id` | 🔒 | Authenticated | Ambil detail kelas |
| `POST` | `/kelas` | 🔒 | `ADMIN`, `SUPER_ADMIN` | Tambah kelas baru |
| `PUT` | `/kelas/:id` | 🔒 | `ADMIN`, `SUPER_ADMIN` | Update data kelas |
| `DELETE` | `/kelas/:id` | 🔒 | `ADMIN`, `SUPER_ADMIN` | Hapus kelas |
| `PATCH` | `/kelas/:id/assign-walas` | 🔒 | `ADMIN`, `SUPER_ADMIN` | Assign wali kelas |

---

### 📅 Tahun Ajaran

| Method | Endpoint | Auth | Role | Deskripsi |
|--------|----------|------|------|-----------|
| `GET` | `/tahun-ajaran` | 🔒 | Authenticated | Ambil semua tahun ajaran |
| `GET` | `/tahun-ajaran/:id` | 🔒 | Authenticated | Ambil detail tahun ajaran |
| `POST` | `/tahun-ajaran` | 🔒 | `SUPER_ADMIN` | Tambah tahun ajaran baru |
| `PUT` | `/tahun-ajaran/:id` | 🔒 | `SUPER_ADMIN` | Update tahun ajaran |
| `DELETE` | `/tahun-ajaran/:id` | 🔒 | `SUPER_ADMIN` | Hapus tahun ajaran |

---

### 🎓 Kenaikan Kelas

| Method | Endpoint | Auth | Role | Deskripsi |
|--------|----------|------|------|-----------|
| `GET` | `/kenaikan-kelas/preview` | 🔒 | `ADMIN`, `SUPER_ADMIN` | Preview keputusan kenaikan per kelas & siswa (filter: `tahun_ajaran_id`, `kelas_id`) |
| `POST` | `/kenaikan-kelas/submit` | 🔒 | `ADMIN`, `SUPER_ADMIN` | Submit/bulk-upsert keputusan kenaikan kelas (body: `tahun_ajaran_id`, `keputusan[]`) |

---

### 📚 Mata Pelajaran

| Method | Endpoint | Auth | Role | Deskripsi |
|--------|----------|------|------|-----------|
| `GET` | `/mata-pelajaran` | 🔒 | Authenticated | Ambil semua mata pelajaran |
| `GET` | `/mata-pelajaran/:id` | 🔒 | Authenticated | Ambil detail mata pelajaran |
| `POST` | `/mata-pelajaran` | 🔒 | `SUPER_ADMIN` | Tambah mata pelajaran baru |
| `PUT` | `/mata-pelajaran/:id` | 🔒 | `SUPER_ADMIN` | Update mata pelajaran |
| `DELETE` | `/mata-pelajaran/:id` | 🔒 | `SUPER_ADMIN` | Hapus mata pelajaran |

---

### 🗓️ Jadwal

| Method | Endpoint | Auth | Role | Deskripsi |
|--------|----------|------|------|-----------|
| `GET` | `/jadwal` | 🔒 | Authenticated | Ambil semua jadwal pelajaran |
| `POST` | `/jadwal` | 🔒 | `ADMIN`, `SUPER_ADMIN` | Tambah jadwal pelajaran |
| `POST` | `/jadwal/import` | 🔒 | `ADMIN`, `SUPER_ADMIN` | Import jadwal via Excel |
| `PUT` | `/jadwal/:id` | 🔒 | `ADMIN`, `SUPER_ADMIN` | Update jadwal |
| `DELETE` | `/jadwal/:id` | 🔒 | `ADMIN`, `SUPER_ADMIN` | Hapus jadwal |

> **Format `jam_mulai` / `jam_selesai`:** string `"HH:MM"` (mis. `"08:00"`). Nilai divalidasi lewat regex `HH:MM` dan di‑zero‑pad otomatis, sehingga komparasi bentrok jadwal (lexicographic) selaras dengan urutan kronologis.

---

### 📇 RFID

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| `GET` | `/rfid` | 🔒 | Ambil semua data RFID |
| `GET` | `/rfid/load-Rfid` | 🔒 | Load semua RFID (aktif) |
| `GET` | `/rfid/:id` | 🔒 | Ambil detail RFID |
| `POST` | `/rfid` | 🔒 | Tambah RFID baru |
| `POST` | `/rfid/import` | 🔒 | Import massal RFID via Excel |
| `PUT` | `/rfid/:id` | 🔒 | Update data RFID |
| `PATCH` | `/rfid/:id` | 🔒 | Patch data RFID |
| `DELETE` | `/rfid/:id` | 🔒 | Hapus RFID |

---

### ✅ Absensi Siswa

| Method | Endpoint | Auth | Role | Deskripsi |
|--------|----------|------|------|-----------|
| `POST` | `/absensi-siswa/tap-in` | ❌ | — | Catat absensi masuk via RFID (diproses async via BullMQ) |
| `POST` | `/absensi-siswa/tap-out` | ❌ | — | Catat absensi keluar via RFID (diproses async via BullMQ) |
| `GET` | `/absensi-siswa` | 🔒 | Authenticated | Ambil semua data absensi (filter: `siswa_id`, `kelas_id`, `tanggal`, `status_tapin`) |
| `GET` | `/absensi-siswa/laporan/harian` | 🔒 | Authenticated | Laporan absensi harian (filter: `tanggal`, `kelas_id`, `siswa_id`) |
| `GET` | `/absensi-siswa/laporan/range` | 🔒 | Authenticated | Laporan absensi rentang tanggal (filter: `tanggal_mulai`, `tanggal_akhir`, `kelas_id`) |
| `GET` | `/absensi-siswa/:id` | 🔒 | Authenticated | Ambil detail absensi |
| `PUT` | `/absensi-siswa/:id` | 🔒 | Authenticated | Update data absensi |
| `DELETE` | `/absensi-siswa/:id` | 🔒 | Authenticated | Hapus data absensi |
| `GET` | `/absensi-siswa/rekap-saya` | 🔒 | `SISWA` | Rekap absensi pribadi siswa yang login (berdasarkan `siswa_id` dari JWT) |

---

### 📝 Detail Absensi

| Method | Endpoint | Auth | Role | Deskripsi |
|--------|----------|------|------|-----------|
| `POST` | `/detail-absensi/absensi-guru` | 🔒 | `GURU` | Input absensi oleh guru per jadwal |
| `PUT` | `/detail-absensi/update-status` | 🔒 | `GURU` | Update status absensi manual |
| `DELETE` | `/detail-absensi/:id` | 🔒 | `GURU` | Hapus detail absensi |
| `GET` | `/detail-absensi/pratinjau-walas` | 🔒 | `WALAS` | Pratinjau absensi untuk walas |
| `POST` | `/detail-absensi/absensi-walas` | 🔒 | `WALAS` | Input absensi manual oleh walas |

---

### 🔒 Final Absensi

| Method | Endpoint | Auth | Role | Deskripsi |
|--------|----------|------|------|-----------|
| `GET` | `/final-absensi/filters` | 🔒 | Ambil filter metadata untuk export |
| `GET` | `/final-absensi` | 🔒 | Ambil semua data final absensi |
| `POST` | `/final-absensi/siswa` | 🔒 | Finalisasi 1 siswa secara manual |
| `POST` | `/final-absensi/kelas/:kelas_id` | 🔒 | Finalisasi seluruh siswa dalam 1 kelas |
| `POST` | `/final-absensi/semua-kelas` | 🔒 | Finalisasi semua kelas aktif |
| `POST` | `/final-absensi/all` | 🔒 | `ADMIN` | Finalisasi seluruh siswa pada tanggal tertentu (siswa belum tap-in masuk sebagai Alpha) |

---

### 📊 Rekapitulasi

| Method | Endpoint | Auth | Role | Deskripsi |
|--------|----------|------|------|-----------|
| `GET` | `/rekap/rekap-absensi` | 🔒 | `KESISWAAN` + Pokja | Rekap absensi semua kelas |
| `GET` | `/rekap/rekap-siswa` | 🔒 | `KESISWAAN` + Pokja | Rekap absensi per siswa |
| `GET` | `/rekap/rekap-siswa/yearly` | 🔒 | `KESISWAAN` + Pokja | Rekap absensi siswa tahunan |
| `GET` | `/rekap/rekap-siswa/monthly` | 🔒 | `KESISWAAN` + Pokja | Rekap absensi siswa bulanan |
| `GET` | `/rekap/rekap-siswa/weekly` | 🔒 | `KESISWAAN` + Pokja | Rekap absensi siswa mingguan |
| `GET` | `/rekap/rekap-kelas` | 🔒 | `KESISWAAN` + Pokja | Rekap absensi per kelas |
| `GET` | `/rekap/rekap-kelas/yearly` | 🔒 | `KESISWAAN` + Pokja | Rekap absensi kelas tahunan |
| `GET` | `/rekap/rekap-kelas/monthly` | 🔒 | `KESISWAAN` + Pokja | Rekap absensi kelas bulanan |
| `GET` | `/rekap/rekap-kelas/semester` | 🔒 | `KESISWAAN` + Pokja | Rekap absensi kelas semester |

---

### 📥 Export

| Method | Endpoint | Auth | Role | Deskripsi |
|--------|----------|------|------|-----------|
| `GET` | `/export/rekap/siswa/excel` | 🔒 | `KESISWAAN` + Pokja | Export rekap siswa ke Excel |
| `GET` | `/export/rekap/kelas/harian/excel` | 🔒 | `KESISWAAN` + Pokja | Export rekap kelas harian ke Excel |
| `GET` | `/export/rekap/kelas/bulanan/excel` | 🔒 | `KESISWAAN` + Pokja | Export rekap kelas bulanan ke Excel |
| `GET` | `/export/rekap/kelas/semester/excel` | 🔒 | `KESISWAAN` + Pokja | Export rekap kelas semester ke Excel |
| `GET` | `/export/rekap/kelas/tahunan/excel` | 🔒 | `KESISWAAN` + Pokja | Export rekap kelas tahunan ke Excel |

---

### 📬 Status Request

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| `POST` | `/status-request` | 🔒 | Buat permintaan perubahan status absensi |
| `GET` | `/status-request/pending` | 🔒 | Ambil semua request yang pending |
| `PATCH` | `/status-request/:id/respond` | 🔒 | Setujui/tolak permintaan |

---

## � Environment Variables Reference

| Variabel | Tipe | Deskripsi | Contoh |
|----------|------|-----------|--------|
| `DATABASE_URL` | String | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/absensi_sekolah` |
| `JWT_SECRET` | String | Secret key untuk JWT signing | `your_super_secret_key_here` |
| `TELEGRAM_BOT_TOKEN` | String | Token dari Telegram Bot API | `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11` |
| `TELEGRAM_GROUP_ID` | String | ID grup Telegram untuk notifikasi | `-1001234567890` |
| `PORT` | Number | Port server Express | `3000` |
| `REDIS_HOST` | String | Host Redis | `127.0.0.1` |
| `REDIS_PORT` | Number | Port Redis | `6379` |
| `NODE_ENV` | String | Environment (development/production) | `development` |

---

## 🐛 Troubleshooting

### Error: `ECONNREFUSED` (Database Connection Failed)
- Pastikan PostgreSQL berjalan
- Cek `DATABASE_URL` di `.env` sesuai dengan kredensial lokal
- Jalankan `npx prisma db push` untuk setup schema

### Error: Redis Connection Failed
- Pastikan Redis berjalan di host & port yang benar
- Linux/WSL: `sudo service redis-server start`
- Docker: `docker run -p 6379:6379 redis:7`

### Queue/Worker Error
- Pastikan Redis sudah running
- Cek BullMQ dan ioredis dependency terinstall: `npm install`
- Review log di worker untuk detail error

### JWT Token Invalid/Expired
- Pastikan `JWT_SECRET` sama di semua instance
- Token default expired dalam 24 jam, buat token baru dengan login
- Clear browser cache/cookies

### RFID Tap-In/Tap-Out Tidak Terproses
- Cek Redis connection
- Cek worker process berjalan: `pm2 logs tap-in-worker`
- Review failed jobs di BullMQ dashboard

### Import Data Excel Gagal
- Pastikan format Excel sesuai dengan template yang disediakan
- Cek kolom headers
- Lihat log upload di server untuk detail error

---

## 📦 Deployment

### Production Build
```bash
# Install dependencies
npm install --production

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Start server
npm start
```

### Using PM2
```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start app.js --name "absensi-sekolah"

# Start with ecosystem config
pm2 start ecosystem.config.js

# View logs
pm2 logs absensi-sekolah
```

### Docker (Optional)
```bash
# Build image
docker build -t absensi-sekolah .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e REDIS_HOST="redis" \
  absensi-sekolah
```

---

## 🤝 Contributing

Kontribusi sangat diterima! Untuk berkontribusi:

1. Fork repository ini
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buka Pull Request

**Guidelines:**
- Follow kode style yang sudah ada
- Test fitur baru sebelum PR
- Update dokumentasi jika diperlukan
- Satu PR untuk satu fitur/bugfix

---

## 📄 License

Project ini dilisensikan di bawah **MIT License**. Lihat file [LICENSE](LICENSE) untuk detail lebih lanjut.

---

## 📞 Support & Contact

Untuk pertanyaan, bug report, atau saran:
- 📧 Email: [contact info]
- 🐙 GitHub Issues: [Submit Issue](https://github.com/Dipsii1/absensi_sekolah/issues)
- 💬 Telegram: [Hubungi Admin]

---

## 📝 Changelog

### v0.0.3 (Latest)
- ✅ **Fitur Kenaikan Kelas**: atur status naik/tinggal/lulus per siswa per tahun ajaran.
  - Endpoint `GET /kenaikan-kelas/preview` & `POST /kenaikan-kelas/submit` (role ADMIN/SUPER_ADMIN).
  - Schema baru: enum `KeputusanKenaikan` (Naik/Tinggal/Lulus), model `KenaikanKelas` dengan unique constraint `[siswa_id, tahun_ajaran_id]`.
  - `autoCreateTahunAjaran` rewrite: carry-over kelas menghormati keputusan per siswa; kelas XII diproses (default Lulus) bukan dilewati.
  - Cron `tahunAjaran` sekarang di-load di `app.js` (sebelumnya tidak ter-load → tidak pernah berjalan).
  - `GET /tahun-ajaran` tidak lagi memicu `autoCreateTahunAjaran()` (side-effect dipindah ke cron).
  - `createTahunAjaran` kini non-aktifkan tahun aktif lain sebelum create (mencegah multiple active).
- 🐛 **Bugfix**: regex `naipkanTingkat` — "XII" match `/^XI/i` menghasilkan "XIII"; sekarang XII dikembalikan apa adanya.
- 🐛 **Bugfix**: casing Prisma Client (`prisma.Tahun/Kelas/Siswa` → `prisma.tahun/kelas/siswa`) di semua file.

### v0.0.0 (Current)
- ✅ Core features: Auth, Users, Siswa, Guru, Kelas
- ✅ RFID attendance system dengan queue processing
- ✅ Telegram notifications
- ✅ Excel export functionality
- ✅ Role-based access control
- ✅ Final attendance finalization
- ✅ Status request workflow

### v0.0.1 (Latest)
- ✅ Login siswa via Moodle (`/auth/moodle-login`)
- ✅ Endpoint profil siswa di `/auth/me` (relasi `siswa`, `kelas`, `kelas.walas`, `rfid`)
- ✅ Filter `siswa_id` di `/absensi-siswa/laporan/harian`
- ✅ Endpoint baru `/absensi-siswa/rekap-saya` khusus role SISWA (membaca dari `FinalAbsensi` berdasarkan JWT)

### v0.0.2
- ✅ **Skema `jadwal`**: kolom `jam_mulai` / `jam_selesai` dikonversi dari `TIME` ke `VARCHAR(5)` bertipe string `"HH:MM"` — lebih mudah dipelihara dan konsisten dengan lapisan API (validasi `HH:MM`).
  - Range query jadwal aktif (`getActiveJadwalGuru`) & overlap deteksi bentrok jadwal kini pakai komparasi string (zero-padded → leksikografi = kronologi).
  - Helper `formatJam()` tangggu input string; helper `nowAsDbTime` (mati) diganti `nowWibTimeString()`.
- 🐛 **Bugfix `auto-tapOut`**: filter `jadwal.deleted_at` dihapus (kolom tak ada di model → sebelumnya bikin auto tap-out selalu gagal diam‑diam).
- 🐛 **Bugfix cron**: `autoFinalAbsensi` digerakkan `20:05` (dulu `20:00` bentrokan dengan `auto-tapOut` pukul `20:00`), agar finalisasi berjalan setelah tap‑out terisi.
- 🧹 Seeder & test di‑update ke string `HH:MM`.

---

## 👤 Developer & Team

**Primary Developer:** Dipsii1  
**GitHub:** [@Dipsii1](https://github.com/Dipsii1)

---

**Last Updated:** 7 September 2026  
**Status:** Active Development 🚀