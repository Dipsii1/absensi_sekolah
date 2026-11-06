import { Router } from 'express'
import { verifyToken, checkRole } from '../middleware/auth'
import {
    absensiByGuru,
    updateStatusAbsensiManual,
    deleteDetailAbsensi,
    pratinjauWalas,
    absensiManualWalas
} from '../controllers/detailAbsensiControllers'

const router = Router()

// absensi guru
router.post('/absensi-guru', checkRole("GURU"), absensiByGuru)
router.put('/update-status', checkRole("GURU"), updateStatusAbsensiManual)
router.delete('/:id', checkRole("GURU"), deleteDetailAbsensi)

// Walas
router.get('/pratinjau-walas', pratinjauWalas)
router.post('/absensi-walas', verifyToken, checkRole("WALAS"), absensiManualWalas)

export default router
