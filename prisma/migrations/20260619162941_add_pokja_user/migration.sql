-- AlterTable
ALTER TABLE "guru" ALTER COLUMN "NIP" SET DATA TYPE VARCHAR(50);

-- CreateTable
CREATE TABLE "pokja_users" (
    "user_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pokja_users_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "pokja_users" ADD CONSTRAINT "pokja_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
