module.exports = async (prisma, siswaList) => {

    console.log("📋 Seeding Absensi Siswa...");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hariMap = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
    const hariIni = hariMap[today.getDay()];

    if (hariIni === "MINGGU") {
        console.log("  ⚠ Hari ini Minggu, skip seeding absensi.");
        return;
    }

    // 8 siswa pertama (semua punya RFID)
    const siswaHariIni = siswaList.slice(0, 8);

    for (let i = 0; i < siswaHariIni.length; i++) {
        const siswa = siswaHariIni[i];

        const tapInDate = new Date(today);
        tapInDate.setHours(6, 45 + i * 5, 0, 0);

        const statusTapIn =
            tapInDate.getHours() < 7 ? "TEPAT_WAKTU" : "TELAMBAT";

        const tapOutDate = new Date(today);
        tapOutDate.setHours(14, i * 5, 0, 0);

        const rfid = await prisma.rFID.findFirst({
            where: {
                siswa_id: siswa.id,
                is_active: true,
                deleted_at: null
            },
        });

        const existingAbsensi = await prisma.absensiSiswa.findFirst({
            where: {
                siswa_id: siswa.id,
                tanggal: today,
                deleted_at: null
            },
        });

        const absensi = existingAbsensi
            ? existingAbsensi
            : await prisma.absensiSiswa.create({
                data: {
                    siswa_id: siswa.id,
                    tanggal: today,
                    tap_in: tapInDate,
                    rfid_id: rfid?.id ?? null,
                    status_tapin: statusTapIn,
                },
            });

        console.log(
            `  ✔ ${siswa.nama.padEnd(18)} tap_in: ${tapInDate.toTimeString().slice(0, 5)} | ${statusTapIn}`
        );

        const jadwalHariIni = await prisma.jadwal.findMany({
            where: {
                kelas_id: siswa.kelas_id,
                hari: hariIni,
                deleted_at: null
            },
            orderBy: { jam_mulai: "asc" },
        });

        const statusMap = ["HADIR", "HADIR", "HADIR", "HADIR", "HADIR", "HADIR", "IZIN", "ALPHA"];
        const statusSiswa = statusMap[i];

        for (const jadwal of jadwalHariIni) {
            const existingDetail = await prisma.detailAbsensiSiswa.findFirst({
                where: {
                    absensi_id: absensi.id,
                    jadwal_id: jadwal.id,
                    deleted_at: null
                },
            });

            if (!existingDetail) {
                await prisma.detailAbsensiSiswa.create({
                    data: {
                        absensi_id: absensi.id,
                        jadwal_id: jadwal.id,
                        guru_id: jadwal.guru_id,
                        status: statusSiswa,
                        jam_absen: tapInDate,
                        keterangan:
                            statusSiswa === "IZIN"
                                ? "Izin keperluan keluarga"
                                : statusSiswa === "SAKIT"
                                ? "Surat keterangan dokter"
                                : null,
                    },
                });

                console.log(
                    `     └─ Jadwal #${jadwal.id} (${hariIni}) → ${statusSiswa}`
                );
            }
        }
    }
};