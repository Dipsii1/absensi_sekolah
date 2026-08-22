/**
 * Seed Final Absensi Dummy
 *
 * Jalankan:
 * node prisma/seed-final-absensi.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function getDates() {
  return [
    "2026-06-10",
    "2026-06-11",
    "2026-06-12",
    "2026-08-05",
    "2026-08-06",
    "2026-08-07",
    "2026-12-14",
    "2026-12-15",
    "2026-12-16",
  ].map((d) => new Date(`${d}T00:00:00.000Z`));
}

async function main() {
  console.log("🌱 Memulai seeding Final Absensi...\n");

  console.log("🗑 Menghapus data Final Absensi lama...");
  await prisma.finalAbsensi.deleteMany({});

  const siswa = await prisma.siswa.findMany({
    where: {
      deleted_at: null,
      kelas_id: {
        not: null,
      },
    },
    include: {
      kelas: {
        include: {
          tahun: true,
        },
      },
    },
    orderBy: {
      nama: "asc",
    },
  });

  if (!siswa.length) {
    console.log("Tidak ada siswa.");
    return;
  }

  const dates = getDates();

  const statuses = ["Hadir", "Izin", "Sakit", "Alpha"];

  let totalCreated = 0;

  for (const s of siswa) {
    for (const tanggal of dates) {
      const status =
        statuses[Math.floor(Math.random() * statuses.length)];

      const totalMapel = 2;

      const data = {
        Hadir: 0,
        Izin: 0,
        Sakit: 0,
        Alpha: 0,
      };

      if (status === "Hadir") data.Hadir = totalMapel;
      if (status === "Izin") data.Izin = totalMapel;
      if (status === "Sakit") data.Sakit = totalMapel;
      if (status === "Alpha") data.Alpha = totalMapel;

      await prisma.finalAbsensi.create({
        data: {
          siswa_id: s.id,

          // Selalu mengikuti kelas siswa saat ini
          kelas_id: s.kelas_id,

          tanggal,

          status_final: status,

          total_hadir: data.Hadir,
          total_izin: data.Izin,
          total_sakit: data.Sakit,
          total_alpha: data.Alpha,

          total_mapel: totalMapel,

          is_finalized: true,
          finalized_at: new Date(),
        },
      });

      totalCreated++;
    }
  }

  console.log("\n==================================");
  console.log(`👨‍🎓 Total siswa : ${siswa.length}`);
  console.log(`📅 Total tanggal : ${dates.length}`);
  console.log(`✅ Final Absensi dibuat : ${totalCreated}`);
  console.log("==================================");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });