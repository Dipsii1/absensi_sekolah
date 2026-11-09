/*
  Warnings:

  - You are about to alter the column `NIP` on the `guru` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `kelas` on the `kelas` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.
  - You are about to alter the column `telegram_group_id` on the `kelas` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `jurusan` on the `kelas` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `nama_mapel` on the `mata_pelajaran` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `NIK` on the `orang_tua` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `uid_rfid` on the `rfid` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `NIPD` on the `siswa` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `NISN` on the `siswa` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `tahun_ajaran` on the `tahun_ajaran` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - A unique constraint covering the columns `[NIP]` on the table `guru` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[kelas_id,hari,jam_mulai]` on the table `jadwal` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[kelas,jurusan,tahun_ajaran_id]` on the table `kelas` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[NIK]` on the table `orang_tua` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[uid_rfid]` on the table `rfid` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `roles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[NISN]` on the table `siswa` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[NIPD]` on the table `siswa` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tahun_ajaran]` on the table `tahun_ajaran` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "kelas" DROP CONSTRAINT "kelas_walas_id_fkey";

-- DropIndex
DROP INDEX "guru_NIP_deleted_at_key";

-- DropIndex
DROP INDEX "jadwal_kelas_id_hari_jam_mulai_deleted_at_key";

-- DropIndex
DROP INDEX "kelas_kelas_jurusan_tahun_ajaran_id_deleted_at_key";

-- DropIndex
DROP INDEX "mata_pelajaran_nama_mapel_deleted_at_key";

-- DropIndex
DROP INDEX "orang_tua_NIK_deleted_at_key";

-- DropIndex
DROP INDEX "rfid_uid_rfid_deleted_at_key";

-- DropIndex
DROP INDEX "roles_name_deleted_at_key";

-- DropIndex
DROP INDEX "siswa_NIPD_deleted_at_key";

-- DropIndex
DROP INDEX "siswa_NISN_deleted_at_key";

-- DropIndex
DROP INDEX "tahun_ajaran_tahun_ajaran_deleted_at_key";

-- DropIndex
DROP INDEX "users_email_deleted_at_key";

-- DropIndex
DROP INDEX "users_guru_id_idx";

-- AlterTable
ALTER TABLE "guru" ALTER COLUMN "NIP" SET DATA TYPE VARCHAR(20);

-- AlterTable
ALTER TABLE "jadwal" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "kelas" ALTER COLUMN "kelas" SET DATA TYPE VARCHAR(10),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "telegram_group_id" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "jurusan" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "mata_pelajaran" ALTER COLUMN "nama_mapel" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "orang_tua" ALTER COLUMN "NIK" SET DATA TYPE VARCHAR(20);

-- AlterTable
ALTER TABLE "rfid" ALTER COLUMN "uid_rfid" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "siswa" ALTER COLUMN "NIPD" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "NISN" SET DATA TYPE VARCHAR(20);

-- AlterTable
ALTER TABLE "tahun_ajaran" ALTER COLUMN "tahun_ajaran" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "absensi_siswa_rfid_id_idx" ON "absensi_siswa"("rfid_id");

-- CreateIndex
CREATE INDEX "absensi_siswa_status_tapin_idx" ON "absensi_siswa"("status_tapin");

-- CreateIndex
CREATE INDEX "absensi_siswa_status_harian_idx" ON "absensi_siswa"("status_harian");

-- CreateIndex
CREATE UNIQUE INDEX "guru_NIP_key" ON "guru"("NIP");

-- CreateIndex
CREATE INDEX "jadwal_guru_id_hari_idx" ON "jadwal"("guru_id", "hari");

-- CreateIndex
CREATE INDEX "jadwal_mapel_id_idx" ON "jadwal"("mapel_id");

-- CreateIndex
CREATE UNIQUE INDEX "jadwal_kelas_id_hari_jam_mulai_key" ON "jadwal"("kelas_id", "hari", "jam_mulai");

-- CreateIndex
CREATE UNIQUE INDEX "kelas_kelas_jurusan_tahun_ajaran_id_key" ON "kelas"("kelas", "jurusan", "tahun_ajaran_id");

-- CreateIndex
CREATE UNIQUE INDEX "orang_tua_NIK_key" ON "orang_tua"("NIK");

-- CreateIndex
CREATE UNIQUE INDEX "rfid_uid_rfid_key" ON "rfid"("uid_rfid");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "siswa_NISN_key" ON "siswa"("NISN");

-- CreateIndex
CREATE UNIQUE INDEX "siswa_NIPD_key" ON "siswa"("NIPD");

-- CreateIndex
CREATE UNIQUE INDEX "tahun_ajaran_tahun_ajaran_key" ON "tahun_ajaran"("tahun_ajaran");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "kelas" ADD CONSTRAINT "kelas_walas_id_fkey" FOREIGN KEY ("walas_id") REFERENCES "guru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
