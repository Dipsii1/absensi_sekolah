# AGENTS.md — Absensi Sekolah RFID System

> Dokumen ini adalah instruksi operasional untuk AI agent yang mengembangkan project ini.
> Version-controlled. Setiap perubahan behavior harus diikuti update dokumen ini.
> Item bertanda **(verifikasi)** disusun dari konteks proyek dan perlu dicocokkan dengan kode asli.

---

## 1. Project Overview

Sistem absensi siswa **berbasis RFID** untuk sekolah. Siswa tap kartu di scanner (halaman Astro `Rfidscanner.astro`), backend memvalidasi terhadap **jadwal pelajaran kelas** lalu mencatat status kehadiran (`Tepat_Waktu` / `Terlambat`) dan jam pulang. Tap-in dan tap-out ditulis secara asinkron lewat **BullMQ worker** agar API tetap cepat saat banyak siswa tap bersamaan. Data RFID siswa dapat diimpor massal via Excel. Laporan harian punya mekanisme **finalisasi** (`is_finalized`).

**Status:** migrasi backend dari JavaScript ke **TypeScript** sedang berjalan.

---

## 2. Tech Stack (Keputusan Final)

```
Backend:          Node.js + Express + TypeScript (strict)
ORM / DB:         Prisma + PostgreSQL
Queue:            BullMQ + Redis
Validation:       Zod (z.infer sebagai sumber tipe)
Frontend scanner: Astro (Rfidscanner.astro), cache RFID di localStorage
Import:           Excel (import RFID siswa)
Runtime TZ:       Asia/Jakarta (TZ env)
Dev runner:       tsx atau ts-node-dev (verifikasi)
Deploy:           Docker (API dan worker sebagai proses terpisah)
```

### Keputusan Arsitektur
- **Jam jadwal = String `"HH:mm"`** (bukan `@db.Time`): menghindari konversi timezone Prisma/PostgreSQL yang menggeser jam.
- **Satu helper waktu WIB** (`utils/waktu.ts`): semua perbandingan "sekarang vs jadwal" lewat helper ini.
- **Tulis lewat BullMQ**: controller hanya validasi + enqueue, worker yang menulis ke DB.
- **Satu `PrismaClient`** (`config/prisma.ts`): mencegah kehabisan koneksi.
- **Modular, layered** (routes → controller → service → prisma). Tidak perlu hexagonal penuh.

---

## 3. Repo Structure

```
repo/
├── AGENTS.md
├── .env.example
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── DOCUMENTATION.md
│   ├── RULES.md
│   └── CONTRIBUTING.md
├── prisma/
│   └── schema.prisma
└── src/
    ├── config/          # env.ts, prisma.ts, redis.ts
    ├── modules/
    │   ├── absensi-siswa/   # routes, controller, service, schema (zod)
    │   ├── jadwal/
    │   ├── siswa/
    │   └── rfid-import/
    ├── queues/          # absensi.queue.ts
    ├── workers/         # tap-in.worker.ts, tap-out.worker.ts
    ├── middlewares/     # error, validate
    ├── utils/           # waktu.ts, response.ts, app-error.ts
    ├── types/           # untuk interface
    ├── app.ts
    └── server.ts
```

**Aturan dependency:** `routes → controller → service → prisma/queue → utils/config`. Tidak boleh terbalik. Audit dengan `madge --circular`.

---

## 4. Shared Types (Zod)

- Schema Zod per module (`*.schema.ts`) = single source of truth untuk body/params/query.
- Tipe request diambil dari `z.infer`, bukan ditulis ulang.
- **Jangan expose entity Prisma langsung sebagai response API**; map ke shape response eksplisit.
- Parse di boundary (controller). Service menerima data yang sudah tervalidasi.
- Data job BullMQ wajib punya interface:
  ```ts
  interface TapJobData { rfid: string; waktu: string }
  ```
- Status absensi memakai enum/union dari Prisma, bukan string literal bebas.
- Pakai `import type` untuk import yang hanya tipe.

---

## 5. Layer Architecture

```
src/modules/<feature>/
├── <feature>.routes.ts       # mapping URL → controller, pasang middleware
├── <feature>.controller.ts   # parse + validasi Zod, panggil service, kirim response
├── <feature>.service.ts      # logika bisnis, aturan absensi, aturan waktu
└── <feature>.schema.ts       # Zod schema + tipe
```

- Controller **tidak** berisi logika bisnis.
- Service **tidak** tahu `req`/`res`.
- Tulis tap-in/tap-out ke DB hanya di worker (via service), bukan di controller.
- Error: `AppError(statusCode, message)` + satu error middleware. Dilarang `catch` lalu diam.

---

## 6. Aturan Bisnis Absensi (JANGAN DILANGGAR)

### 6.1 Tap-in
Acuan: `jam_mulai` jadwal pertama siswa hari itu.

| Waktu tap | Hasil |
|---|---|
| ≤ `jam_mulai` | `Tepat_Waktu` |
| > `jam_mulai` s.d. 15 menit | `Terlambat` |
| > 15 menit setelah `jam_mulai` | Ditolak (403) |
| Sudah tap-in hari ini | 409, tidak dicatat ulang |
| RFID tidak terdaftar | 404 |
| Tidak ada jadwal hari ini | 400 |

### 6.2 Tap-out
- Wajib sudah tap-in hari itu (jika belum → 400).
- Hanya valid pada/setelah `jam_selesai` jadwal **terakhir** hari itu.
- Sebelum itu **ditolak** (403), bukan dicatat sebagai pulang awal.
- Target: tap-out otomatis saat jam pelajaran terakhir selesai tanpa scan kedua.

### 6.3 Alur scanner
1. Scanner kirim `POST /api/v1/absensi-siswa/tap-in`.
2. Jika `409` → scanner fallback ke `POST /api/v1/absensi-siswa/tap-out`.
3. Frontend menampilkan hasil sesuai status code.

### 6.4 Finalisasi harian
- Laporan harian punya flag `is_finalized`.
- Hari **tanpa detail jadwal/pelajaran tetap harus bisa difinalisasi**.
- Data yang sudah final tidak boleh diubah oleh proses tap.

---

## 7. Aturan Waktu (WAJIB)

1. `jadwal.jam_mulai` / `jam_selesai` = String `"HH:mm"`, dianggap **WIB apa adanya**.
2. **Dilarang menggeser jam** (`-7` / `+7`) di `createTimeDate` maupun `formatJam`.
3. Zona acuan `Asia/Jakarta`. Satu fungsi tunggal membangun "hari ini jam HH:mm WIB" (mis. `wibTodayAt`).
4. Dilarang membandingkan Date yang sudah di-shift WIB dengan instan UTC mentah (penyebab bug status selalu "Terlambat").
5. Urutan jadwal dan deteksi bentrok dihitung sebagai **menit sejak 00:00**, bukan lewat Date.
6. Tidak boleh ada helper waktu baru di luar `utils/waktu.ts`.

---

## 8. API Contract

Base URL: `/api/v1`

| Method | Path | Fungsi |
|---|---|---|
| POST | `/absensi-siswa/tap-in` | Catat tap-in `{ rfid }` |
| POST | `/absensi-siswa/tap-out` | Catat tap-out `{ rfid }` |

Endpoint lain (jadwal, siswa, laporan harian, finalisasi, import Excel) **(verifikasi)**: dokumentasikan di `docs/DOCUMENTATION.md`.

**Aturan:**
- Dilarang mengubah path, body, nama field, atau status code tanpa diminta.
- Format response konsisten:
  ```json
  { "success": false, "message": "...", "data": null }
  ```
- Perubahan kontrak → update `docs/DOCUMENTATION.md`.

---

## 9. Queue & Worker (BullMQ)

- Queue: `absensi` (job `tap-in`, `tap-out`).
- Worker berjalan sebagai proses terpisah dari API **(verifikasi)**.
- Job harus **idempotent**: tap-in ganda untuk siswa+tanggal yang sama tidak boleh membuat record kedua (dijaga `@@unique([siswaId, tanggal])`).
- Retry dengan backoff untuk error sementara; error validasi bisnis tidak di-retry.
- Job gagal permanen → dead-letter / log (tanpa data pribadi berlebih).

---

## 10. Data Model (Ringkas)

Entitas: `Siswa` (rfid unik), `Kelas`, `Jadwal` (`hari`, `jam_mulai`, `jam_selesai`: String), `AbsensiSiswa` (tanggal, jam_masuk, jam_keluar, status, `is_finalized`).

- Satu record absensi per siswa per hari: `@@unique([siswaId, tanggal])`.
- Perubahan schema selalu lewat `prisma migrate dev`, tidak edit DB manual.
- Operasi multi-tabel dalam `prisma.$transaction`.
- Query laporan memakai `select` eksplisit.

Detail: `docs/DATABASE.md`.

---

## 11. Migrasi TypeScript

### Urutan
1. Setup: `typescript`, `tsx`/`ts-node-dev`, `@types/node`, `@types/express`, `tsconfig.json`.
2. `utils/` dan `config/`.
3. Prisma client + tipe `@prisma/client`.
4. `services/` → `controllers/` → `routes/`.
5. `queues/` dan `workers/`.
6. `app.ts` / `server.ts` terakhir.

### Aturan
- `strict: true` wajib. Dilarang `any`; pakai `unknown` + narrowing.
- Dilarang `@ts-ignore`. `@ts-expect-error` hanya dengan alasan tertulis.
- Rename `.js` → `.ts` **dipisah commit** dari perubahan logika.
- Jangan menulis ulang tipe yang sudah disediakan Prisma.
- Gate: `npx tsc --noEmit` harus lolos sebelum merge.

Detail: `docs/RULES.md`.

---

## 12. TDD (Prompt-Based Guidance)

Ikuti siklus Red → Green → Refactor untuk setiap perubahan behavior:

1. **Test list first**: daftar behavior (input → expected output) dengan nilai konkret sebelum kode.
2. **Red**: tulis satu failing test; pastikan gagal karena assertion, bukan import/syntax error.
3. **Green**: implementasi minimum agar test pass. Tidak ada kode spekulatif.
4. **Refactor**: bersihkan sambil semua test tetap green. Jika refactor mematahkan test, revert.
5. **Repeat**: satu behavior per siklus.

### Aturan
- Jangan menulis test yang hanya cek "kode jalan tanpa throw".
- Jangan mengubah assertion yang sudah ada agar test pass; perbaiki implementasi.
- Jangan menambah fitur di luar test list.

### Test Wajib (Domain)
- Tap-in: tepat waktu, terlambat (1–15 menit), ditolak (> 15 menit), duplikat (409), RFID tak terdaftar (404), tanpa jadwal (400).
- Tap-out: tanpa tap-in (400), sebelum `jam_selesai` terakhir (403), setelah `jam_selesai` (sukses).
- `utils/waktu.ts`: tidak ada pergeseran jam; perbandingan menit sejak 00:00.
- Finalisasi: hari tanpa detail jadwal tetap bisa difinalisasi.
- Idempotensi worker: job tap-in dobel tidak membuat record ganda.

### Enforcement
- Guidance berbasis prompt, tanpa hook mekanis.
- Pre-commit minimal: lint + `tsc --noEmit` + unit test.

---

## 13. Security Baseline (OWASP Top 10:2025, Relevan)

| # | Kategori | Penerapan di project |
|---|---|---|
| A01 | Broken Access Control | Endpoint admin/laporan butuh auth + role; scanner endpoint dibatasi (API key/IP/jaringan sekolah) **(verifikasi)** |
| A02 | Security Misconfiguration | Helmet, CORS allowlist, debug off di production, `.env` tidak di-commit |
| A03 | Supply Chain | `npm audit`, lockfile di-commit, review dependency baru |
| A05 | Injection | Prisma parameterized, validasi Zod di semua input, import Excel divalidasi per baris |
| A07 | Authentication Failures | Rate limit login, token expiry, hash password kuat |
| A09 | Logging Failures | Log tanpa data pribadi siswa berlebih; RFID/NIS dimasking di log |
| A10 | Exceptional Conditions | Global error handler, fail-closed, tidak bocorkan stack trace di production |

### Data Siswa
- Data siswa (nama, NIS, RFID) = data pribadi anak. Jangan masuk log, contoh test, atau commit.
- File Excel import berisi data nyata tidak boleh di-commit.
- Rate limit pada endpoint tap untuk mencegah spam scanner.

---

## 14. Non-Fungsional

- **Performa**: API tap-in/out merespons cepat; penulisan DB di worker.
- **Keandalan**: job idempotent, retry dengan backoff, scanner menangani 409 secara graceful.
- **Skalabilitas**: worker bisa di-scale horizontal; satu PrismaClient per proses.
- **Observability**: log terstruktur per request/job; metrik jumlah tap, job gagal, latensi.
- **Zona waktu**: `TZ=Asia/Jakarta` di semua proses.

---

## 15. Roadmap (Urutan Saran)

1. Setup TypeScript + `tsconfig` strict + `utils/waktu.ts` (dengan test).
2. Migrasi `config/`, Prisma client, `utils/`.
3. Migrasi modul absensi-siswa (service → controller → routes) + test aturan tap-in/out.
4. Migrasi queue + worker (job typed, idempotent).
5. Tap-out otomatis di jam pelajaran terakhir.
6. Migrasi jadwal, siswa, rfid-import (validasi Excel per baris).
7. Finalisasi harian (termasuk hari tanpa detail jadwal) + laporan.
8. Hardening: auth, rate limit, logging masking, CI.

---

## 16. Constraints & Rules (untuk AI Agent)

### Yang BOLEH
- Edit file di `src/`, `prisma/`, `docs/`.
- Tambah migration Prisma.
- Tambah test unit.
- Update AGENTS.md jika behavior berubah.

### Yang TIDAK BOLEH
- Commit secret, `.env`, atau data siswa asli.
- Edit `node_modules/`, `dist/`, `.git/`.
- Force push ke `main`/`develop`.
- Menjalankan operasi DB destruktif (`DROP`, `TRUNCATE`, `migrate reset`) tanpa persetujuan manual.
- Mengubah kontrak API atau `schema.prisma` tanpa diminta.
- Menambah dependency, layer, atau fitur di luar permintaan.
- Menggeser jam (`±7`) atau membuat helper waktu baru.
- Menulis tap-in/tap-out langsung dari controller.
- `any`, `@ts-ignore`, `console.log` di production code (pakai logger).
- Duplikasi tipe (gunakan `z.infer` / tipe Prisma).
- Meninggalkan `TODO` di production code (buka issue).

### Output Format
- Perubahan **minimal**. Jika diberi satu file, kembalikan **file utuh** yang sudah diperbarui, bukan potongan.
- Conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
- Task summary singkat: apa yang diubah, hasil test, hasil `tsc --noEmit`.
- Update `docs/` jika behavior berubah.

### Sebelum Selesai
- [ ] `npx tsc --noEmit` lolos
- [ ] Unit test lolos
- [ ] Tidak ada `any` / `@ts-ignore` baru
- [ ] Kontrak API tidak berubah (atau terdokumentasi)
- [ ] Aturan waktu (§7) dan absensi (§6) tidak dilanggar

---

## 17. Change Log

| Tanggal | Perubahan | Oleh |
|---|---|---|
| 2026-11-06 | Initial AGENTS.md (format mengikuti referensi CS Omnichannel), konteks migrasi TypeScript | AI Agent |

> Update tabel ini setiap kali ada perubahan keputusan arsitektur/stack.