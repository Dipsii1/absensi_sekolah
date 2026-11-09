# ARCHITECTURE — Absensi Sekolah (RFID)

> `TODO` = sesuaikan dengan struktur repo asli.

## 1. Gambaran Sistem

```
┌───────────────┐   HTTP    ┌────────────────────┐
│ Scanner RFID  │──────────▶│  Express API (TS)  │
│ (Astro page)  │◀──────────│  /api/v1           │
└───────────────┘           └─────────┬──────────┘
   localStorage                       │ enqueue
   (cache RFID)                       ▼
                              ┌───────────────┐
                              │ BullMQ (Redis)│
                              └───────┬───────┘
                                      │
                       ┌──────────────┴──────────────┐
                       ▼                             ▼
                tap-in.worker                 tap-out.worker
                       └──────────────┬──────────────┘
                                      ▼
                              Prisma ─▶ PostgreSQL
```

## 2. Layer

| Layer | Tanggung jawab | Boleh tahu |
|---|---|---|
| routes | Mapping URL ke controller, pasang middleware | controller |
| controller | Parse request, validasi Zod, kirim response | service |
| service | Logika bisnis, aturan absensi, aturan waktu | prisma, queue, utils |
| queue / worker | Proses tulis tap-in/tap-out secara async | service, prisma |
| utils | Helper murni (waktu WIB, response, error) | tidak ada |
| config | Env, prisma client, redis, bullmq | tidak ada |

Arah dependency satu arah: routes -> controller -> service -> prisma. Layer bawah tidak boleh import layer atas.

## 3. Struktur Folder
```
src/
  config/        env.ts, prisma.ts, redis.ts
  modules/
    absensi-siswa/  absensi-siswa.routes.ts, .controller.ts, .service.ts, .schema.ts
    jadwal/
    siswa/
    rfid-import/
  queues/        absensi.queue.ts
  workers/       tap-in.worker.ts, tap-out.worker.ts
  middlewares/   error.middleware.ts, validate.middleware.ts
  utils/         waktu.ts, response.ts, app-error.ts
  types/
  app.ts
  server.ts
prisma/schema.prisma
```

## 4. Alur Tap-in
1. Scanner kirim `POST /absensi-siswa/tap-in` `{ rfid }`.
2. Controller validasi body (Zod).
3. Service: cari siswa by RFID, ambil jadwal kelas hari ini, cek sudah tap-in (409).
4. Hitung status dari `jam_mulai` jadwal pertama: Tepat_Waktu / Terlambat / tolak (> 15 menit).
5. Job masuk queue, worker menulis `AbsensiSiswa`.

## 5. Alur Tap-out
1. Scanner dapat 409 dari tap-in, lalu fallback `POST /absensi-siswa/tap-out`.
2. Service: wajib ada tap-in hari ini; cek waktu sekarang >= `jam_selesai` jadwal terakhir, jika belum, tolak.
3. Worker menulis `jam_keluar`.
4. Target: tap-out otomatis saat jam terakhir selesai (scheduler/worker terjadwal).

## 6. Keputusan Arsitektur

| Keputusan | Alasan |
|---|---|
| Jam jadwal disimpan String `"HH:mm"` | Hindari konversi timezone `@db.Time` |
| Semua waktu dihitung di WIB lewat satu helper | Cegah bug status selalu "Terlambat" |
| Tulis lewat BullMQ | Scanner banyak tap bersamaan, API tetap cepat |
| Zod di controller | Validasi + tipe dari satu sumber |
| Satu PrismaClient | Hindari kehabisan koneksi |
| Cache RFID di localStorage (scanner) | Scanner tetap responsif |

## 7. Deployment (`TODO`)
- API + worker: Node 20+, proses terpisah (`api`, `worker`).
- PostgreSQL dan Redis: managed service.
- `TZ=Asia/Jakarta`.