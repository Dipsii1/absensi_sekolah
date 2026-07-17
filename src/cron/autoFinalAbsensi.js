const cron = require("node-cron");
const { finalisasiSemuaKelasAktif } = require("../services/finalAbsensi");
const { getTodayStrWIB } = require("../helper/dateUtils");
const prisma = require("../config/prisma");

// Jalankan setiap hari jam 20:05 WIB (Senin-Sabtu)
cron.schedule("5 20 * * 1-6", async () => {
    const todayStr = getTodayStrWIB();

    console.log(`[CRON AUTO-FINAL] Memulai finalisasi otomatis - ${todayStr}`);

    try {
        // Cek apakah ada tahun ajaran aktif
        const tahunAktif = await prisma.tahunAjaran.findFirst({
            where: { is_active: true, deleted_at: null }
        });

        if (!tahunAktif) {
            console.log(`[CRON AUTO-FINAL] Tidak ada tahun ajaran aktif, dilewati.`);
            return;
        }

        // Cek apakah ada kelas aktif
        const kelasAktifCount = await prisma.kelas.count({
            where: {
                status_kelas: "Active",
                deleted_at: null,
                tahun_ajaran_id: tahunAktif.id
            }
        });

        if (kelasAktifCount === 0) {
            console.log(`[CRON AUTO-FINAL] Tidak ada kelas aktif, dilewati.`);
            return;
        }

        // Konversi tanggal ke Date object (UTC midnight)
        const tanggal = new Date(`${todayStr}T00:00:00.000Z`);

        // Finalisasi semua kelas aktif
        const hasil = await finalisasiSemuaKelasAktif(tanggal);

        // Hitung total
        let totalBerhasil = 0, totalGagal = 0, totalDilewati = 0;
        for (const r of hasil) {
            totalBerhasil += r.berhasil;
            totalGagal += r.gagal;
            totalDilewati += r.dilewati;
        }

        console.log(
            `[CRON AUTO-FINAL] Selesai finalisasi ${todayStr} — ` +
            `Kelas: ${hasil.length}, Berhasil: ${totalBerhasil}, ` +
            `Gagal: ${totalGagal}, Dilewati: ${totalDilewati}`
        );
    } catch (error) {
        console.error(`[CRON AUTO-FINAL] Gagal finalisasi otomatis:`, error.message);
    }
}, {
    timezone: "Asia/Jakarta"
});

console.log("[CRON] Auto-final absensi scheduler aktif — berjalan setiap jam 20:05 WIB (Senin-Sabtu)");
