/*
  Warnings:

  - You are about to drop the column `jurusan_id` on the `kelas` table. All the data in the column will be lost.
  - You are about to drop the `jurusan` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[kelas,jurusan,tahun_ajaran_id]` on the table `kelas` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `jurusan` to the `kelas` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "kelas" DROP CONSTRAINT "kelas_jurusan_id_fkey";

-- DropIndex
DROP INDEX "kelas_jurusan_id_idx";

-- DropIndex
DROP INDEX "kelas_kelas_jurusan_id_tahun_ajaran_id_key";

-- AlterTable
ALTER TABLE "kelas" DROP COLUMN "jurusan_id",
ADD COLUMN     "jurusan" VARCHAR(100) NOT NULL;

-- DropTable
DROP TABLE "jurusan";

-- CreateIndex
CREATE UNIQUE INDEX "kelas_kelas_jurusan_tahun_ajaran_id_key" ON "kelas"("kelas", "jurusan", "tahun_ajaran_id");
