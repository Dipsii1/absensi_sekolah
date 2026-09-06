/*
  Warnings:

  - A unique constraint covering the columns `[siswa_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "siswa_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "users_siswa_id_key" ON "users"("siswa_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "siswa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
