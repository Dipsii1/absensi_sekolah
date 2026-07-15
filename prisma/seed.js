const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const seedRole = require("./seeders/roleSeeder");
const seedTahun = require("./seeders/tahunSeeder");
const seedGuru = require("./seeders/guruSeeder");
const seedKelas = require("./seeders/kelasSeeder");
const seedMapel = require("./seeders/mapelSeeder");
const seedJadwal = require("./seeders/jadwalSeeder");
const seedOrangTua = require("./seeders/orangTuaSeeder");
const seedSiswa = require("./seeders/siswaSeeder");
const seedRFID = require("./seeders/rfidSeeder");
const seedAbsensi = require("./seeders/absensiSeeder");
const seedUser = require("./seeders/userSeeder");
const seedPokjaUser = require("./seeders/pokjaUserSeeder");
const seedPermintaanStatus = require("./seeders/permintaanStatusAbsensiSeeder");
const seedFinalAbsensi = require("./seeders/finalAbsensiSeeder");

async function main() {
    console.log("🌱 Mulai seeding...\n");

    const roleMap = await seedRole(prisma);
    const { tahunList, tahunAktif } = await seedTahun(prisma);
    const guruList = await seedGuru(prisma);
    const kelasList = await seedKelas(prisma, tahunAktif, guruList);
    const mapelList = await seedMapel(prisma);
    const jadwalList = await seedJadwal(prisma, kelasList, mapelList, guruList);
    const orangTuaList = await seedOrangTua(prisma);
    const siswaList = await seedSiswa(prisma, kelasList, orangTuaList);
    const rfidSiswa = await seedRFID(prisma, siswaList);
    await seedAbsensi(prisma, siswaList);

    const userList = await seedUser(prisma, roleMap, guruList);
    await seedPokjaUser(prisma, userList);
    await seedPermintaanStatus(prisma, siswaList, kelasList, guruList);
    await seedFinalAbsensi(prisma, siswaList, kelasList);

    console.log("\n✅ Seeding selesai!");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());