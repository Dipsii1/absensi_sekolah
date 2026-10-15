module.exports = async (prisma) => {
    console.log("👨‍👩‍👧 Seeding Orang Tua...");

    const orangTuaData = [
        {
            NIK: "3201010101800001",
            nama_orangtua: "Hendra Wijaya",
            nomor_telepon: "081300000001",
            pekerjaan: "Wiraswasta",
            alamat: "Jl. Merdeka No. 1, Jakarta Selatan"
        },
        {
            NIK: "3201010101800002",
            nama_orangtua: "Sri Mulyani",
            nomor_telepon: "081300000002",
            pekerjaan: "Ibu Rumah Tangga",
            alamat: "Jl. Sudirman No. 2, Jakarta Pusat"
        },
        {
            NIK: "3201010101800003",
            nama_orangtua: "Bambang Susilo",
            nomor_telepon: "081300000003",
            pekerjaan: "PNS",
            alamat: "Jl. Gatot Subroto No. 3, Jakarta Barat"
        },
        {
            NIK: "3201010101800004",
            nama_orangtua: "Yuliani Putri",
            nomor_telepon: "081300000004",
            pekerjaan: "Guru",
            alamat: "Jl. Kebon Jeruk No. 4, Jakarta Barat"
        },
        {
            NIK: "3201010101800005",
            nama_orangtua: "Agus Salim",
            nomor_telepon: "081300000005",
            pekerjaan: "Pedagang",
            alamat: "Jl. Mangga Besar No. 5, Jakarta Utara"
        },
        {
            NIK: "3201010101800006",
            nama_orangtua: "Nurhasanah",
            nomor_telepon: "081300000006",
            pekerjaan: "Ibu Rumah Tangga",
            alamat: "Jl. Pluit No. 6, Jakarta Utara"
        },
        {
            NIK: "3201010101800007",
            nama_orangtua: "Darmanto",
            nomor_telepon: "081300000007",
            pekerjaan: "Buruh",
            alamat: "Jl. Cakung No. 7, Jakarta Timur"
        },
        {
            NIK: "3201010101800008",
            nama_orangtua: "Wulandari",
            nomor_telepon: "081300000008",
            pekerjaan: "Karyawan Swasta",
            alamat: "Jl. Duren Sawit No. 8, Jakarta Timur"
        },
        {
            NIK: "3201010101800009",
            nama_orangtua: "Sugiono",
            nomor_telepon: "081300000009",
            pekerjaan: "Wiraswasta",
            alamat: "Jl. Pasar Minggu No. 9, Jakarta Selatan"
        },
        {
            NIK: "3201010101800010",
            nama_orangtua: "Ratna Sari",
            nomor_telepon: "081300000010",
            pekerjaan: "Perawat",
            alamat: "Jl. Kebayoran No. 10, Jakarta Selatan"
        },
        {
            NIK: "3201010101800011",
            nama_orangtua: "Kurniawan",
            nomor_telepon: "081300000011",
            pekerjaan: "Teknisi",
            alamat: "Jl. Puri Kembangan No. 11, Jakarta Barat"
        },
        {
            NIK: "3201010101800012",
            nama_orangtua: "Mardiyah",
            nomor_telepon: "081300000012",
            pekerjaan: "Ibu Rumah Tangga",
            alamat: "Jl. Tomang No. 12, Jakarta Barat"
        },
    ];

    const orangTuaList = [];

    for (const data of orangTuaData) {
        // Cek berdasarkan NIK karena unique
        const existing = await prisma.orangTua.findFirst({
            where: {
                NIK: data.NIK,
                deleted_at: null
            },
        });

        const ot = existing
            ? existing
            : await prisma.orangTua.create({ data });

        orangTuaList.push(ot);
        console.log(`  ✔ ${ot.nama_orangtua}`);
    }

    console.log(`✅ Seeding Orang Tua selesai (${orangTuaList.length} data)`);
    return orangTuaList;
};