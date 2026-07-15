module.exports = async (prisma, kelasList, orangTuaList) => {
    console.log("🎒 Seeding Siswa...");

    const siswaData = [
        // Kelas X TKJ — 4 siswa
        { NISN: "0051234001", NIPD: "24001", NIK: "3201010103070001", nama: "Andi Kurniawan",  status_siswa: "Active", alamat: "Jl. Mawar No. 1, Jakarta",         gender: "L", tanggal_lahir: new Date("2007-03-15"), nomor_telepon: "081400000001", kelas_id: kelasList[0].id, orangtua_id: orangTuaList[0].id  },
        { NISN: "0051234002", NIPD: "24002", NIK: "3201010205070002", nama: "Bagas Pratama",   status_siswa: "Active", alamat: "Jl. Melati No. 2, Jakarta",        gender: "L", tanggal_lahir: new Date("2007-05-20"), nomor_telepon: "081400000002", kelas_id: kelasList[0].id, orangtua_id: orangTuaList[1].id  },
        { NISN: "0051234003", NIPD: "24003", NIK: "3201010308070003", nama: "Citra Dewi",      status_siswa: "Active", alamat: "Jl. Anggrek No. 3, Jakarta",       gender: "P", tanggal_lahir: new Date("2007-08-10"), nomor_telepon: "081400000003", kelas_id: kelasList[0].id, orangtua_id: orangTuaList[2].id  },
        { NISN: "0051234004", NIPD: "24004", NIK: "3201010411070004", nama: "Dita Ramadhani",  status_siswa: "Active", alamat: "Jl. Kenanga No. 4, Depok",         gender: "P", tanggal_lahir: new Date("2007-11-25"), nomor_telepon: "081400000004", kelas_id: kelasList[0].id, orangtua_id: orangTuaList[3].id  },

        // Kelas XI TKJ — 3 siswa
        { NISN: "0051234005", NIPD: "23005", NIK: "3201010502060005", nama: "Eka Saputra",     status_siswa: "Active", alamat: "Jl. Dahlia No. 5, Bogor",          gender: "L", tanggal_lahir: new Date("2006-02-14"), nomor_telepon: "081400000005", kelas_id: kelasList[1].id, orangtua_id: orangTuaList[4].id  },
        { NISN: "0051234006", NIPD: "23006", NIK: "3201010606060006", nama: "Fira Aulia",      status_siswa: "Active", alamat: "Jl. Flamboyan No. 6, Bekasi",      gender: "P", tanggal_lahir: new Date("2006-06-30"), nomor_telepon: "081400000006", kelas_id: kelasList[1].id, orangtua_id: orangTuaList[5].id  },
        { NISN: "0051234007", NIPD: "23007", NIK: "3201010709060007", nama: "Galang Permana",  status_siswa: "Active", alamat: "Jl. Nusa Indah No. 7, Bekasi",     gender: "L", tanggal_lahir: new Date("2006-09-03"), nomor_telepon: "081400000007", kelas_id: kelasList[1].id, orangtua_id: orangTuaList[6].id  },

        // Kelas XII TKJ — 2 siswa (Alumni)
        { NISN: "0051234008", NIPD: "22008", NIK: "3201010812050008", nama: "Hana Pertiwi",    status_siswa: "Alumni", alamat: "Jl. Bougenville No. 8, Tangerang", gender: "P", tanggal_lahir: new Date("2005-12-05"), nomor_telepon: "081400000008", kelas_id: kelasList[2].id, orangtua_id: orangTuaList[7].id  },
        { NISN: "0051234009", NIPD: "22009", NIK: "3201010904050009", nama: "Irfan Hakim",     status_siswa: "Alumni", alamat: "Jl. Tulip No. 9, Bekasi",          gender: "L", tanggal_lahir: new Date("2005-04-18"), nomor_telepon: "081400000009", kelas_id: kelasList[2].id, orangtua_id: orangTuaList[8].id  },

        // Kelas X RPL — 2 siswa
        { NISN: "0051234010", NIPD: "24010", NIK: "3201011007070010", nama: "Julia Safitri",   status_siswa: "Active", alamat: "Jl. Kamboja No. 10, Depok",        gender: "P", tanggal_lahir: new Date("2007-07-08"), nomor_telepon: "081400000010", kelas_id: kelasList[3].id, orangtua_id: orangTuaList[9].id  },
        { NISN: "0051234011", NIPD: "24011", NIK: "3201011101070011", nama: "Kevin Alfarizi",  status_siswa: "Active", alamat: "Jl. Seruni No. 11, Jakarta",       gender: "L", tanggal_lahir: new Date("2007-01-22"), nomor_telepon: "081400000011", kelas_id: kelasList[3].id, orangtua_id: orangTuaList[10].id },

        // Kelas X Multimedia — 1 siswa
        { NISN: "0051234012", NIPD: "24012", NIK: "3201011210070012", nama: "Laila Nurmaya",   status_siswa: "Active", alamat: "Jl. Teratai No. 12, Bogor",        gender: "P", tanggal_lahir: new Date("2007-10-14"), nomor_telepon: "081400000012", kelas_id: kelasList[5].id, orangtua_id: orangTuaList[11].id },
    ];

    const siswaList = [];
    for (const data of siswaData) {
        const existing = await prisma.siswa.findFirst({
            where: { NISN: data.NISN, deleted_at: null },
        });

        const siswa = existing
            ? existing
            : await prisma.siswa.create({ data });

        siswaList.push(siswa);

        console.log(`  ✔ ${siswa.nama} (${siswa.gender}) | NISN: ${siswa.NISN} | NIK: ${siswa.NIK} | Status: ${siswa.status_siswa}`);
    }

    return siswaList;
};