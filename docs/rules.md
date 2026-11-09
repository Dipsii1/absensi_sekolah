# RULES — Absensi Sekolah

Aturan untuk developer dan AI assistant (Claude/Cursor/Copilot) yang bekerja di repo ini.

## 1. Aturan Umum

1. Perubahan minimal. Jangan refactor di luar yang diminta.
2. Jangan tambah fitur, dependency, atau layer baru tanpa diminta.
3. Output kode harus lengkap dan siap pakai (file utuh, bukan potongan).
4. Jangan ubah kontrak API (path, body, status code) tanpa diminta.
5. Pertahankan nama field Bahasa Indonesia yang sudah ada (`jam_mulai`, `jam_selesai`, `Tepat_Waktu`, `Terlambat`).

## 2. Migrasi TypeScript

### Urutan migrasi
1. Setup: `typescript`, `tsx` atau `ts-node-dev`, `@types/node`, `@types/express`, `tsconfig.json`.
2. `utils/` dan `config/` dulu (tanpa dependency ke layer lain).
3. `prisma` client + tipe dari `@prisma/client`.
4. `services/` -> `controllers/` -> `routes/`.
5. `queues/` dan `workers/` (BullMQ, beri tipe job data).
6. `app.ts` / `server.ts` terakhir.

Migrasi per file (`.js` -> `.ts`), jangan ubah logika bisnis dalam commit yang sama dengan rename.

### `tsconfig.json` baseline
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src"]
}
```

### Aturan tipe
- `strict: true` wajib. Dilarang `any`; pakai `unknown` lalu narrowing.
- Boleh `// @ts-expect-error` dengan alasan, dilarang `@ts-ignore`.
- Gunakan tipe dari Prisma (`Prisma.AbsensiSiswaCreateInput`, `Siswa`, dll), jangan definisikan ulang.
- Data job BullMQ wajib punya interface:
  ```ts
  interface TapJobData { rfid: string; waktu: string }
  ```
- Request body divalidasi dengan Zod, tipe diambil dari `z.infer`.
- Type Express request/response eksplisit: `Request<Params, ResBody, ReqBody>`.
- Status absensi pakai union/enum dari Prisma, bukan string literal bebas.
- Gunakan `import type` untuk import yang hanya tipe.

## 3. Struktur dan Penamaan

- File: `kebab-case.ts` (`tap-in.worker.ts`, `absensi-siswa.service.ts`).
- Class/interface/type: `PascalCase`. Variabel/fungsi: `camelCase`. Konstanta: `UPPER_SNAKE_CASE`.
- Controller hanya parse request + panggil service + kirim response. Logika bisnis di service.
- Satu helper waktu di `utils/waktu.ts`. Dilarang bikin helper waktu baru di tempat lain.

## 4. Aturan Waktu (wajib)

- `jam_mulai` / `jam_selesai` = String `"HH:mm"`, WIB apa adanya.
- Dilarang menggeser jam (`-7`/`+7`) di `createTimeDate` dan `formatJam`.
- Zona acuan: `Asia/Jakarta`. Satu fungsi untuk membangun "hari ini jam HH:mm WIB".
- Dilarang membandingkan Date yang sudah di-shift WIB dengan instan UTC mentah.
- Urutan dan deteksi bentrok jadwal dibandingkan sebagai menit sejak 00:00, bukan lewat Date.

## 5. Aturan Absensi

- Tap-in: ≤ `jam_mulai` = `Tepat_Waktu`; > `jam_mulai` = `Terlambat`; > 15 menit = ditolak.
- Tap-in kedua di hari yang sama = 409.
- Tap-out butuh tap-in sebelumnya dan hanya valid ≥ `jam_selesai` jadwal terakhir. Sebelum itu ditolak.
- Finalisasi harian harus tetap jalan untuk hari tanpa detail jadwal.
- Semua tulis ke DB lewat worker BullMQ untuk tap-in/tap-out, bukan langsung dari controller.

## 6. Error Handling

- Pakai class error terpusat (`AppError(statusCode, message)`) dan satu error middleware.
- Format response konsisten:
  ```json
  { "success": false, "message": "...", "data": null }
  ```
- Jangan `catch` lalu diam. Log atau lempar ulang.
- Jangan bocorkan stack trace di production.

## 7. Prisma

- Satu instance `PrismaClient` di `config/prisma.ts`.
- Perubahan schema selalu lewat migration (`prisma migrate dev`), jangan edit DB manual.
- Query laporan memakai `select` eksplisit, hindari `include` berlebihan.
- Operasi multi-tabel dalam `prisma.$transaction`.

## 8. Git

- Commit kecil, format: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`.
- Rename file dan perubahan logika dipisah commit.
- Jangan commit `.env`, `dist/`, `node_modules/`.

## 9. Checklist Sebelum Merge

- [ ] `npx tsc --noEmit` lolos tanpa error
- [ ] Tidak ada `any` / `@ts-ignore` baru
- [ ] Kontrak API tidak berubah (atau didokumentasikan di `docs/DOCUMENTATION.md`)
- [ ] Aturan waktu (bagian 4) tidak dilanggar
- [ ] Tap-in/tap-out dites: tepat waktu, terlambat, >15 menit, duplikat, tap-out sebelum waktunya