const cron = require("node-cron");
const { autoCreateTahunAjaran } = require("../controllers/tahunControllers");

(async () => {
    try {
        await autoCreateTahunAjaran();
    } catch (error) {
        console.error("[CRON] Gagal memastikan tahun ajaran:", error.message);
    }
})();

// Jalan setiap 1 Juli pukul 00:00 WIB
cron.schedule("0 0 1 7 *", async () => {
    console.log("[CRON] Menjalankan auto-create tahun ajaran baru...");
    try {
        const result = await autoCreateTahunAjaran();
        console.log(`[CRON] Berhasil: ${result.tahun_ajaran} | Mulai: ${result.tanggal_mulai} | Selesai: ${result.tanggal_selesai}`);
    } catch (error) {
        console.error("[CRON] Gagal membuat tahun ajaran:", error.message);
    }
}, {
    timezone: "Asia/Jakarta"
});

console.log("[CRON] Scheduler tahun ajaran aktif — akan berjalan setiap 1 Juli 00:00 WIB");