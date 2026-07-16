/**
 * Seed diverse finalAbsensi test data across multiple weeks/months
 * with varied statuses (Hadir, Izin, Sakit, Alpha).
 *
 * Usage:  node prisma/seed-final-absensi-diverse.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function toDateOnly(dateStr) {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

async function main() {
  console.log("\n🌱 Seeding diverse FinalAbsensi data...\n");

  // Get active students with their kelas
  const siswas = await prisma.siswa.findMany({
    where: { status_siswa:"Active", deleted_at: null },
    include: { kelas: true },
    orderBy: [{ kelas_id: "asc" }, { nama: "asc" }],
  });

  if (!siswas.length) {
    console.log("❌ No active students found. Run the main seeder first.");
    return;
  }

  console.log(`📋 Found ${siswas.length} active students\n`);

  // ── Define test dates across June–July 2026 (weekdays only) ────
  const testDates = [
    // June 2026
    "2026-06-01", // Senin
    "2026-06-02", // Selasa
    "2026-06-03", // Rabu
    "2026-06-08", // Senin
    "2026-06-09", // Selasa
    "2026-06-15", // Senin
    "2026-06-16", // Selasa
    "2026-06-22", // Senin
    "2026-06-23", // Selasa
    "2026-06-29", // Senin
    "2026-06-30", // Selasa
    // July 2026
    "2026-07-01", // Rabu
    "2026-07-06", // Senin
    "2026-07-07", // Selasa
    "2026-07-13", // Senin
    "2026-07-14", // Selasa (already seeded)
  ];

  // ── Status patterns for variety ────────────────────────────────
  // Each student gets a different pattern to create varied statuses
  const statusPatterns = [
    ["Hadir", "Hadir", "Hadir", "Hadir", "Izin", "Hadir", "Hadir", "Hadir", "Sakit", "Hadir", "Hadir", "Hadir", "Hadir", "Hadir", "Hadir", "Hadir"],
    ["Hadir", "Hadir", "Alpha", "Hadir", "Hadir", "Hadir", "Sakit", "Hadir", "Hadir", "Izin", "Hadir", "Hadir", "Alpha", "Hadir", "Hadir", "Hadir"],
    ["Hadir", "Izin", "Hadir", "Hadir", "Hadir", "Alpha", "Hadir", "Hadir", "Hadir", "Hadir", "Sakit", "Hadir", "Hadir", "Izin", "Hadir", "Hadir"],
    ["Sakit", "Hadir", "Hadir", "Izin", "Hadir", "Hadir", "Hadir", "Alpha", "Hadir", "Hadir", "Hadir", "Hadir", "Hadir", "Hadir", "Sakit", "Hadir"],
    ["Hadir", "Hadir", "Hadir", "Hadir", "Hadir", "Hadir", "Alpha", "Hadir", "Izin", "Hadir", "Hadir", "Sakit", "Hadir", "Hadir", "Hadir", "Alpha"],
    ["Alpha", "Hadir", "Hadir", "Hadir", "Sakit", "Hadir", "Hadir", "Izin", "Hadir", "Hadir", "Alpha", "Hadir", "Hadir", "Hadir", "Hadir", "Sakit"],
    ["Hadir", "Izin", "Hadir", "Sakit", "Hadir", "Hadir", "Hadir", "Hadir", "Alpha", "Hadir", "Hadir", "Hadir", "Izin", "Alpha", "Hadir", "Hadir"],
    ["Hadir", "Hadir", "Alpha", "Hadir", "Hadir", "Izin", "Hadir", "Sakit", "Hadir", "Hadir", "Hadir", "Hadir", "Hadir", "Hadir", "Hadir", "Izin"],
  ];

  let created = 0;
  let skipped = 0;

  for (const siswa of siswas) {
    const pattern = statusPatterns[siswa.id.charCodeAt(0) % statusPatterns.length];

    for (let i = 0; i < testDates.length; i++) {
      const tanggal = toDateOnly(testDates[i]);
      const status = pattern[i % pattern.length];

      // Skip if already exists
      const existing = await prisma.finalAbsensi.findUnique({
        where: { siswa_id_tanggal: { siswa_id: siswa.id, tanggal } },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Count statuses based on the final status
      const counts = { Hadir: 0, Izin: 0, Sakit: 0, Alpha: 0 };
      counts[status] = 2; // Simulate 2 mapel per day
      const total_mapel = 2;

      await prisma.finalAbsensi.create({
        data: {
          siswa_id: siswa.id,
          kelas_id: siswa.kelas_id,
          tanggal,
          status_final: status,
          total_hadir: counts.Hadir,
          total_izin: counts.Izin,
          total_sakit: counts.Sakit,
          total_alpha: counts.Alpha,
          total_mapel,
          is_finalized: true,
          finalized_at: new Date(),
        },
      });

      created++;
    }

    console.log(`  ✔ ${siswa.nama.padEnd(20)} | ${siswa.kelas?.kelas} ${siswa.kelas?.jurusan}`);
  }

  console.log(`\n✅ Done! Created: ${created} | Skipped (existing): ${skipped}`);

  // ── Summary ────────────────────────────────────────────────────
  const totalCount = await prisma.finalAbsensi.count();
  const dateCount = await prisma.finalAbsensi.groupBy({ by: ["tanggal"] });

  console.log(`\n📊 Total FinalAbsensi records: ${totalCount}`);
  console.log(`📅 Unique dates: ${dateCount.length}`);
  console.log(`   Dates: ${dateCount.map(d => d.tanggal.toISOString().slice(0, 10)).sort().join(", ")}`);

  // Status distribution
  const statusDist = await prisma.finalAbsensi.groupBy({
    by: ["status_final"],
    _count: true,
  });
  console.log(`\n📈 Status distribution:`);
  for (const s of statusDist) {
    console.log(`   ${s.status_final}: ${s._count}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
