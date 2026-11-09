/*
  Warnings:

  - The `status_harian` column on the `absensi_siswa` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status_lama` column on the `permintaan_status_absensi` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `name` on the `roles` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `email` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `password` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - A unique constraint covering the columns `[nama_mapel]` on the table `mata_pelajaran` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `roles` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `status_siswa` to the `siswa` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StatusSiswa" AS ENUM ('Active', 'Inactive', 'Alumni');

-- DropIndex
DROP INDEX "absensi_siswa_siswa_id_tanggal_key";

-- DropIndex
DROP INDEX "absensi_siswa_tanggal_idx";

-- DropIndex
DROP INDEX "detail_absensi_siswa_absensi_id_idx";

-- DropIndex
DROP INDEX "detail_absensi_siswa_jadwal_id_idx";

-- DropIndex
DROP INDEX "rfid_siswa_id_idx";

-- DropIndex
DROP INDEX "roles_name_deleted_at_idx";

-- DropIndex
DROP INDEX "siswa_kelas_id_idx";

-- AlterTable
ALTER TABLE "absensi_siswa" DROP COLUMN "status_harian",
ADD COLUMN     "status_harian" "StatusAbsensi";

-- AlterTable
ALTER TABLE "permintaan_status_absensi" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
DROP COLUMN "status_lama",
ADD COLUMN     "status_lama" "StatusAbsensi";

-- AlterTable
ALTER TABLE "roles" ALTER COLUMN "name" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "siswa" ADD COLUMN     "status_siswa" "StatusSiswa" NOT NULL;

-- AlterTable
ALTER TABLE "user_roles" ADD COLUMN     "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "email" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "password" SET DATA TYPE VARCHAR(255);

-- DropEnum
DROP TYPE "StatusHarian";

-- CreateIndex
CREATE INDEX "absensi_siswa_siswa_id_tanggal_deleted_at_idx" ON "absensi_siswa"("siswa_id", "tanggal", "deleted_at");

-- CreateIndex
CREATE INDEX "absensi_siswa_tanggal_deleted_at_idx" ON "absensi_siswa"("tanggal", "deleted_at");

-- CreateIndex
CREATE INDEX "absensi_siswa_status_harian_idx" ON "absensi_siswa"("status_harian");

-- CreateIndex
CREATE INDEX "detail_absensi_siswa_absensi_id_deleted_at_idx" ON "detail_absensi_siswa"("absensi_id", "deleted_at");

-- CreateIndex
CREATE INDEX "detail_absensi_siswa_jadwal_id_status_idx" ON "detail_absensi_siswa"("jadwal_id", "status");

-- CreateIndex
CREATE INDEX "guru_nama_idx" ON "guru"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "mata_pelajaran_nama_mapel_key" ON "mata_pelajaran"("nama_mapel");

-- CreateIndex
CREATE INDEX "mata_pelajaran_nama_mapel_idx" ON "mata_pelajaran"("nama_mapel");

-- CreateIndex
CREATE INDEX "orang_tua_NIK_idx" ON "orang_tua"("NIK");

-- CreateIndex
CREATE INDEX "rfid_siswa_id_is_active_idx" ON "rfid"("siswa_id", "is_active");

-- CreateIndex
CREATE INDEX "rfid_uid_rfid_deleted_at_idx" ON "rfid"("uid_rfid", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "roles_deleted_at_idx" ON "roles"("deleted_at");

-- CreateIndex
CREATE INDEX "siswa_kelas_id_deleted_at_idx" ON "siswa"("kelas_id", "deleted_at");

-- CreateIndex
CREATE INDEX "siswa_nama_idx" ON "siswa"("nama");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE INDEX "users_email_deleted_at_idx" ON "users"("email", "deleted_at");
