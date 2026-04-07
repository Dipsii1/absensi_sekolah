const express = require("express");
const router  = express.Router();
const { exportRekapSiswa, exportRekapKelasHarian, exportRekapKelasTahunan, exportRekapKelasSemester, exportRekapByJadwal, exportSiswaExcel  } = require("../controllers/exportExcelControllers");

// Endpoint untuk ekspor rekap absensi per siswa
router.get("/siswa", exportRekapSiswa);

// Endpoint untuk ekspor rekap kelas harian
router.get("/kelas-harian", exportRekapKelasHarian);

// Endpoint untuk ekspor rekap kelas tahunan
router.get("/kelas-tahunan", exportRekapKelasTahunan);

// Endpoint untuk ekspor rekap kelas semester
router.get("/kelas-semester", exportRekapKelasSemester);

// Endpoint untuk ekspor rekap berdasarkan jadwal
router.get("/by-jadwal", exportRekapByJadwal);

// Endpoint untuk ekspor data siswa ke Excel
router.get("/siswa/excel", exportSiswaExcel);




module.exports = router;