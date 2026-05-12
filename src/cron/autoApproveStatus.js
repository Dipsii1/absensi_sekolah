const cron = require("node-cron");
const { autoApproveExpired } = require("../controllers/statusRequestControllers");

// Jalan setiap menit — cek permintaan status yang sudah melewati 15 menit
cron.schedule("* * * * *", async () => {
    try {
        const count = await autoApproveExpired();
        if (count > 0) {
            console.log(`[CRON] Auto-approve status: ${count} permintaan disetujui otomatis`);
        }
    } catch (error) {
        console.error("[CRON] Gagal auto-approve status:", error.message);
    }
}, {
    timezone: "Asia/Jakarta"
});

console.log("[CRON] Auto-approve status scheduler aktif — berjalan setiap menit");
