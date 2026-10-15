-- CreateTable
CREATE TABLE "permintaan_status_absensi" (
    "id" SERIAL NOT NULL,
    "siswa_id" UUID NOT NULL,
    "kelas_id" INTEGER NOT NULL,
    "guru_id" INTEGER NOT NULL,
    "walas_id" INTEGER NOT NULL,
    "tanggal" DATE NOT NULL,
    "status_lama" VARCHAR(20),
    "status_baru" "StatusAbsensi" NOT NULL,
    "keterangan" TEXT,
    "is_pending" BOOLEAN NOT NULL DEFAULT true,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "is_auto_approved" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "permintaan_status_absensi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "permintaan_status_absensi_walas_id_is_pending_idx" ON "permintaan_status_absensi"("walas_id", "is_pending");

-- CreateIndex
CREATE INDEX "permintaan_status_absensi_siswa_id_tanggal_idx" ON "permintaan_status_absensi"("siswa_id", "tanggal");

-- CreateIndex
CREATE INDEX "permintaan_status_absensi_expires_at_is_pending_idx" ON "permintaan_status_absensi"("expires_at", "is_pending");

-- AddForeignKey
ALTER TABLE "permintaan_status_absensi" ADD CONSTRAINT "permintaan_status_absensi_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permintaan_status_absensi" ADD CONSTRAINT "permintaan_status_absensi_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permintaan_status_absensi" ADD CONSTRAINT "permintaan_status_absensi_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "guru"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permintaan_status_absensi" ADD CONSTRAINT "permintaan_status_absensi_walas_id_fkey" FOREIGN KEY ("walas_id") REFERENCES "guru"("id") ON DELETE CASCADE ON UPDATE CASCADE;
