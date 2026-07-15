module.exports = async (prisma, siswaList, kelasList) => {
    console.log("✅ Seeding Final Absensi...");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const finalData = [
        {
            siswa_idx: 0,
            kelas_idx: 0,
            total_hadir: 18,
            total_izin: 1,
            total_sakit: 2,
            total_alpha: 0,
            total_mapel: 21,
            status_final: "Hadir",
            is_finalized: true,
        },
        {
            siswa_idx: 1,
            kelas_idx: 0,
            total_hadir: 16,
            total_izin: 3,
            total_sakit: 1,
            total_alpha: 1,
            total_mapel: 21,
            status_final: "Hadir",
            is_finalized: true,
        },
        {
            siswa_idx: 2,
            kelas_idx: 0,
            total_hadir: 17,
            total_izin: 2,
            total_sakit: 2,
            total_alpha: 0,
            total_mapel: 21,
            status_final: "Hadir",
            is_finalized: true,
        },
        {
            siswa_idx: 3,
            kelas_idx: 0,
            total_hadir: 19,
            total_izin: 1,
            total_sakit: 0,
            total_alpha: 1,
            total_mapel: 21,
            status_final: "Hadir",
            is_finalized: true,
        },
    ];

    const finalList = [];

    for (const data of finalData) {
        const siswa = siswaList[data.siswa_idx];
        const kelas = kelasList[data.kelas_idx];

        if (!siswa || !kelas) {
            console.log(`  ⚠ Data tidak lengkap, skip`);
            continue;
        }

        const existing = await prisma.finalAbsensi.findFirst({
            where: {
                siswa_id: siswa.id,
                tanggal: today,
                deleted_at: null,
            },
        });

        if (!existing) {
            const final = await prisma.finalAbsensi.create({
                data: {
                    siswa_id: siswa.id,
                    kelas_id: kelas.id,
                    tanggal: today,
                    status_final: data.status_final,
                    total_hadir: data.total_hadir,
                    total_izin: data.total_izin,
                    total_sakit: data.total_sakit,
                    total_alpha: data.total_alpha,
                    total_mapel: data.total_mapel,
                    is_finalized: data.is_finalized,
                    finalized_at: data.is_finalized ? new Date() : null,
                },
            });
            finalList.push(final);
            console.log(`  ✔ ${siswa.nama} → ${data.status_final} (finalized: ${data.is_finalized})`);
        } else {
            finalList.push(existing);
            console.log(`  ✔ ${siswa.nama} → ${data.status_final} (exists)`);
        }
    }

    return finalList;
};
