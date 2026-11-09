-- DropIndex
DROP INDEX "siswa_deleted_at_idx";

-- CreateIndex
CREATE INDEX "siswa_deleted_at_created_at_idx" ON "siswa"("deleted_at", "created_at");
