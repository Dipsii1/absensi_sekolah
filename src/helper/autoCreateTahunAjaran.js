const prisma = require("../config/prisma");

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

// Naikkan tingkat kelas (X → XI, XI → XII)  
const naikkanTingkat = (tingkat) => {
    // "XI..." → "XII..."
    if (/^XI/i.test(tingkat)) return tingkat.replace(/^XI/i, "XII");
    // "X..." → "XI..."
    if (/^X/i.test(tingkat)) return tingkat.replace(/^X/i, "XI");
    return tingkat;
};

// Carry-over kelas ke tahun ajaran baru  
const carryOverKelas = async (tahunLamaId, tahunBaruId) => {
    const kelasLama = await prisma.Kelas.findMany({
        where: {
            tahun_ajaran_id: tahunLamaId,
            deleted_at: null,
            NOT: { kelas: "XII" },
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

    for (const kelas of kelasLama) {
        const tingkatBaru = naikkanTingkat(kelas.kelas);

        const kelasBaru = await prisma.Kelas.create({
            data: {
                kelas: tingkatBaru,
                jurusan: kelas.jurusan,
                tahun_ajaran_id: tahunBaruId,
                walas_id: null,
                telegram_group_id: null,
            },
        });

        console.log(
            `[CARRY-OVER] ${kelas.kelas} ${kelas.jurusan} → ` +
            `${tingkatBaru} ${kelas.jurusan} ` +
            `(${kelas.siswa.length} siswa)`
        );

        if (kelas.siswa.length > 0) {
            await prisma.Siswa.updateMany({
                where: { id: { in: kelas.siswa.map((s) => s.id) } },
                data: { kelas_id: kelasBaru.id, updated_at: new Date() },
            });
        }
    }

    console.log(`[CARRY-OVER] Selesai. ${kelasLama.length} kelas berhasil dipindahkan.`);
};

// Auto-create tahun ajaran baru 
const autoCreateTahunAjaran = async (date = new Date()) => {
    const { tahun_ajaran, tanggal_mulai, tanggal_selesai } = generateTahunAjaran(date);

    // 1. Sudah ada dan aktif → skip
    const existing = await prisma.Tahun.findFirst({
        where: { tahun_ajaran, deleted_at: null },
    });
    if (existing) {
        console.log(`[AUTO-CREATE] Tahun ajaran ${tahun_ajaran} sudah ada, skip.`);
        return existing;
    }

    // 2. Pernah dibuat tapi soft-deleted → restore (tanpa carry-over ulang)
    const deletedTahun = await prisma.Tahun.findFirst({
        where: { tahun_ajaran },
    });
    if (deletedTahun?.deleted_at) {
        const restored = await prisma.Tahun.update({
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
    const tahunAktif = await prisma.Tahun.findFirst({
        where: { is_active: true, deleted_at: null },
    });

    // 4. Nonaktifkan semua tahun ajaran sebelumnya
    await prisma.Tahun.updateMany({
        where: { is_active: true, deleted_at: null },
        data: { is_active: false, updated_at: new Date() },
    });

    // 5. Buat tahun ajaran baru
    const newTahun = await prisma.Tahun.create({
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

    // 6. Carry-over kelas dari tahun aktif sebelumnya
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
    autoCreateTahunAjaran,
};