import { Router } from 'express'
import { verifyToken, checkRole } from '../middleware/auth'
import {
    tapIn,
    tapOut,
    getAllAbsensi,
    getAbsensiById,
    getLaporanHarian,
    getLaporanRange,
    getRekapSiswaSaya,
    updateAbsensi,
    deleteAbsensi
} from '../controllers/absensiSiswaControllers'

const router = Router()

// Tap In & Tap Out
router.post('/tap-in', tapIn)
router.post('/tap-out', tapOut)

router.get('/', getAllAbsensi)
router.get('/laporan/harian', getLaporanHarian)
router.get('/laporan/range', getLaporanRange)
router.get('/rekap-saya', verifyToken, checkRole("SISWA"), getRekapSiswaSaya)
router.get('/:id', getAbsensiById)
router.put('/:id', updateAbsensi)
router.delete('/:id', deleteAbsensi)

export default router
