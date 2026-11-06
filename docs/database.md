# DATABASE — Absensi Sekolah

> Draft berdasarkan aturan bisnis. `TODO`: cocokkan dengan `schema.prisma` asli.

```prisma
enum StatusAbsensi {
  Tepat_Waktu
  Terlambat
  // TODO: tambah sesuai schema (Izin, Sakit, Alpa, dst)
}

model Siswa {
  id        Int      @id @default(autoincrement())
  nis       String   @unique
  nama      String
  rfid      String   @unique
  kelasId   Int
  kelas     Kelas    @relation(fields: [kelasId], references: [id])
  absensi   AbsensiSiswa[]
}

model Kelas {
  id      Int      @id @default(autoincrement())
  nama    String
  siswa   Siswa[]
  jadwal  Jadwal[]
}

model Jadwal {
  id           Int    @id @default(autoincrement())
  kelasId      Int
  hari         String
  jam_mulai    String // "HH:mm" WIB, tanpa shift
  jam_selesai  String // "HH:mm" WIB, tanpa shift
  kelas        Kelas  @relation(fields: [kelasId], references: [id])
}

model AbsensiSiswa {
  id            Int            @id @default(autoincrement())
  siswaId       Int
  tanggal       DateTime       @db.Date
  jam_masuk     DateTime?
  jam_keluar    DateTime?
  status        StatusAbsensi
  is_finalized  Boolean        @default(false)
  siswa         Siswa          @relation(fields: [siswaId], references: [id])

  @@unique([siswaId, tanggal])
}
```

## Catatan
- `@@unique([siswaId, tanggal])` menjamin satu record absensi per siswa per hari (dasar respons 409).
- Perubahan schema selalu lewat `prisma migrate dev`.
- Operasi multi-tabel pakai `prisma.$transaction`.