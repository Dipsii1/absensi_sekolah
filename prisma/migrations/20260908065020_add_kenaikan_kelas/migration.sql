-- CreateEnum
CREATE TYPE "KeputusanKenaikan" AS ENUM ('Naik', 'Tinggal', 'Lulus');

-- CreateTable
CREATE TABLE "kenaikan_kelas" (
    "id" SERIAL NOT NULL,
    "siswa_id" UUID NOT NULL,
    "tahun_ajaran_id" INTEGER NOT NULL,
    "kelas_asal_id" INTEGER NOT NULL,
    "keputusan" "KeputusanKenaikan" NOT NULL DEFAULT 'Naik',
    "catatan" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "kenaikan_kelas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kenaikan_kelas_tahun_ajaran_id_kelas_asal_id_idx" ON "kenaikan_kelas"("tahun_ajaran_id", "kelas_asal_id");

-- CreateIndex
CREATE UNIQUE INDEX "kenaikan_kelas_siswa_id_tahun_ajaran_id_key" ON "kenaikan_kelas"("siswa_id", "tahun_ajaran_id");

-- AddForeignKey
ALTER TABLE "kenaikan_kelas" ADD CONSTRAINT "kenaikan_kelas_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kenaikan_kelas" ADD CONSTRAINT "kenaikan_kelas_tahun_ajaran_id_fkey" FOREIGN KEY ("tahun_ajaran_id") REFERENCES "tahun_ajaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kenaikan_kelas" ADD CONSTRAINT "kenaikan_kelas_kelas_asal_id_fkey" FOREIGN KEY ("kelas_asal_id") REFERENCES "kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
