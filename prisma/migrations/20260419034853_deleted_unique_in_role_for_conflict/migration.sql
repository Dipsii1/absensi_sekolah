-- DropIndex
DROP INDEX "roles_name_key";

-- CreateIndex
CREATE INDEX "roles_name_deleted_at_idx" ON "roles"("name", "deleted_at");
