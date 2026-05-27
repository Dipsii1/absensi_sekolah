const express = require("express");
const router = express.Router();
const rekapControllers = require("../controllers/rekapControllers.js");

// rekap absensi (semua kelas)
router.get('/rekap-absensi', rekapControllers.getRekapAbsensiSemuaKelas);

// rekap siswa 
router.get('/rekap-siswa', rekapControllers.getRekapAbsensiSiswa);
router.get('/rekap-siswa/yearly', rekapControllers.getRekapAbsensiSiswaYearly);
router.get('/rekap-siswa/monthly', rekapControllers.getRekapAbsensiSiswaMonthly);
router.get('/rekap-siswa/weekly', rekapControllers.getRekapAbsensiSiswaWeekly);

// rekap kelas
router.get('/rekap-kelas', rekapControllers.getRekapAbsensiKelas);
router.get('/rekap-kelas/yearly', rekapControllers.getRekapAbsensiKelasYearly);
router.get('/rekap-kelas/monthly', rekapControllers.getRekapAbsensiKelasMonthly);
router.get('/rekap-kelas/semester', rekapControllers.getRekapAbsensiKelasSemester);

module.exports = router;