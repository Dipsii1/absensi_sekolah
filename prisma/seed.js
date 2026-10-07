const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

const seedRole = require("./seeders/roleSeeder");

async function resetData() {
    console.log("🧹 Menghapus semua data kecuali roles...");

    await prisma.$transaction([
        prisma.detailAbsensiSiswa.deleteMany(),
        prisma.absensiSiswa.deleteMany(),
        prisma.rFID.deleteMany(),
        prisma.kenaikanKelas.deleteMany(),
        prisma.finalAbsensi.deleteMany(),
        prisma.permintaanStatusAbsensi.deleteMany(),
        prisma.userRole.deleteMany(),
        prisma.user.deleteMany(),
        prisma.pokjaUser.deleteMany(),
        prisma.siswa.deleteMany(),
        prisma.orangTua.deleteMany(),
        prisma.jadwal.deleteMany(),
        prisma.kelas.deleteMany(),
        prisma.tahun.deleteMany(),
        prisma.mataPelajaran.deleteMany(),
        prisma.guru.deleteMany(),
    ]);

    console.log("  ✔ Semua data transaksi dan master berhasil dihapus");
}

async function seedSuperAdminFromEnv(prisma, roleMap) {
    console.log("👤 Seeding Super Admin dari environment...");

    const username = process.env.SUPER_ADMIN_USERNAME;
    const rawPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (!username || !rawPassword) {
        throw new Error("Environment SUPER_ADMIN_USERNAME dan SUPER_ADMIN_PASSWORD wajib diisi di .env");
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const superAdminRole = roleMap["SUPER_ADMIN"];

    if (!superAdminRole) {
        throw new Error("Role SUPER_ADMIN tidak ditemukan");
    }

    let user = await prisma.user.findFirst({
        where: { username },
    });

    if (user) {
        user = await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                email: process.env.SUPER_ADMIN_EMAIL || null,
                deleted_at: null,
                guru_id: null,
                siswa_id: null,
            },
        });
    } else {
        user = await prisma.user.create({
            data: {
                username,
                email: process.env.SUPER_ADMIN_EMAIL || null,
                password: hashedPassword,
                guru_id: null,
                siswa_id: null,
            },
        });
    }

    const existingRole = await prisma.userRole.findUnique({
        where: {
            user_id_role_id: {
                user_id: user.id,
                role_id: superAdminRole.id,
            },
        },
    });

    if (!existingRole) {
        await prisma.userRole.create({
            data: {
                user_id: user.id,
                role_id: superAdminRole.id,
            },
        });
    }

    console.log(`  ✔ SUPER_ADMIN | ${username}`);
    return user;
}

async function main() {
    console.log("🌱 Mulai seeding...\n");

    const roleMap = await seedRole(prisma);
    await resetData();
    await seedSuperAdminFromEnv(prisma, roleMap);

    console.log("\n✅ Seeding selesai!");
}

main()
    .catch((error) => {
        console.error("\n❌ Seeding gagal:", error.message);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
