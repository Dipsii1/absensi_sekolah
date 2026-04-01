module.exports = async (prisma) => {
    console.log("📖 Seeding Mata Pelajaran...");

    const mapelNama = [
        "Matematika",
        "Bahasa Indonesia",
        "Bahasa Inggris",
        "Fisika",
        "Pemrograman Web",
        "Jaringan Komputer",
        "Basis Data",
        "Desain Grafis",
    ];

    const mapelList = [];

    for (const nama_mapel of mapelNama) {
        const existing = await prisma.mataPelajaran.findFirst({
            where: {
                nama_mapel,
                deleted_at: null
            },
        });

        const mapel = existing
            ? existing
            : await prisma.mataPelajaran.create({
                data: { nama_mapel }
            });

        mapelList.push(mapel);

        console.log(`  ✔ ${mapel.nama_mapel}`);
    }

    return mapelList;
};