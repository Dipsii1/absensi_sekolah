module.exports = async (prisma, siswaList, kelasList, guruList) => {
    console.log("📝 Seeding Permintaan Status Absensi...");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const permintaanData = [
        {
            siswa_idx: 0,
            kelas_idx: 0,
            guru_idx: 3,
            walas_idx: 0,
            status_lama: "Alpha",
            status_baru: "Sakit",
            keterangan: "Sakit demam, surat dokter ada",
            is_pending: false,
            is_approved: true,
        },
        {
            siswa_idx: 1,
            kelas_idx: 0,
            guru_idx: 4,
            walas_idx: 0,
            status_lama: "Alpha",
            status_baru: "Izin",
            keterangan: "Izin keperluan keluarga",
            is_pending: true,
            is_approved: false,
        },
        {
            siswa_idx: 2,
            kelas_idx: 0,
            guru_idx: 5,
            walas_idx: 0,
            status_lama: null,
            status_baru: "Sakit",
            keterangan: "Sakit perut",
            is_pending: false,
            is_approved: true,
            is_auto_approved: true,
        },
    ];

    const permintaanList = [];

    for (const data of permintaanData) {
        const siswa = siswaList[data.siswa_idx];
        const kelas = kelasList[data.kelas_idx];
        const guru = guruList[data.guru_idx];
        const walas = guruList[data.walas_idx];

        if (!siswa || !kelas || !guru || !walas) {
            console.log(`  ⚠ Data tidak lengkap, skip`);
            continue;
        }

        const expiresAt = new Date(today);
        expiresAt.setDate(expiresAt.getDate() + 7);

        const existing = await prisma.permintaanStatusAbsensi.findFirst({
            where: {
                siswa_id: siswa.id,
                tanggal: today,
                deleted_at: null,
            },
        });

        if (!existing) {
            const permintaan = await prisma.permintaanStatusAbsensi.create({
                data: {
                    siswa_id: siswa.id,
                    kelas_id: kelas.id,
                    guru_id: guru.id,
                    walas_id: walas.id,
                    tanggal: today,
                    status_lama: data.status_lama,
                    status_baru: data.status_baru,
                    keterangan: data.keterangan,
                    is_pending: data.is_pending,
                    is_approved: data.is_approved,
                    is_auto_approved: data.is_auto_approved || false,
                    expires_at: expiresAt,
                },
            });
            permintaanList.push(permintaan);
            console.log(`  ✔ ${siswa.nama} → ${data.status_baru} (${data.is_pending ? "pending" : "approved"})`);
        } else {
            permintaanList.push(existing);
            console.log(`  ✔ ${siswa.nama} → ${data.status_baru} (exists)`);
        }
    }

    return permintaanList;
};
