/*
  Warnings:

  - You are about to drop the column `NIK` on the `siswa` table. All the data in the column will be lost.
  - You are about to drop the column `NIPD` on the `siswa` table. All the data in the column will be lost.
  - You are about to drop the column `NISN` on the `siswa` table. All the data in the column will be lost.
  - You are about to drop the column `alamat` on the `siswa` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `siswa` table. All the data in the column will be lost.
  - You are about to drop the column `nomor_telepon` on the `siswa` table. All the data in the column will be lost.
  - You are about to drop the column `status_siswa` on the `siswa` table. All the data in the column will be lost.
  - You are about to drop the column `tanggal_lahir` on the `siswa` table. All the data in the column will be lost.
  - You are about to alter the column `nama` on the `siswa` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(150)`.
  - A unique constraint covering the columns `[nisn]` on the table `siswa` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nipd]` on the table `siswa` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nik]` on the table `siswa` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `agama` to the `siswa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jenis_kelamin` to the `siswa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jurusan` to the `siswa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nik` to the `siswa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nisn` to the `siswa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tempat_lahir` to the `siswa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tgl_lahir` to the `siswa` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "siswa_NIK_key";

-- DropIndex
DROP INDEX "siswa_NIPD_key";

-- DropIndex
DROP INDEX "siswa_NISN_key";

-- AlterTable
ALTER TABLE "siswa" DROP COLUMN "NIK",
DROP COLUMN "NIPD",
DROP COLUMN "NISN",
DROP COLUMN "alamat",
DROP COLUMN "gender",
DROP COLUMN "nomor_telepon",
DROP COLUMN "status_siswa",
DROP COLUMN "tanggal_lahir",
ADD COLUMN     "agama" VARCHAR(50) NOT NULL,
ADD COLUMN     "jenis_kelamin" VARCHAR(1) NOT NULL,
ADD COLUMN     "jurusan" VARCHAR(100) NOT NULL,
ADD COLUMN     "nik" VARCHAR(20) NOT NULL,
ADD COLUMN     "nipd" VARCHAR(20),
ADD COLUMN     "nisn" VARCHAR(20) NOT NULL,
ADD COLUMN     "tempat_lahir" VARCHAR(100) NOT NULL,
ADD COLUMN     "tgl_lahir" DATE NOT NULL,
ALTER COLUMN "nama" SET DATA TYPE VARCHAR(150);

-- CreateIndex
CREATE UNIQUE INDEX "siswa_nisn_key" ON "siswa"("nisn");

-- CreateIndex
CREATE UNIQUE INDEX "siswa_nipd_key" ON "siswa"("nipd");

-- CreateIndex
CREATE UNIQUE INDEX "siswa_nik_key" ON "siswa"("nik");
