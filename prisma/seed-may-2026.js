const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { simpanFinalAbsensi } = require("../src/services/finalAbsensi");

function toDateOnly(dateStr) {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

async function main() {
  console.log("\n🌱 Seeding full Absensi data for May 2026...\n");

  const siswas = await prisma.siswa.findMany({
    where: { deleted_at: null },
    include: { kelas: true },
    orderBy: [{ kelas_id: "asc" }, { nama: "asc" }],
  });

  if (!siswas.length) {
    console.log("❌ No active students found.");
    return;
  }
  console.log(`📋 Found ${siswas.length} active students`);

  // Define dates for May 2026 (weekdays)
  const mayDates = [];
  for (let i = 1; i <= 31; i++) {
    const d = new Date(`2026-05-${i.toString().padStart(2, "0")}T00:00:00.000Z`);
    const day = d.getDay();
    if (day !== 0 && day !== 6) { // Skip weekends
      mayDates.push(d.toISOString().slice(0, 10));
    }
  }

  const statusPatterns = [
    ["Hadir", "Hadir", "Hadir", "Hadir", "Izin", "Hadir", "Hadir", "Hadir", "Sakit", "Hadir", "Hadir", "Hadir", "Hadir", "Hadir", "Hadir", "Hadir"],
    ["Hadir", "Hadir", "Alpha", "Hadir", "Hadir", "Hadir", "Sakit", "Hadir", "Hadir", "Izin", "Hadir", "Hadir", "Alpha", "Hadir", "Hadir", "Hadir"],
    ["Hadir", "Izin", "Hadir", "Hadir", "Hadir", "Alpha", "Hadir", "Hadir", "Hadir", "Hadir", "Sakit", "Hadir", "Hadir", "Izin", "Hadir", "Hadir"],
  ];

  let created = 0;

  for (const siswa of siswas) {
    if (!siswa.kelas?.walas_id) continue;
    
    const pattern = statusPatterns[siswa.id.charCodeAt(0) % statusPatterns.length];

    for (let i = 0; i < mayDates.length; i++) {
      const tanggalStr = mayDates[i];
      const tanggal = toDateOnly(tanggalStr);
      const status = pattern[i % pattern.length];

      // Create AbsensiSiswa
      let absensi = await prisma.absensiSiswa.findFirst({
        where: { siswa_id: siswa.id, tanggal }
      });

      if (!absensi) {
        absensi = await prisma.absensiSiswa.create({
          data: {
            siswa_id: siswa.id,
            tanggal,
            status_harian: status,
          }
        });

        // Create DetailAbsensiSiswa (simulating walas input)
        await prisma.detailAbsensiSiswa.create({
          data: {
            absensi_id: absensi.id,
            guru_id: siswa.kelas.walas_id,
            status,
            jam_absen: new Date(),
          }
        });

        // Use the service to generate FinalAbsensi so it's perfectly in sync
        await simpanFinalAbsensi(siswa.id, siswa.kelas_id, tanggal);
        created++;
      }
    }
    console.log(`  ✔ Seeded May 2026 for ${siswa.nama.padEnd(20)} | ${siswa.kelas?.kelas} ${siswa.kelas?.jurusan}`);
  }

  console.log(`\n✅ Done! Created Absensi records: ${created}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
