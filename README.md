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
  - Login dengan JWT, password di-hash menggunakan bcrypt.
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
│   │   └── statusRequestControllers.js
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
│   │   └── statusRequestRoutes.js
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

---

## 📡 API Endpoints

> Base URL: `http://localhost:3000/api/v1`
> 🔒 = Memerlukan header `Authorization: Bearer <token>`

---

### 🔑 Auth

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| `POST` | `/auth/login` | ❌ | Login user, mengembalikan JWT token |
| `POST` | `/auth/logout` | 🔒 | Logout & invalidasi sesi |
| `GET` | `/auth/me` | 🔒 | Ambil data user yang sedang login |

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

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| `POST` | `/absensi-siswa/tap-in` | ❌ | Catat absensi masuk via RFID (diproses async via BullMQ) |
| `POST` | `/absensi-siswa/tap-out` | ❌ | Catat absensi keluar via RFID (diproses async via BullMQ) |
| `GET` | `/absensi-siswa` | 🔒 | Ambil semua data absensi |
| `GET` | `/absensi-siswa/laporan/harian` | 🔒 | Laporan absensi harian |
| `GET` | `/absensi-siswa/laporan/range` | 🔒 | Laporan absensi rentang tanggal |
| `GET` | `/absensi-siswa/:id` | 🔒 | Ambil detail absensi |
| `PUT` | `/absensi-siswa/:id` | 🔒 | Update data absensi |
| `DELETE` | `/absensi-siswa/:id` | 🔒 | Hapus data absensi |

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

### v0.0.0 (Current)
- ✅ Core features: Auth, Users, Siswa, Guru, Kelas
- ✅ RFID attendance system dengan queue processing
- ✅ Telegram notifications
- ✅ Excel export functionality
- ✅ Role-based access control
- ✅ Final attendance finalization
- ✅ Status request workflow

---

## 👤 Developer & Team

**Primary Developer:** Dipsii1  
**GitHub:** [@Dipsii1](https://github.com/Dipsii1)

---

**Last Updated:** 30 Agustus 2026  
**Status:** Active Development 🚀