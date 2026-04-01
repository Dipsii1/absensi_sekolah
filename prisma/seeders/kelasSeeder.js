module.exports = async (prisma, jurusanList, tahunAktif, guruList) => {
    console.log("🏫 Seeding Kelas...");

    if (!tahunAktif) {
        throw new Error("❌ tahunAktif undefined!");
    }

    const kelasData = [
        { kelas: "X",   jurusan_id: jurusanList[0].id, tahun_ajaran_id: tahunAktif.id, walas_id: guruList[0].id },
        { kelas: "XI",  jurusan_id: jurusanList[0].id, tahun_ajaran_id: tahunAktif.id, walas_id: guruList[1].id },
        { kelas: "XII", jurusan_id: jurusanList[0].id, tahun_ajaran_id: tahunAktif.id, walas_id: guruList[2].id },
        { kelas: "X",   jurusan_id: jurusanList[1].id, tahun_ajaran_id: tahunAktif.id, walas_id: guruList[3].id },
        { kelas: "XI",  jurusan_id: jurusanList[1].id, tahun_ajaran_id: tahunAktif.id, walas_id: guruList[4].id },
        { kelas: "X",   jurusan_id: jurusanList[2].id, tahun_ajaran_id: tahunAktif.id, walas_id: guruList[5].id },
    ];

    const kelasList = [];

    for (const data of kelasData) {
        const kelas = await prisma.kelas.upsert({
            where: {
                kelas_jurusan_id_tahun_ajaran_id: {
                    kelas: data.kelas,
                    jurusan_id: data.jurusan_id,
                    tahun_ajaran_id: data.tahun_ajaran_id,
                },
            },
            update: {},
            create: data,
        });

        kelasList.push(kelas);
        console.log(`  ✔ Kelas ${kelas.kelas}`);
    }

    return kelasList;
};