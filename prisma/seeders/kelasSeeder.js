module.exports = async (prisma, tahunAktif, guruList) => {
    console.log("🏫 Seeding Kelas...");

    if (!tahunAktif) {
        throw new Error("❌ tahunAktif undefined!");
    }

    const kelasData = [
        { kelas: "X",   jurusan: "Rekayasa Perangkat Lunak", tahun_ajaran_id: tahunAktif.id, walas_id: guruList[0].id },
        { kelas: "XI",  jurusan: "Rekayasa Perangkat Lunak", tahun_ajaran_id: tahunAktif.id, walas_id: guruList[1].id },
        { kelas: "XII", jurusan: "Rekayasa Perangkat Lunak", tahun_ajaran_id: tahunAktif.id, walas_id: guruList[2].id },
        { kelas: "X",   jurusan: "Teknik Komputer Jaringan", tahun_ajaran_id: tahunAktif.id, walas_id: guruList[3].id },
        { kelas: "XI",  jurusan: "Teknik Komputer Jaringan", tahun_ajaran_id: tahunAktif.id, walas_id: guruList[4].id },
        { kelas: "X",   jurusan: "Multimedia",               tahun_ajaran_id: tahunAktif.id, walas_id: guruList[5].id },
    ];

    const kelasList = [];

    for (const data of kelasData) {
        const kelas = await prisma.kelas.upsert({
            where: {
                kelas_jurusan_tahun_ajaran_id: {
                    kelas: data.kelas,
                    jurusan: data.jurusan,
                    tahun_ajaran_id: data.tahun_ajaran_id,
                },
            },
            update: {},
            create: data,
        });

        kelasList.push(kelas);
        console.log(`  ✔ Kelas ${kelas.kelas} - ${kelas.jurusan}`);
    }

    return kelasList;
};