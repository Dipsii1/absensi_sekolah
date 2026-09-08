const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

const seedRole = require("./seeders/roleSeeder");

async function seedSuperAdmin(prisma, roleMap) {
    console.log("👤 Seeding Super Admin...");

    const hashedPassword = await bcrypt.hash("password123", 10);

    let user = await prisma.user.findFirst({
        where: { email: "superadmin@sekolah.sch.id", deleted_at: null },
    });

    if (!user) {
        user = await prisma.user.create({
            data: {
                username: "superadmin",
                email: "superadmin@sekolah.sch.id",
                password: hashedPassword,
                guru_id: null,
            },
        });
    }

    const role = roleMap["SUPER_ADMIN"];

    const existingRole = await prisma.userRole.findUnique({
        where: {
            user_id_role_id: {
                user_id: user.id,
                role_id: role.id,
            },
        },
    });

    if (!existingRole) {
        await prisma.userRole.create({
            data: {
                user_id: user.id,
                role_id: role.id,
            },
        });
    }

    console.log(`  ✔ SUPER_ADMIN | superadmin | superadmin@sekolah.sch.id`);
    return user;
}

async function main() {
    console.log("🌱 Mulai seeding roles & superadmin...\n");

    const roleMap = await seedRole(prisma);
    await seedSuperAdmin(prisma, roleMap);

    console.log("\n✅ Seeding selesai!");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());