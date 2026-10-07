/*
  Warnings:

  - A unique constraint covering the columns `[kode_mapel]` on the table `mata_pelajaran` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "mata_pelajaran" ADD COLUMN     "kode_mapel" VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX "mata_pelajaran_kode_mapel_key" ON "mata_pelajaran"("kode_mapel");
