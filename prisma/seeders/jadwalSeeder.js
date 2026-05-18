module.exports = async (prisma, kelasList, mapelList, guruList) => {

    console.log("🗓️  Seeding Jadwal...");

    // VALIDASI WAJIB
    if (!kelasList?.length) throw new Error("❌ kelasList kosong");
    if (!mapelList?.length) throw new Error("❌ mapelList kosong");
    if (!guruList?.length) throw new Error("❌ guruList kosong");

    const jam = (hh, mm) =>
        new Date(`1970-01-01T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00Z`);

    const jadwalData = [

        // ══════════════════════════════════════
        // KELAS 0
        // ══════════════════════════════════════
        { hari: "Senin",   kelas_id: kelasList[0].id, mapel_id: mapelList[0].id, guru_id: guruList[0].id, jam_mulai: jam(7,0),   jam_selesai: jam(8,30)  },
        { hari: "Senin",   kelas_id: kelasList[0].id, mapel_id: mapelList[5].id, guru_id: guruList[2].id, jam_mulai: jam(8,30),  jam_selesai: jam(10,0)  },
        { hari: "Selasa",  kelas_id: kelasList[0].id, mapel_id: mapelList[1].id, guru_id: guruList[1].id, jam_mulai: jam(7,0),   jam_selesai: jam(8,30)  },
        { hari: "Selasa",  kelas_id: kelasList[0].id, mapel_id: mapelList[3].id, guru_id: guruList[3].id, jam_mulai: jam(8,30),  jam_selesai: jam(10,0)  },
        { hari: "Rabu",    kelas_id: kelasList[0].id, mapel_id: mapelList[2].id, guru_id: guruList[4].id, jam_mulai: jam(7,0),   jam_selesai: jam(8,30)  },
        { hari: "Rabu",    kelas_id: kelasList[0].id, mapel_id: mapelList[6].id, guru_id: guruList[5].id, jam_mulai: jam(8,30),  jam_selesai: jam(10,0)  },
        { hari: "Kamis",   kelas_id: kelasList[0].id, mapel_id: mapelList[6].id, guru_id: guruList[5].id, jam_mulai: jam(7,0),   jam_selesai: jam(8,30)  },
        { hari: "Kamis",   kelas_id: kelasList[0].id, mapel_id: mapelList[4].id, guru_id: guruList[3].id, jam_mulai: jam(8,30),  jam_selesai: jam(10,0)  },
        { hari: "Jumat",   kelas_id: kelasList[0].id, mapel_id: mapelList[7].id, guru_id: guruList[2].id, jam_mulai: jam(7,0),   jam_selesai: jam(8,30)  },
        { hari: "Jumat",   kelas_id: kelasList[0].id, mapel_id: mapelList[0].id, guru_id: guruList[0].id, jam_mulai: jam(8,30),  jam_selesai: jam(10,0)  },
        { hari: "Sabtu",   kelas_id: kelasList[0].id, mapel_id: mapelList[3].id, guru_id: guruList[1].id, jam_mulai: jam(7,0),   jam_selesai: jam(8,30)  },
        { hari: "Sabtu",   kelas_id: kelasList[0].id, mapel_id: mapelList[1].id, guru_id: guruList[4].id, jam_mulai: jam(8,30),  jam_selesai: jam(10,0)  },

        // ══════════════════════════════════════
        // KELAS 1
        // ══════════════════════════════════════
        { hari: "Senin",   kelas_id: kelasList[1].id, mapel_id: mapelList[3].id, guru_id: guruList[3].id, jam_mulai: jam(10,0),  jam_selesai: jam(11,30) },
        { hari: "Senin",   kelas_id: kelasList[1].id, mapel_id: mapelList[1].id, guru_id: guruList[1].id, jam_mulai: jam(11,30), jam_selesai: jam(13,0)  },
        { hari: "Selasa",  kelas_id: kelasList[1].id, mapel_id: mapelList[5].id, guru_id: guruList[2].id, jam_mulai: jam(10,0),  jam_selesai: jam(11,30) },
        { hari: "Selasa",  kelas_id: kelasList[1].id, mapel_id: mapelList[7].id, guru_id: guruList[4].id, jam_mulai: jam(11,30), jam_selesai: jam(13,0)  },
        { hari: "Rabu",    kelas_id: kelasList[1].id, mapel_id: mapelList[0].id, guru_id: guruList[0].id, jam_mulai: jam(8,30),  jam_selesai: jam(10,0)  },
        { hari: "Rabu",    kelas_id: kelasList[1].id, mapel_id: mapelList[4].id, guru_id: guruList[5].id, jam_mulai: jam(10,0),  jam_selesai: jam(11,30) },
        { hari: "Kamis",   kelas_id: kelasList[1].id, mapel_id: mapelList[2].id, guru_id: guruList[4].id, jam_mulai: jam(10,0),  jam_selesai: jam(11,30) },
        { hari: "Kamis",   kelas_id: kelasList[1].id, mapel_id: mapelList[6].id, guru_id: guruList[3].id, jam_mulai: jam(11,30), jam_selesai: jam(13,0)  },
        { hari: "Jumat",   kelas_id: kelasList[1].id, mapel_id: mapelList[1].id, guru_id: guruList[1].id, jam_mulai: jam(10,0),  jam_selesai: jam(11,30) },
        { hari: "Jumat",   kelas_id: kelasList[1].id, mapel_id: mapelList[3].id, guru_id: guruList[3].id, jam_mulai: jam(11,30), jam_selesai: jam(13,0)  },
        { hari: "Sabtu",   kelas_id: kelasList[1].id, mapel_id: mapelList[5].id, guru_id: guruList[2].id, jam_mulai: jam(10,0),  jam_selesai: jam(11,30) },
        { hari: "Sabtu",   kelas_id: kelasList[1].id, mapel_id: mapelList[0].id, guru_id: guruList[0].id, jam_mulai: jam(11,30), jam_selesai: jam(13,0)  },

        // ══════════════════════════════════════
        // KELAS 2
        // ══════════════════════════════════════
        { hari: "Senin",   kelas_id: kelasList[2].id, mapel_id: mapelList[2].id, guru_id: guruList[4].id, jam_mulai: jam(8,30),  jam_selesai: jam(10,0)  },
        { hari: "Senin",   kelas_id: kelasList[2].id, mapel_id: mapelList[7].id, guru_id: guruList[2].id, jam_mulai: jam(10,0),  jam_selesai: jam(11,30) },
        { hari: "Selasa",  kelas_id: kelasList[2].id, mapel_id: mapelList[6].id, guru_id: guruList[5].id, jam_mulai: jam(8,30),  jam_selesai: jam(10,0)  },
        { hari: "Selasa",  kelas_id: kelasList[2].id, mapel_id: mapelList[0].id, guru_id: guruList[0].id, jam_mulai: jam(10,0),  jam_selesai: jam(11,30) },
        { hari: "Rabu",    kelas_id: kelasList[2].id, mapel_id: mapelList[1].id, guru_id: guruList[1].id, jam_mulai: jam(8,30),  jam_selesai: jam(10,0)  },
        { hari: "Rabu",    kelas_id: kelasList[2].id, mapel_id: mapelList[3].id, guru_id: guruList[3].id, jam_mulai: jam(10,0),  jam_selesai: jam(11,30) },
        { hari: "Kamis",   kelas_id: kelasList[2].id, mapel_id: mapelList[5].id, guru_id: guruList[2].id, jam_mulai: jam(8,30),  jam_selesai: jam(10,0)  },
        { hari: "Kamis",   kelas_id: kelasList[2].id, mapel_id: mapelList[2].id, guru_id: guruList[4].id, jam_mulai: jam(10,0),  jam_selesai: jam(11,30) },
        { hari: "Jumat",   kelas_id: kelasList[2].id, mapel_id: mapelList[4].id, guru_id: guruList[5].id, jam_mulai: jam(7,0),   jam_selesai: jam(8,30)  },
        { hari: "Jumat",   kelas_id: kelasList[2].id, mapel_id: mapelList[7].id, guru_id: guruList[2].id, jam_mulai: jam(8,30),  jam_selesai: jam(10,0)  },
        { hari: "Sabtu",   kelas_id: kelasList[2].id, mapel_id: mapelList[1].id, guru_id: guruList[1].id, jam_mulai: jam(7,0),   jam_selesai: jam(8,30)  },
        { hari: "Sabtu",   kelas_id: kelasList[2].id, mapel_id: mapelList[6].id, guru_id: guruList[5].id, jam_mulai: jam(8,30),  jam_selesai: jam(10,0)  },

        // ══════════════════════════════════════
        // KELAS 3
        // ══════════════════════════════════════
        { hari: "Senin",   kelas_id: kelasList[3].id, mapel_id: mapelList[4].id, guru_id: guruList[5].id, jam_mulai: jam(11,30), jam_selesai: jam(13,0)  },
        { hari: "Senin",   kelas_id: kelasList[3].id, mapel_id: mapelList[2].id, guru_id: guruList[4].id, jam_mulai: jam(13,0),  jam_selesai: jam(14,30) },
        { hari: "Selasa",  kelas_id: kelasList[3].id, mapel_id: mapelList[6].id, guru_id: guruList[3].id, jam_mulai: jam(7,0),   jam_selesai: jam(8,30)  },
        { hari: "Selasa",  kelas_id: kelasList[3].id, mapel_id: mapelList[5].id, guru_id: guruList[2].id, jam_mulai: jam(8,30),  jam_selesai: jam(10,0)  },
        { hari: "Rabu",    kelas_id: kelasList[3].id, mapel_id: mapelList[0].id, guru_id: guruList[0].id, jam_mulai: jam(11,30), jam_selesai: jam(13,0)  },
        { hari: "Rabu",    kelas_id: kelasList[3].id, mapel_id: mapelList[3].id, guru_id: guruList[3].id, jam_mulai: jam(13,0),  jam_selesai: jam(14,30) },
        { hari: "Kamis",   kelas_id: kelasList[3].id, mapel_id: mapelList[7].id, guru_id: guruList[2].id, jam_mulai: jam(11,30), jam_selesai: jam(13,0)  },
        { hari: "Kamis",   kelas_id: kelasList[3].id, mapel_id: mapelList[1].id, guru_id: guruList[1].id, jam_mulai: jam(13,0),  jam_selesai: jam(14,30) },
        { hari: "Jumat",   kelas_id: kelasList[3].id, mapel_id: mapelList[4].id, guru_id: guruList[5].id, jam_mulai: jam(11,30), jam_selesai: jam(13,0)  },
        { hari: "Jumat",   kelas_id: kelasList[3].id, mapel_id: mapelList[0].id, guru_id: guruList[0].id, jam_mulai: jam(13,0),  jam_selesai: jam(14,30) },
        { hari: "Sabtu",   kelas_id: kelasList[3].id, mapel_id: mapelList[2].id, guru_id: guruList[4].id, jam_mulai: jam(11,30), jam_selesai: jam(13,0)  },
        { hari: "Sabtu",   kelas_id: kelasList[3].id, mapel_id: mapelList[6].id, guru_id: guruList[3].id, jam_mulai: jam(13,0),  jam_selesai: jam(14,30) },

        // ══════════════════════════════════════
        // KELAS 4
        // ══════════════════════════════════════
        { hari: "Senin",   kelas_id: kelasList[4].id, mapel_id: mapelList[1].id, guru_id: guruList[1].id, jam_mulai: jam(7,0),   jam_selesai: jam(8,30)  },
        { hari: "Senin",   kelas_id: kelasList[4].id, mapel_id: mapelList[3].id, guru_id: guruList[3].id, jam_mulai: jam(8,30),  jam_selesai: jam(10,0)  },
        { hari: "Selasa",  kelas_id: kelasList[4].id, mapel_id: mapelList[4].id, guru_id: guruList[5].id, jam_mulai: jam(8,30),  jam_selesai: jam(10,0)  },
        { hari: "Selasa",  kelas_id: kelasList[4].id, mapel_id: mapelList[2].id, guru_id: guruList[4].id, jam_mulai: jam(10,0),  jam_selesai: jam(11,30) },
        { hari: "Rabu",    kelas_id: kelasList[4].id, mapel_id: mapelList[6].id, guru_id: guruList[5].id, jam_mulai: jam(7,0),   jam_selesai: jam(8,30)  },
        { hari: "Rabu",    kelas_id: kelasList[4].id, mapel_id: mapelList[5].id, guru_id: guruList[2].id, jam_mulai: jam(8,30),  jam_selesai: jam(10,0)  },
        { hari: "Kamis",   kelas_id: kelasList[4].id, mapel_id: mapelList[7].id, guru_id: guruList[2].id, jam_mulai: jam(7,0),   jam_selesai: jam(8,30)  },
        { hari: "Kamis",   kelas_id: kelasList[4].id, mapel_id: mapelList[0].id, guru_id: guruList[0].id, jam_mulai: jam(8,30),  jam_selesai: jam(10,0)  },
        { hari: "Jumat",   kelas_id: kelasList[4].id, mapel_id: mapelList[3].id, guru_id: guruList[3].id, jam_mulai: jam(7,0),   jam_selesai: jam(8,30)  },
        { hari: "Jumat",   kelas_id: kelasList[4].id, mapel_id: mapelList[1].id, guru_id: guruList[1].id, jam_mulai: jam(8,30),  jam_selesai: jam(10,0)  },
        { hari: "Sabtu",   kelas_id: kelasList[4].id, mapel_id: mapelList[4].id, guru_id: guruList[5].id, jam_mulai: jam(7,0),   jam_selesai: jam(8,30)  },
        { hari: "Sabtu",   kelas_id: kelasList[4].id, mapel_id: mapelList[7].id, guru_id: guruList[2].id, jam_mulai: jam(8,30),  jam_selesai: jam(10,0)  },

        // ══════════════════════════════════════
        // KELAS 5
        // ══════════════════════════════════════
        { hari: "Senin",   kelas_id: kelasList[5].id, mapel_id: mapelList[7].id, guru_id: guruList[2].id, jam_mulai: jam(13,0),  jam_selesai: jam(14,30) },
        { hari: "Senin",   kelas_id: kelasList[5].id, mapel_id: mapelList[0].id, guru_id: guruList[0].id, jam_mulai: jam(14,30), jam_selesai: jam(16,0)  },
        { hari: "Selasa",  kelas_id: kelasList[5].id, mapel_id: mapelList[3].id, guru_id: guruList[3].id, jam_mulai: jam(13,0),  jam_selesai: jam(14,30) },
        { hari: "Selasa",  kelas_id: kelasList[5].id, mapel_id: mapelList[1].id, guru_id: guruList[1].id, jam_mulai: jam(14,30), jam_selesai: jam(16,0)  },
        { hari: "Rabu",    kelas_id: kelasList[5].id, mapel_id: mapelList[4].id, guru_id: guruList[5].id, jam_mulai: jam(10,0),  jam_selesai: jam(11,30) },
        { hari: "Rabu",    kelas_id: kelasList[5].id, mapel_id: mapelList[2].id, guru_id: guruList[4].id, jam_mulai: jam(11,30), jam_selesai: jam(13,0)  },
        { hari: "Kamis",   kelas_id: kelasList[5].id, mapel_id: mapelList[5].id, guru_id: guruList[2].id, jam_mulai: jam(13,0),  jam_selesai: jam(14,30) },
        { hari: "Kamis",   kelas_id: kelasList[5].id, mapel_id: mapelList[6].id, guru_id: guruList[3].id, jam_mulai: jam(14,30), jam_selesai: jam(16,0)  },
        { hari: "Jumat",   kelas_id: kelasList[5].id, mapel_id: mapelList[7].id, guru_id: guruList[2].id, jam_mulai: jam(16,0),  jam_selesai: jam(17,30) },
        { hari: "Jumat",   kelas_id: kelasList[5].id, mapel_id: mapelList[4].id, guru_id: guruList[5].id, jam_mulai: jam(14,30), jam_selesai: jam(16,0)  },
        { hari: "Sabtu",   kelas_id: kelasList[5].id, mapel_id: mapelList[0].id, guru_id: guruList[0].id, jam_mulai: jam(13,0),  jam_selesai: jam(14,30) },
        { hari: "Sabtu",   kelas_id: kelasList[5].id, mapel_id: mapelList[3].id, guru_id: guruList[3].id, jam_mulai: jam(14,30), jam_selesai: jam(16,0)  },
    ];

    const jadwalList = [];

    for (const data of jadwalData) {
        const existing = await prisma.jadwal.findFirst({
            where: {
                kelas_id: data.kelas_id,
                hari: data.hari,
                jam_mulai: data.jam_mulai,
                deleted_at: null,
            },
        });

        const jadwal = existing ?? await prisma.jadwal.create({ data });
        jadwalList.push(jadwal);

        const mapel = mapelList.find(m => m.id === data.mapel_id);
        const kelas = kelasList.find(k => k.id === data.kelas_id);

        const hh = data.jam_mulai.getUTCHours().toString().padStart(2, "0");
        const mm = data.jam_mulai.getUTCMinutes().toString().padStart(2, "0");

        console.log(`  ✔ ${data.hari.padEnd(7)} ${hh}:${mm} | ${mapel.nama_mapel} | ${kelas.kelas} ${kelas.jurusan}`);
    }

    return jadwalList;
};