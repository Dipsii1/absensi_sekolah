-- CreateEnum
CREATE TYPE "StatusKelas" AS ENUM ('Active', 'Inactive');

-- AlterTable
ALTER TABLE "kelas" ADD COLUMN     "status_kelas" "StatusKelas" NOT NULL DEFAULT 'Active';
