const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const seedRole = require("./seeders/roleSeeder");

async function main() {
    console.log("🌱 Mulai seeding roles...\n");

    await seedRole(prisma);

    console.log("\n✅ Seeding roles selesai!");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());