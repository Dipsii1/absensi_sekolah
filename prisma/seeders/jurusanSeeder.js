module.exports = async (prisma) => {
    console.log("📚 Seeding Jurusan...");

    const jurusanData = [
        { nama_jurusan: "Teknik Komputer dan Jaringan" },
        { nama_jurusan: "Rekayasa Perangkat Lunak" },
        { nama_jurusan: "Multimedia" },
        { nama_jurusan: "Akuntansi" },
        { nama_jurusan: "Administrasi Perkantoran" },
    ];

    const jurusanList = [];

    for (const data of jurusanData) {
        const jurusan = await prisma.jurusan.upsert({
            where: { nama_jurusan: data.nama_jurusan },
            update: {},
            create: data,
        });

        jurusanList.push(jurusan);

        console.log(`  ✔ ${jurusan.nama_jurusan}`);
    }

    return jurusanList;
};