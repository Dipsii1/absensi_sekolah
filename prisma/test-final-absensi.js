/**
 * Test script for final-absensi auto-finalization.
 *
 * 1. Seeds AbsensiSiswa + DetailAbsensiSiswa for a test date (2026-07-14, Senin)
 * 2. Calls GET /api/v1/final-absensi?tanggal=2026-07-14&include_empty=false
 *    to verify auto-finalization kicks in and returns data
 *
 * Usage:  node prisma/test-final-absensi.js
 */

const { PrismaClient } = require("@prisma/client");
const http = require("http");

const prisma = new PrismaClient();

const TEST_DATE = "2026-07-14"; // Senin — jadwal exists for all classes
const BASE_URL = "http://localhost:3000";

// ─── helpers ──────────────────────────────────────────────────────
function toDateOnly(dateStr) {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(body);
        }
      });
    }).on("error", reject);
  });
}

// ─── main ─────────────────────────────────────────────────────────
async function main() {
  const tanggal = toDateOnly(TEST_DATE);
  const hari = ["MINGGU", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][tanggal.getUTCDay()];
  console.log(`\n🧪 Testing final-absensi auto-finalization`);
  console.log(`   Test date : ${TEST_DATE} (${hari})\n`);

  // ── 1. Seed AbsensiSiswa + Detail ──────────────────────────────
  const siswas = await prisma.siswa.findMany({
    where: { status_siswa: "Active", deleted_at: null },
    include: { kelas: true },
    orderBy: { nama: "asc" },
  });

  console.log(`📋 Found ${siswas.length} active students`);

  // Find jadwal for this day of the week
  const jadwals = await prisma.jadwal.findMany({
    where: { hari, deleted_at: null },
    orderBy: [{ kelas_id: "asc" }, { jam_mulai: "asc" }],
  });

  console.log(`🗓️  Found ${jadwals.length} jadwal for ${hari}\n`);

  if (jadwals.length === 0) {
    console.log("⚠️  No jadwal for this day — cannot seed absensi. Exiting.");
    return;
  }

  let seeded = 0;
  const statusCycle = ["Hadir", "Hadir", "Hadir", "Hadir", "Izin", "Sakit", "Alpha"];

  for (const siswa of siswas) {
    // Check if absensi already exists
    const existing = await prisma.absensiSiswa.findFirst({
      where: { siswa_id: siswa.id, tanggal, deleted_at: null },
    });
    if (existing) {
      console.log(`  ⏭  ${siswa.nama} — already has absensi`);
      continue;
    }

    // Get jadwal for this student's class
    const kelasJadwal = jadwals.filter((j) => j.kelas_id === siswa.kelas_id);
    if (kelasJadwal.length === 0) continue;

    // Create AbsensiSiswa
    const tapIn = new Date(tanggal);
    tapIn.setUTCHours(7, 0 + Math.floor(Math.random() * 30), 0, 0);

    const absensi = await prisma.absensiSiswa.create({
      data: {
        siswa_id: siswa.id,
        tanggal,
        tap_in: tapIn,
        status_tapin: tapIn.getUTCHours() < 7 ? "Tepat_Waktu" : "Terlambat",
      },
    });

    // Create DetailAbsensiSiswa for each jadwal
    const statuses = kelasJadwal.map((_, i) => statusCycle[(seeded + i) % statusCycle.length]);

    for (let i = 0; i < kelasJadwal.length; i++) {
      await prisma.detailAbsensiSiswa.create({
        data: {
          absensi_id: absensi.id,
          jadwal_id: kelasJadwal[i].id,
          guru_id: kelasJadwal[i].guru_id,
          status: statuses[i],
          jam_absen: tapIn,
        },
      });
    }

    seeded++;
    console.log(`  ✔ ${siswa.nama.padEnd(20)} | ${kelasJadwal.length} mapel | ${statuses.join(", ")}`);
  }

  console.log(`\n✅ Seeded ${seeded} students with absensi for ${TEST_DATE}\n`);

  // ── 2. Verify: check absensiSiswa count ────────────────────────
  const absensiCount = await prisma.absensiSiswa.count({
    where: { tanggal, deleted_at: null },
  });
  console.log(`📊 AbsensiSiswa records for ${TEST_DATE}: ${absensiCount}`);

  const detailCount = await prisma.detailAbsensiSiswa.count({
    where: { absensi: { tanggal, deleted_at: null }, deleted_at: null },
  });
  console.log(`📊 DetailAbsensiSiswa records for ${TEST_DATE}: ${detailCount}`);

  const finalCount = await prisma.finalAbsensi.count({
    where: { tanggal, deleted_at: null },
  });
  console.log(`📊 FinalAbsensi records for ${TEST_DATE}: ${finalCount} (should be 0 before API call)\n`);

  // ── 3. Test the API ────────────────────────────────────────────
  console.log(`🌐 Calling GET ${BASE_URL}/api/v1/final-absensi?tanggal=${TEST_DATE}&include_empty=false`);
  console.log(`   (Note: endpoint requires auth — testing without auth first to see response)\n`);

  try {
    const res = await httpGet(`/api/v1/final-absensi?tanggal=${TEST_DATE}&include_empty=false&limit=10`);

    if (res?.success) {
      console.log(`✅ API Response: success=true`);
      console.log(`   Message: ${res.message}`);
      console.log(`   Data rows: ${res.data?.length || 0}`);
      console.log(`   Pagination:`, JSON.stringify(res.pagination));

      if (res.data?.length > 0) {
        console.log(`\n   Sample rows:`);
        for (const row of res.data.slice(0, 5)) {
          console.log(`   - ${row.nama} (${row.NISN}) | ${row.kelas?.kelas} ${row.kelas?.jurusan} | Status: ${row.status_final} | Hadir: ${row.total_hadir} Izin: ${row.total_izin} Sakit: ${row.total_sakit} Alpha: ${row.total_alpha}`);
        }
      }
    } else {
      console.log(`⚠️  API Response:`, JSON.stringify(res, null, 2));
    }
  } catch (err) {
    console.log(`❌ API call failed: ${err.message}`);
    console.log(`   (Server may not be running — start with: cd absensi_sekolah && node app.js)`);
  }

  // ── 4. Verify: check finalAbsensi count after API call ──────────
  const finalCountAfter = await prisma.finalAbsensi.count({
    where: { tanggal, deleted_at: null },
  });
  console.log(`\n📊 FinalAbsensi records for ${TEST_DATE} after API call: ${finalCountAfter}`);

  if (finalCountAfter > 0) {
    console.log(`✅ Auto-finalization worked! ${finalCountAfter} records created.\n`);
  } else if (finalCountAfter === 0 && absensiCount > 0) {
    console.log(`⚠️  No finalAbsensi records created — server may not be running (auto-finalize happens on API call)`);
    console.log(`   Start the server first: cd absensi_sekolah && node app.js`);
    console.log(`   Then re-run this script or call the API manually.\n`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
