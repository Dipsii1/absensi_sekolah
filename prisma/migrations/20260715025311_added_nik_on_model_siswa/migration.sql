/*
  Warnings:

  - A unique constraint covering the columns `[NIK]` on the table `siswa` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `NIK` to the `siswa` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "siswa" ADD COLUMN     "NIK" VARCHAR(20) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "siswa_NIK_key" ON "siswa"("NIK");
