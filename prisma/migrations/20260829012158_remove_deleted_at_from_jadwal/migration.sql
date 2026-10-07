/*
  Warnings:

  - You are about to drop the column `deleted_at` on the `jadwal` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "jadwal_deleted_at_idx";

-- AlterTable
ALTER TABLE "jadwal" DROP COLUMN "deleted_at";
