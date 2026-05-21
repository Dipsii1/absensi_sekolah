const express = require("express");
const router = express.Router();

const finalAbsensi = require("../controllers/finalAbsensiControllers");

// Finalisasi 1 siswa secara manual
router.post("/siswa", finalAbsensi.finalisasiSiswa);

// Finalisasi seluruh siswa dalam 1 kelas
router.post("/kelas/:kelas_id", finalAbsensi.finalisasiKelas);

// Finalisasi semua kelas aktif
router.post("/semua-kelas", finalAbsensi.finalisasiSemuaKelas);

module.exports = router;