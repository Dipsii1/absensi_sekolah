/*
  Konversi kolom jadwal `jam_mulai`/`jam_selesai` dari TIME ke VARCHAR(5) "HH:MM".
  - Data existing dikonversi lewat to_char(..., 'HH24:MI'), tidak hilang.
  - Nol-dikenak karena TIME(6) selalu HH:MM:SS; aman dipotong ke HH:MM.
  - Kolom tetap NOT NULL & unique kelas_id,hari,jam_mulai (indeks dibuat kembali).
*/
-- AlterTable (konversi bertipe, aman untuk data)
ALTER TABLE "jadwal"
  ALTER COLUMN "jam_mulai"   TYPE VARCHAR(5) USING to_char("jam_mulai", 'HH24:MI'),
  ALTER COLUMN "jam_selesai" TYPE VARCHAR(5) USING to_char("jam_selesai", 'HH24:MI');

-- Ensure NOT NULL (col was already NOT NULL as TIME, cast keeps it)
ALTER TABLE "jadwal"
  ALTER COLUMN "jam_mulai"   SET NOT NULL,
  ALTER COLUMN "jam_selesai" SET NOT NULL;

-- Unique index kembali (pernah dibuang oleh rollback soft-delete sebelumnya bila ada)
DROP INDEX IF EXISTS "jadwal_kelas_id_hari_jam_mulai_key";
CREATE UNIQUE INDEX "jadwal_kelas_id_hari_jam_mulai_key" ON "jadwal"("kelas_id", "hari", "jam_mulai");
