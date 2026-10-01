/*
  Warnings:

  - A unique constraint covering the columns `[NIP,deleted_at]` on the table `guru` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[kelas_id,hari,jam_mulai,deleted_at]` on the table `jadwal` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[kelas,jurusan,tahun_ajaran_id,deleted_at]` on the table `kelas` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nama_mapel,deleted_at]` on the table `mata_pelajaran` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[NIK,deleted_at]` on the table `orang_tua` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[uid_rfid,deleted_at]` on the table `rfid` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,deleted_at]` on the table `roles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[NISN,deleted_at]` on the table `siswa` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[NIPD,deleted_at]` on the table `siswa` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tahun_ajaran,deleted_at]` on the table `tahun_ajaran` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email,deleted_at]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `roles` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "kelas" DROP CONSTRAINT "kelas_walas_id_fkey";

-- DropIndex
DROP INDEX "absensi_siswa_rfid_id_idx";

-- DropIndex
DROP INDEX "absensi_siswa_status_harian_idx";

-- DropIndex
DROP INDEX "absensi_siswa_status_tapin_idx";

-- DropIndex
DROP INDEX "guru_NIP_key";

-- DropIndex
DROP INDEX "jadwal_guru_id_hari_idx";

-- DropIndex
DROP INDEX "jadwal_kelas_id_hari_jam_mulai_key";

-- DropIndex
DROP INDEX "jadwal_mapel_id_idx";

-- DropIndex
DROP INDEX "kelas_kelas_jurusan_tahun_ajaran_id_key";

-- DropIndex
DROP INDEX "orang_tua_NIK_key";

-- DropIndex
DROP INDEX "rfid_uid_rfid_key";

-- DropIndex
DROP INDEX "roles_name_key";

-- DropIndex
DROP INDEX "siswa_NIPD_key";

-- DropIndex
DROP INDEX "siswa_NISN_key";

-- DropIndex
DROP INDEX "tahun_ajaran_tahun_ajaran_key";

-- DropIndex
DROP INDEX "users_email_key";

-- AlterTable
ALTER TABLE "guru" ALTER COLUMN "NIP" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "jadwal" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "kelas" ALTER COLUMN "kelas" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "telegram_group_id" SET DATA TYPE TEXT,
ALTER COLUMN "jurusan" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "mata_pelajaran" ALTER COLUMN "nama_mapel" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "orang_tua" ALTER COLUMN "NIK" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "rfid" ALTER COLUMN "uid_rfid" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL;

-- AlterTable
ALTER TABLE "siswa" ALTER COLUMN "NIPD" SET DATA TYPE TEXT,
ALTER COLUMN "NISN" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "tahun_ajaran" ALTER COLUMN "tahun_ajaran" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "guru_NIP_deleted_at_key" ON "guru"("NIP", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "jadwal_kelas_id_hari_jam_mulai_deleted_at_key" ON "jadwal"("kelas_id", "hari", "jam_mulai", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "kelas_kelas_jurusan_tahun_ajaran_id_deleted_at_key" ON "kelas"("kelas", "jurusan", "tahun_ajaran_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "mata_pelajaran_nama_mapel_deleted_at_key" ON "mata_pelajaran"("nama_mapel", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "orang_tua_NIK_deleted_at_key" ON "orang_tua"("NIK", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "rfid_uid_rfid_deleted_at_key" ON "rfid"("uid_rfid", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_deleted_at_key" ON "roles"("name", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "siswa_NISN_deleted_at_key" ON "siswa"("NISN", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "siswa_NIPD_deleted_at_key" ON "siswa"("NIPD", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "tahun_ajaran_tahun_ajaran_deleted_at_key" ON "tahun_ajaran"("tahun_ajaran", "deleted_at");

-- CreateIndex
CREATE INDEX "users_guru_id_idx" ON "users"("guru_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_deleted_at_key" ON "users"("email", "deleted_at");

-- AddForeignKey
ALTER TABLE "kelas" ADD CONSTRAINT "kelas_walas_id_fkey" FOREIGN KEY ("walas_id") REFERENCES "guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;
