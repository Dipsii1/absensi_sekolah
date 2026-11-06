import cron from "node-cron";
import { autoApproveExpired } from "../controllers/statusRequestControllers";

// Jalan setiap menit — cek permintaan status yang sudah melewati 15 menit
cron.schedule("* * * * *", async () => {
    try {
        const count = await autoApproveExpired();
        if (count > 0) {
            console.log(`[CRON ${new Date().toISOString()}] Auto-approve: ${count} permintaan disetujui otomatis`);
        }
    } catch (error) {
        console.error(`[CRON ${new Date().toISOString()}] Gagal auto-approve:`, error instanceof Error ? error.message : String(error));
    }
}, {
    timezone: "Asia/Jakarta"
});

console.log("[CRON] Auto-approve status scheduler aktif — berjalan setiap menit");
