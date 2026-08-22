const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`
SELECT
    s.nama,
    s.kelas_id AS kelas_siswa,

    ks.kelas AS kelas_siswa_nama,
    ts.tahun_ajaran AS tahun_siswa,

    fa.kelas_id AS kelas_absensi,

    ka.kelas AS kelas_absensi_nama,
    ta.tahun_ajaran AS tahun_absensi

FROM final_absensi fa

JOIN siswa s
ON s.id = fa.siswa_id

JOIN kelas ks
ON s.kelas_id = ks.id

JOIN tahun_ajaran ts
ON ks.tahun_ajaran_id = ts.id

JOIN kelas ka
ON fa.kelas_id = ka.id

JOIN tahun_ajaran ta
ON ka.tahun_ajaran_id = ta.id

LIMIT 20;
  `;

  console.table(result);
}

main()
  .finally(() => prisma.$disconnect());