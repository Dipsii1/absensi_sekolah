module.exports = async (prisma) => {
    console.log("👨‍👩‍👧 Seeding Orang Tua...");

    const orangTuaData = [
        { nama_orangtua: "Hendra Wijaya",  nomor_telepon: "081300000001" },
        { nama_orangtua: "Sri Mulyani",    nomor_telepon: "081300000002" },
        { nama_orangtua: "Bambang Susilo", nomor_telepon: "081300000003" },
        { nama_orangtua: "Yuliani Putri",  nomor_telepon: "081300000004" },
        { nama_orangtua: "Agus Salim",     nomor_telepon: "081300000005" },
        { nama_orangtua: "Nurhasanah",     nomor_telepon: "081300000006" },
        { nama_orangtua: "Darmanto",       nomor_telepon: "081300000007" },
        { nama_orangtua: "Wulandari",      nomor_telepon: "081300000008" },
        { nama_orangtua: "Sugiono",        nomor_telepon: "081300000009" },
        { nama_orangtua: "Ratna Sari",     nomor_telepon: "081300000010" },
        { nama_orangtua: "Kurniawan",      nomor_telepon: "081300000011" },
        { nama_orangtua: "Mardiyah",       nomor_telepon: "081300000012" },
    ];

    const orangTuaList = [];

    for (const data of orangTuaData) {
        const existing = await prisma.orangTua.findFirst({
            where: {
                nomor_telepon: data.nomor_telepon,
                deleted_at: null
            },
        });

        const ot = existing
            ? existing
            : await prisma.orangTua.create({ data });

        orangTuaList.push(ot);

        console.log(`  ✔ ${ot.nama_orangtua}`);
    }

    return orangTuaList;
};