# Absensi Sekolah (RFID) — Dokumentasi

> Draft dibuat tanpa akses langsung ke repo (GitHub memblokir akses otomatis).
> Bagian bertanda `TODO` perlu dicocokkan dengan kode asli.

## 1. Ringkasan

Sistem absensi siswa berbasis RFID untuk sekolah. Siswa tap kartu di scanner (frontend Astro), backend memvalidasi terhadap jadwal pelajaran dan mencatat status kehadiran.

## 2. Tech Stack

| Layer | Teknologi |
|---|---|
| Backend | Node.js, Express, Prisma ORM, PostgreSQL |
| Queue | BullMQ (+ Redis) untuk worker tap-in / tap-out |
| Frontend scanner | Astro (`Rfidscanner.astro`), cache RFID di `localStorage` |
| Bahasa | TypeScript (sedang migrasi dari JavaScript) |
| Import data | Excel (import RFID siswa) |

## 3. Arsitektur

```
[Kartu RFID] -> [Rfidscanner.astro]
                    |  POST /api/v1/absensi-siswa/tap-in
                    |  (409 -> fallback POST .../tap-out)
                    v
              [Express Controller] -> validasi -> [BullMQ Queue]
                                                      |
                                    [Worker tap-in / tap-out]
                                                      |
                                               [Prisma -> PostgreSQL]
```

Struktur folder yang disarankan (`TODO`: sesuaikan):

```
src/
  config/          # env, prisma client, redis, bullmq
  modules/
    absensi-siswa/ # routes, controller, service, schema (zod), types
    jadwal/
    siswa/
    rfid-import/
  queues/          # definisi queue
  workers/         # tap-in.worker.ts, tap-out.worker.ts
  middlewares/
  utils/           # waktu.ts (helper WIB), response.ts, errors.ts
  types/
  app.ts
  server.ts
prisma/
  schema.prisma
```

## 4. Endpoint

Base URL: `/api/v1`

### POST `/absensi-siswa/tap-in`

Request:
```json
{ "rfid": "string" }
```

| Status | Arti |
|---|---|
| 200/201 | Tap-in tercatat (`Tepat_Waktu` / `Terlambat`) |
| 400 | RFID tidak valid / tidak ada jadwal hari ini |
| 403 | Tap-in ditolak (lewat 15 menit dari `jam_mulai`) |
| 404 | RFID tidak terdaftar |
| 409 | Siswa sudah tap-in hari ini |

### POST `/absensi-siswa/tap-out`

Request:
```json
{ "rfid": "string" }
```

| Status | Arti |
|---|---|
| 200 | Tap-out tercatat |
| 400 | Belum tap-in hari ini |
| 403 | Ditolak: belum melewati `jam_selesai` jadwal terakhir |
| 404 | RFID tidak terdaftar |

`TODO`: tambahkan endpoint lain (jadwal, siswa, laporan harian, import Excel) sesuai route yang ada.

## 5. Aturan Bisnis Absensi

### Tap-in
Acuan: jadwal pertama siswa hari itu (`jam_mulai`).

| Waktu tap | Hasil |
|---|---|
| ≤ `jam_mulai` | `Tepat_Waktu` |
| > `jam_mulai` s.d. 15 menit | `Terlambat` |
| > 15 menit setelah `jam_mulai` | Ditolak |
| Sudah tap-in hari ini | 409, tidak dicatat ulang |

Tap-in divalidasi terhadap jadwal kelas siswa. Tidak ada jadwal = ditolak.

### Tap-out
- Wajib sudah tap-in hari itu.
- Hanya valid pada/setelah `jam_selesai` jadwal terakhir hari itu.
- Tap-out sebelum itu **ditolak**, tidak dicatat sebagai pulang awal.
- Target: tap-out otomatis saat jam pelajaran terakhir selesai (tanpa scan kedua).

### Finalisasi harian
- Laporan harian punya flag `is_finalized`.
- Hari tanpa detail jadwal/pelajaran tetap harus bisa difinalisasi.

## 6. Aturan Waktu (penting)

- `jadwal.jam_mulai` dan `jam_selesai` bertipe **String** (`"HH:mm"`), dianggap **WIB apa adanya**.
- **Tidak ada pergeseran jam** (tidak ada `-7 jam`) di `createTimeDate` maupun `formatJam`.
- Semua perbandingan "sekarang vs jadwal" dilakukan dengan helper tunggal (mis. `wibTodayAt("HH:mm")`) dalam zona `Asia/Jakarta`.
- Dilarang membandingkan Date yang sudah digeser WIB dengan instan UTC asli.

## 7. Model Data (ringkas, `TODO` sesuaikan)

- `Siswa` — data siswa, `rfid` unik, relasi ke kelas
- `Kelas`
- `Jadwal` — `hari`, `jam_mulai: String`, `jam_selesai: String`, relasi kelas/mapel
- `AbsensiSiswa` — tanggal, `jam_masuk`, `jam_keluar`, `status` (`Tepat_Waktu | Terlambat | ...`), `is_finalized`

## 8. Menjalankan Proyek

```bash
npm install
cp .env.example .env      # isi DATABASE_URL, REDIS_URL, PORT
npx prisma migrate dev
npm run dev               # ts-node-dev / tsx
npm run build && npm start
```

Worker BullMQ dijalankan sebagai proses terpisah atau dari `server.ts` (`TODO`: sesuaikan).

## 9. Environment Variables

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | Koneksi PostgreSQL |
| `REDIS_URL` | Koneksi Redis untuk BullMQ |
| `PORT` | Port server |
| `TZ` | `Asia/Jakarta` |
| `NODE_ENV` | `development` / `production` |

## 10. Status Migrasi TypeScript

Lihat `docs/RULES.md` bagian "Migrasi TypeScript" untuk urutan dan aturan.