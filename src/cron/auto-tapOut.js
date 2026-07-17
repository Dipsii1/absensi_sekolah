const cron = require("node-cron");
const prisma = require("../config/prisma");
const { getTodayStrWIB } = require("../helper/dateUtils");
const { getHariFromDate } = require("../helper/daysUtils");

// Jalankan setiap hari jam 20:00 WIB (Senin-Sabtu)
cron.schedule("0 20 * * 1-6", async () => {
    const todayStr = getTodayStrWIB();
    const hari = getHariFromDate(new Date());

    console.log(`[CRON AUTO-TAP-OUT] Memulai auto tap-out - ${hari}, ${todayStr}`);

    if (hari === "Minggu") {
        console.log(`[CRON AUTO-TAP-OUT] Hari Minggu, dilewati.`);
        return;
    }

    try {
        const tahunAktif = await prisma.tahunAjaran.findFirst({
            where: { is_active: true, deleted_at: null }
        });

        if (!tahunAktif) {
            console.log(`[CRON AUTO-TAP-OUT] Tidak ada tahun ajaran aktif, dilewati.`);
            return;
        }

        // Ambil jadwal terakhir per kelas untuk hari ini
        const semuaJadwal = await prisma.jadwal.findMany({
            where: {
                hari,
                deleted_at: null,
                kelas: {
                    deleted_at: null,
                    status_kelas: "Active",
                    tahun_ajaran_id: tahunAktif.id
                }
            },
            select: {
                kelas_id: true,
                jam_selesai: true
            },
            orderBy: { jam_selesai: "desc" }
        });

        if (semuaJadwal.length === 0) {
            console.log(`[CRON AUTO-TAP-OUT] Tidak ada jadwal hari ini, dilewati.`);
            return;
        }

        // Kelompokkan: ambil jam_selesai terakhir per kelas
        const jadwalTerakhirPerKelas = {};
        for (const j of semuaJadwal) {
            if (!jadwalTerakhirPerKelas[j.kelas_id]) {
                jadwalTerakhirPerKelas[j.kelas_id] = j.jam_selesai;
            }
        }

        const kelasIds = Object.keys(jadwalTerakhirPerKelas).map(Number);

        // Cari semua absensi hari ini yang sudah tap_in tapi belum tap_out
        const absensiBelumTapOut = await prisma.absensiSiswa.findMany({
            where: {
                tanggal: new Date(`${todayStr}T00:00:00.000Z`),
                tap_in: { not: null },
                tap_out: null,
                deleted_at: null,
                siswa: {
                    kelas_id: { in: kelasIds },
                    status_siswa: "Active",
                    deleted_at: null
                }
            },
            include: {
                siswa: {
                    select: {
                        id: true,
                        nama: true,
                        kelas_id: true
                    }
                }
            }
        });

        if (absensiBelumTapOut.length === 0) {
            console.log(`[CRON AUTO-TAP-OUT] Tidak ada siswa yang perlu di-auto tap-out.`);
            return;
        }

        // Update tap_out untuk setiap siswa
        let berhasil = 0, gagal = 0;
        for (const absensi of absensiBelumTapOut) {
            try {
                const jamSelesai = jadwalTerakhirPerKelas[absensi.siswa.kelas_id];
                await prisma.absensiSiswa.update({
                    where: { id: absensi.id },
                    data: { tap_out: jamSelesai }
                });
                berhasil++;
            } catch (error) {
                console.error(`[CRON AUTO-TAP-OUT] Gagal tap-out siswa ${absensi.siswa.nama} (${absensi.siswa.id}):`, error.message);
                gagal++;
            }
        }

        console.log(
            `[CRON AUTO-TAP-OUT] Selesai - ${hari}, ${todayStr} — ` +
            `Berhasil: ${berhasil}, Gagal: ${gagal}`
        );
    } catch (error) {
        console.error(`[CRON AUTO-TAP-OUT] Gagal auto tap-out:`, error.message);
    }
}, {
    timezone: "Asia/Jakarta"
});

console.log("[CRON] Auto tap-out scheduler aktif — berjalan setiap jam 20:00 WIB (Senin-Sabtu)");
