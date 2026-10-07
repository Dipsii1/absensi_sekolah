const prisma = require("../config/prisma");

const KEPUTUSAN_NAIK = "Naik";
const KEPUTUSAN_TINGGAL = "Tinggal";
const KEPUTUSAN_LULUS = "Lulus";

// Generate rentang tahun ajaran 
const generateTahunAjaran = (date = new Date()) => {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const startYear = month >= 7 ? year : year - 1;
    const endYear = startYear + 1;

    return {
        tahun_ajaran: `${startYear}/${endYear}`,
        tanggal_mulai: new Date(startYear, 6, 1),  // 1 Juli
        tanggal_selesai: new Date(endYear, 5, 30),   // 30 Juni
    };
};

// Naikkan tingkat kelas (X → XI, XI → XII).
// XII tidak boleh naik — harusnya Lulus (ditangani di luar fungsi ini).
const naikkanTingkat = (tingkat) => {
    if (/^XII/i.test(tingkat)) return tingkat;
    if (/^XI/i.test(tingkat)) return tingkat.replace(/^XI/i, "XII");
    if (/^X/i.test(tingkat)) return tingkat.replace(/^X/i, "XI");
    return tingkat;
};

// Cari atau buat kelas tujuan untuk carry-over siswa yang naik/tinggal kelas. Gunakan cache untuk menghindari query berulang.
const findOrCreateKelasTujuan = async (cache, tingkat, jurusan, tahunBaruId) => {
    const cacheKey = `${tingkat}__${jurusan}__${tahunBaruId}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    let kelasTujuan = await prisma.kelas.findFirst({
        where: { kelas: tingkat, jurusan, tahun_ajaran_id: tahunBaruId, deleted_at: null },
    });

    if (!kelasTujuan) {
        kelasTujuan = await prisma.kelas.create({
            data: {
                kelas: tingkat,
                jurusan,
                tahun_ajaran_id: tahunBaruId,
                walas_id: null,
                telegram_group_id: null,
            },
        });
    }

    cache.set(cacheKey, kelasTujuan);
    return kelasTujuan;
};

const carryOverKelas = async (tahunLamaId, tahunBaruId) => {
    const kelasLama = await prisma.kelas.findMany({
        where: {
            tahun_ajaran_id: tahunLamaId,
            deleted_at: null,
        },
        include: {
            siswa: {
                where: { deleted_at: null },
                select: { id: true },
            },
        },
    });

    if (kelasLama.length === 0) {
        console.log("[CARRY-OVER] Tidak ada kelas yang perlu dipindahkan.");
        return;
    }

    const allSiswaIds = kelasLama.flatMap((k) => k.siswa.map((s) => s.id));

    const keputusanList = allSiswaIds.length
        ? await prisma.kenaikanKelas.findMany({
              where: { tahun_ajaran_id: tahunLamaId, siswa_id: { in: allSiswaIds } },
          })
        : [];
    const keputusanMap = new Map(keputusanList.map((k) => [k.siswa_id, k.keputusan]));

    const kelasTujuanCache = new Map();
    const lulusIds = [];
    let totalNaik = 0;
    let totalTinggal = 0;

    for (const kelas of kelasLama) {
        const isKelasAkhir = kelas.kelas.toUpperCase() === "XII";

        const naikIds = [];
        const tinggalIds = [];
        let lulusDiKelasIni = 0;

        for (const siswa of kelas.siswa) {
            const keputusan = keputusanMap.get(siswa.id) || (isKelasAkhir ? KEPUTUSAN_LULUS : KEPUTUSAN_NAIK);

            if (keputusan === KEPUTUSAN_LULUS) {
                lulusIds.push(siswa.id);
                lulusDiKelasIni++;
            } else if (keputusan === KEPUTUSAN_TINGGAL) {
                tinggalIds.push(siswa.id);
            } else {
                naikIds.push(siswa.id);
            }
        }

        if (naikIds.length > 0) {
            const tujuan = await findOrCreateKelasTujuan(
                kelasTujuanCache,
                naikkanTingkat(kelas.kelas),
                kelas.jurusan,
                tahunBaruId
            );
            await prisma.siswa.updateMany({
                where: { id: { in: naikIds } },
                data: { kelas_id: tujuan.id, updated_at: new Date() },
            });
            totalNaik += naikIds.length;
        }

        if (tinggalIds.length > 0) {
            const tujuan = await findOrCreateKelasTujuan(
                kelasTujuanCache,
                kelas.kelas,
                kelas.jurusan,
                tahunBaruId
            );
            await prisma.siswa.updateMany({
                where: { id: { in: tinggalIds } },
                data: { kelas_id: tujuan.id, updated_at: new Date() },
            });
            totalTinggal += tinggalIds.length;
        }

        console.log(
            `[CARRY-OVER] ${kelas.kelas} ${kelas.jurusan}: ` +
            `${naikIds.length} naik, ${tinggalIds.length} tinggal kelas, ${lulusDiKelasIni} lulus/keluar.`
        );
    }

    if (lulusIds.length > 0) {
        await prisma.siswa.updateMany({
            where: { id: { in: lulusIds } },
            data: { kelas_id: null, status_siswa: "Alumni", updated_at: new Date() },
        });
    }

    console.log(
        `[CARRY-OVER] Selesai. Naik: ${totalNaik} | Tinggal kelas: ${totalTinggal} | Lulus: ${lulusIds.length} | ` +
        `${kelasTujuanCache.size} kelas tujuan digunakan/dibuat.`
    );
};

// Auto-create tahun ajaran baru 
const autoCreateTahunAjaran = async (date = new Date()) => {
    const { tahun_ajaran, tanggal_mulai, tanggal_selesai } = generateTahunAjaran(date);

    // 1. Sudah ada dan aktif → skip
    const existing = await prisma.tahun.findFirst({
        where: { tahun_ajaran, deleted_at: null },
    });
    if (existing) {
        console.log(`[AUTO-CREATE] Tahun ajaran ${tahun_ajaran} sudah ada, skip.`);
        return existing;
    }

    // 2. Pernah dibuat tapi soft-deleted → restore (tanpa carry-over ulang)
    const deletedTahun = await prisma.tahun.findFirst({
        where: { tahun_ajaran },
    });
    if (deletedTahun?.deleted_at) {
        const restored = await prisma.tahun.update({
            where: { id: deletedTahun.id },
            data: {
                deleted_at: null,
                is_active: true,
                tanggal_mulai,
                tanggal_selesai,
                updated_at: new Date(),
            },
        });
        console.log(`[AUTO-RESTORE] Tahun ajaran dipulihkan: ${tahun_ajaran}`);
        return restored;
    }

    // 3. Simpan referensi tahun aktif sekarang (sumber carry-over)
    const tahunAktif = await prisma.tahun.findFirst({
        where: { is_active: true, deleted_at: null },
    });

    // 4. Nonaktifkan semua tahun ajaran sebelumnya
    await prisma.tahun.updateMany({
        where: { is_active: true, deleted_at: null },
        data: { is_active: false, updated_at: new Date() },
    });

    // 5. Buat tahun ajaran baru
    const newTahun = await prisma.tahun.create({
        data: {
            tahun_ajaran,
            tanggal_mulai,
            tanggal_selesai,
            is_active: true,
        },
    });

    console.log(
        `[AUTO-CREATE] Tahun ajaran baru: ${tahun_ajaran} | ` +
        `Mulai: ${tanggal_mulai.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })} | ` +
        `Selesai: ${tanggal_selesai.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`
    );

    // 6. Carry-over kelas dari tahun aktif sebelumnya (menghormati keputusan kenaikan per-siswa)
    if (tahunAktif) {
        console.log(`[CARRY-OVER] Memindahkan kelas dari ${tahunAktif.tahun_ajaran} → ${tahun_ajaran}...`);
        await carryOverKelas(tahunAktif.id, newTahun.id);
    } else {
        console.log("[CARRY-OVER] Tidak ada tahun aktif sebelumnya, skip carry-over.");
    }

    return newTahun;
};

module.exports = {
    generateTahunAjaran,
    naikkanTingkat,
    autoCreateTahunAjaran,
};