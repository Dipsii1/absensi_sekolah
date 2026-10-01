/*
  Warnings:

  - The values [TELAMBAT] on the enum `StatusKedatangan` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[NIK]` on the table `orang_tua` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `NIK` to the `orang_tua` table without a default value. This is not possible if the table is not empty.
  - Added the required column `alamat` to the `orang_tua` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pekerjaan` to the `orang_tua` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StatusHarian" AS ENUM ('Hadir', 'Izin', 'Sakit', 'Alpha');

-- AlterEnum
BEGIN;
CREATE TYPE "StatusKedatangan_new" AS ENUM ('Terlambat', 'Tepat_Waktu');
ALTER TABLE "absensi_siswa" ALTER COLUMN "status_tapin" TYPE "StatusKedatangan_new" USING ("status_tapin"::text::"StatusKedatangan_new");
ALTER TYPE "StatusKedatangan" RENAME TO "StatusKedatangan_old";
ALTER TYPE "StatusKedatangan_new" RENAME TO "StatusKedatangan";
DROP TYPE "StatusKedatangan_old";
COMMIT;

-- AlterTable
ALTER TABLE "absensi_siswa" ADD COLUMN     "status_harian" "StatusHarian";

-- AlterTable
ALTER TABLE "orang_tua" ADD COLUMN     "NIK" VARCHAR(20) NOT NULL,
ADD COLUMN     "alamat" TEXT NOT NULL,
ADD COLUMN     "pekerjaan" VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE INDEX "absensi_siswa_status_harian_idx" ON "absensi_siswa"("status_harian");

-- CreateIndex
CREATE UNIQUE INDEX "orang_tua_NIK_key" ON "orang_tua"("NIK");
