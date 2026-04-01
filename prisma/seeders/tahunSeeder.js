module.exports = async (prisma) => {
    console.log("📅 Seeding Tahun Ajaran...");

    const tahunData = [
        {
            tahun_ajaran: "2023/2024",
            tanggal_mulai: new Date("2023-07-01"),
            tanggal_selesai: new Date("2024-06-30"),
            is_active: false,
        },
        {
            tahun_ajaran: "2024/2025",
            tanggal_mulai: new Date("2024-07-01"),
            tanggal_selesai: new Date("2025-06-30"),
            is_active: true,
        },
    ];

    const tahunList = [];

    for (const data of tahunData) {
        const tahun = await prisma.tahun.upsert({
            where: { tahun_ajaran: data.tahun_ajaran },
            update: {},
            create: data,
        });

        tahunList.push(tahun);
        console.log(`  ✔ ${tahun.tahun_ajaran}`);
    }

    const tahunAktif = tahunList.find((t) => t.is_active);

    if (!tahunAktif) {
        throw new Error("❌ Tidak ada tahun aktif!");
    }

    return { tahunList, tahunAktif };
};