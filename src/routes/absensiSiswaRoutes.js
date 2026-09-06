const express = require("express");
const router = express.Router();
const absensi = require("../controllers/absensiSiswaControllers");
const { verifyToken, checkRole } = require("../middleware/auth");


// Tap In & Tap Out
router.post('/tap-in', absensi.tapIn);
router.post('/tap-out', absensi.tapOut);

router.get('/', absensi.getAllAbsensi);
router.get('/laporan/harian', absensi.getLaporanHarian);
router.get('/laporan/range', absensi.getLaporanRange);
router.get('/rekap-saya', verifyToken, checkRole("SISWA"), absensi.getRekapSiswaSaya);
router.get('/:id', absensi.getAbsensiById);
router.put('/:id', absensi.updateAbsensi);
router.delete('/:id', absensi.deleteAbsensi);

module.exports = router;