module.exports = async (prisma) => {
    console.log("👨‍🏫 Seeding Guru...");

    const guruData = [
        {
            NIP: "198501012010011001",
            nama: "Budi Santoso",
            nomor_telepon: "081234567890",
            alamat: "Jl. Merdeka No. 10, Jakarta",
            tanggal_lahir: new Date("1985-01-01"),
        },
        {
            NIP: "198702152011012002",
            nama: "Siti Rahayu",
            nomor_telepon: "081234567891",
            alamat: "Jl. Sudirman No. 22, Jakarta",
            tanggal_lahir: new Date("1987-02-15"),
        },
        {
            NIP: "199003202012011003",
            nama: "Ahmad Fauzi",
            nomor_telepon: "081234567892",
            alamat: "Jl. Gatot Subroto No. 5, Bandung",
            tanggal_lahir: new Date("1990-03-20"),
        },
        {
            NIP: "199205102013012004",
            nama: "Dewi Lestari",
            nomor_telepon: "081234567893",
            alamat: "Jl. Diponegoro No. 8, Surabaya",
            tanggal_lahir: new Date("1992-05-10"),
        },
        {
            NIP: "198808252014011005",
            nama: "Eko Prasetyo",
            nomor_telepon: "081234567894",
            alamat: "Jl. Ahmad Yani No. 15, Semarang",
            tanggal_lahir: new Date("1988-08-25"),
        },
        {
            NIP: "199107312015012006",
            nama: "Fitri Handayani",
            nomor_telepon: "081234567895",
            alamat: "Jl. Pemuda No. 3, Yogyakarta",
            tanggal_lahir: new Date("1991-07-31"),
        },
    ];

    const guruList = [];

    for (const data of guruData) {
        const guru = await prisma.guru.upsert({
            where: { NIP: data.NIP },
            update: {},
            create: data,
        });

        guruList.push(guru);

        console.log(`  ✔ ${guru.nama} (NIP: ${guru.NIP})`);
    }

    return guruList;
};