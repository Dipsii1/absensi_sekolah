module.exports = async (prisma, kelasList, orangTuaList) => {
    console.log("🎒 Seeding Siswa...");

    const siswaData = [
        // Kelas X RPL — 4 siswa
        { nisn: "0051234001", nipd: "24001", nik: "3201010103070001", nama: "Andi Kurniawan",  tempat_lahir: "Jakarta",      tgl_lahir: new Date("2007-03-15"), jenis_kelamin: "L", agama: "Islam",      jurusan: "Rekayasa Perangkat Lunak", kelas_id: kelasList[0].id, orangtua_id: orangTuaList[0].id },
        { nisn: "0051234002", nipd: "24002", nik: "3201010205070002", nama: "Bagas Pratama",   tempat_lahir: "Jakarta",      tgl_lahir: new Date("2007-05-20"), jenis_kelamin: "L", agama: "Islam",      jurusan: "Rekayasa Perangkat Lunak", kelas_id: kelasList[0].id, orangtua_id: orangTuaList[1].id },
        { nisn: "0051234003", nipd: "24003", nik: "3201010308070003", nama: "Citra Dewi",      tempat_lahir: "Jakarta",      tgl_lahir: new Date("2007-08-10"), jenis_kelamin: "P", agama: "Islam",      jurusan: "Rekayasa Perangkat Lunak", kelas_id: kelasList[0].id, orangtua_id: orangTuaList[2].id },
        { nisn: "0051234004", nipd: "24004", nik: "3201010411070004", nama: "Dita Ramadhani",  tempat_lahir: "Depok",        tgl_lahir: new Date("2007-11-25"), jenis_kelamin: "P", agama: "Islam",      jurusan: "Rekayasa Perangkat Lunak", kelas_id: kelasList[0].id, orangtua_id: orangTuaList[3].id },

        // Kelas XI RPL — 3 siswa
        { nisn: "0051234005", nipd: "23005", nik: "3201010502060005", nama: "Eka Saputra",     tempat_lahir: "Bogor",        tgl_lahir: new Date("2006-02-14"), jenis_kelamin: "L", agama: "Islam",      jurusan: "Rekayasa Perangkat Lunak", kelas_id: kelasList[1].id, orangtua_id: orangTuaList[4].id },
        { nisn: "0051234006", nipd: "23006", nik: "3201010606060006", nama: "Fira Aulia",      tempat_lahir: "Bekasi",       tgl_lahir: new Date("2006-06-30"), jenis_kelamin: "P", agama: "Islam",      jurusan: "Rekayasa Perangkat Lunak", kelas_id: kelasList[1].id, orangtua_id: orangTuaList[5].id },
        { nisn: "0051234007", nipd: "23007", nik: "3201010709060007", nama: "Galang Permana",  tempat_lahir: "Bekasi",       tgl_lahir: new Date("2006-09-03"), jenis_kelamin: "L", agama: "Islam",      jurusan: "Rekayasa Perangkat Lunak", kelas_id: kelasList[1].id, orangtua_id: orangTuaList[6].id },

        // Kelas XII RPL — 2 siswa (Alumni)
        { nisn: "0051234008", nipd: "22008", nik: "3201010812050008", nama: "Hana Pertiwi",    tempat_lahir: "Tangerang",    tgl_lahir: new Date("2005-12-05"), jenis_kelamin: "P", agama: "Islam",      jurusan: "Rekayasa Perangkat Lunak", kelas_id: kelasList[2].id, orangtua_id: orangTuaList[7].id },
        { nisn: "0051234009", nipd: "22009", nik: "3201010904050009", nama: "Irfan Hakim",     tempat_lahir: "Bekasi",       tgl_lahir: new Date("2005-04-18"), jenis_kelamin: "L", agama: "Islam",      jurusan: "Rekayasa Perangkat Lunak", kelas_id: kelasList[2].id, orangtua_id: orangTuaList[8].id },

        // Kelas X TKJ — 2 siswa
        { nisn: "0051234010", nipd: "24010", nik: "3201011007070010", nama: "Julia Safitri",   tempat_lahir: "Depok",        tgl_lahir: new Date("2007-07-08"), jenis_kelamin: "P", agama: "Islam",      jurusan: "Teknik Komputer Jaringan", kelas_id: kelasList[3].id, orangtua_id: orangTuaList[9].id },
        { nisn: "0051234011", nipd: "24011", nik: "3201011101070011", nama: "Kevin Alfarizi",  tempat_lahir: "Jakarta",      tgl_lahir: new Date("2007-01-22"), jenis_kelamin: "L", agama: "Islam",      jurusan: "Teknik Komputer Jaringan", kelas_id: kelasList[3].id, orangtua_id: orangTuaList[10].id },

        // Kelas X Multimedia — 1 siswa
        { nisn: "0051234012", nipd: "24012", nik: "3201011210070012", nama: "Laila Nurmaya",   tempat_lahir: "Bogor",        tgl_lahir: new Date("2007-10-14"), jenis_kelamin: "P", agama: "Islam",      jurusan: "Multimedia",               kelas_id: kelasList[5].id, orangtua_id: orangTuaList[11].id },
    ];

    const siswaList = [];
    for (const data of siswaData) {
        const existing = await prisma.siswa.findFirst({
            where: { nisn: data.nisn, deleted_at: null },
        });

        const siswa = existing
            ? existing
            : await prisma.siswa.create({ data });

        siswaList.push(siswa);

        console.log(`  ✔ ${siswa.nama} (${siswa.jenis_kelamin}) | NISN: ${siswa.nisn} | NIK: ${siswa.nik}`);
    }

    return siswaList;
};
