const express = require("express");
const router = express.Router();
const detailAbsensi = require("../controllers/detailAbsensiControllers.js");
const { verifyToken, checkRole } = require("../middleware/auth");


// rekap absensi (semua kelas)
// router.get('/rekap-absensi', detailAbsensi.getRekapAbsensiSemuaKelas);

// absensi guru
router.post('/absensi-guru',checkRole("GURU"), detailAbsensi.absensiByGuru);
router.put('/update-status', checkRole("GURU"), detailAbsensi.updateStatusAbsensiManual);
router.delete('/:id', checkRole("GURU"), detailAbsensi.deleteDetailAbsensi);

// Walas 
router.get('/pratinjau-walas', detailAbsensi.pratinjauWalas);
router.post('/absensi-walas',verifyToken, checkRole("WALAS"), detailAbsensi.absensiManualWalas)

// Rekap Siswa
// router.get('/rekap-siswa', detailAbsensi.getRekapAbsensiSiswa);
// router.get('/rekap-siswa/yearly', detailAbsensi.getRekapAbsensiSiswaYearly);
// router.get('/rekap-siswa/monthly', detailAbsensi.getRekapAbsensiSiswaMonthly)
// router.get('/rekap-siswa/weakly',detailAbsensi.getRekapAbsensiSiswaWeakly)

// // Rekap Kelas
// router.get('/rekap-kelas', detailAbsensi.getRekapAbsensiKelas);
// router.get('/rekap-kelas/yearly', detailAbsensi.GetRekapAbsensiKelasTahunan);
// router.get('/rekap-kelas/monthly', detailAbsensi.GetRekapAbsensiKelasMonthly);
// router.get('/rekap-kelas/semester', detailAbsensi.GetRekapAbsensiKelasSemester);

// Rekap Jadwal
// router.get('/rekap-jadwal', detailAbsensi.getRekapAbsensiByJadwal);

module.exports = router;