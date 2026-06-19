const express = require("express");
const router  = express.Router();
const { verifyToken, checkRole, requirePokja } = require("../middleware/auth");
const {
    exportRekapKelasMonthlyExcel,
    exportRekapKelasSemesterExcel,
    exportRekapKelasYearlyExcel,
    exportRekapKelasHarianExcel,
    exportRekapSiswaExcel,
} = require("../controllers/exportControllers");

router.use(verifyToken, checkRole("KESISWAAN"), requirePokja);

// ── Rekap Siswa ────────────────────────────────────────────────
// GET /api/export/rekap/siswa/excel?siswa_id=...&tanggal_mulai=...&tanggal_akhir=...
router.get("/rekap/siswa/excel", exportRekapSiswaExcel);

// ── Rekap Kelas Harian ─────────────────────────────────────────
// GET /api/export/rekap/kelas/harian/excel?kelas_id=...&tanggal=YYYY-MM-DD
router.get("/rekap/kelas/harian/excel", exportRekapKelasHarianExcel);

// ── Rekap Kelas Bulanan ────────────────────────────────────────
// GET /api/export/rekap/kelas/bulanan/excel?kelas_id=...&bulan=5&tahun=2026
router.get("/rekap/kelas/bulanan/excel", exportRekapKelasMonthlyExcel);

// ── Rekap Kelas Semester ───────────────────────────────────────
// GET /api/export/rekap/kelas/semester/excel?kelas_id=...&tahun=2026&semester=1
router.get("/rekap/kelas/semester/excel", exportRekapKelasSemesterExcel);

// ── Rekap Kelas Tahunan ────────────────────────────────────────
// GET /api/export/rekap/kelas/tahunan/excel?kelas_id=...&tahun=2026
router.get("/rekap/kelas/tahunan/excel", exportRekapKelasYearlyExcel);

module.exports = router;
