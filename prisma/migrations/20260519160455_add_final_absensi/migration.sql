-- CreateTable
CREATE TABLE "final_absensi" (
    "id" SERIAL NOT NULL,
    "siswa_id" UUID NOT NULL,
    "kelas_id" INTEGER NOT NULL,
    "tanggal" DATE NOT NULL,
    "status_final" "StatusAbsensi" NOT NULL,
    "total_hadir" INTEGER NOT NULL DEFAULT 0,
    "total_izin" INTEGER NOT NULL DEFAULT 0,
    "total_sakit" INTEGER NOT NULL DEFAULT 0,
    "total_alpha" INTEGER NOT NULL DEFAULT 0,
    "total_mapel" INTEGER NOT NULL DEFAULT 0,
    "is_finalized" BOOLEAN NOT NULL DEFAULT false,
    "finalized_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "final_absensi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "final_absensi_kelas_id_tanggal_idx" ON "final_absensi"("kelas_id", "tanggal");

-- CreateIndex
CREATE INDEX "final_absensi_status_final_idx" ON "final_absensi"("status_final");

-- CreateIndex
CREATE INDEX "final_absensi_is_finalized_idx" ON "final_absensi"("is_finalized");

-- CreateIndex
CREATE INDEX "final_absensi_deleted_at_idx" ON "final_absensi"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "final_absensi_siswa_id_tanggal_key" ON "final_absensi"("siswa_id", "tanggal");

-- AddForeignKey
ALTER TABLE "final_absensi" ADD CONSTRAINT "final_absensi_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_absensi" ADD CONSTRAINT "final_absensi_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
