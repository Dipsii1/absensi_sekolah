import { Router } from 'express'
import { verifyToken, checkRole, requirePokja } from '../middleware/auth'
import {
    getFinalAbsensiFilters,
    getAllFinalAbsensi,
    finalisasiSiswa,
    finalisasiKelas,
    finalisasiSemuaKelas,
    finalisasiSemuaSiswa
} from '../controllers/finalAbsensiControllers'

const router = Router()
router.use(verifyToken)

router.get("/filters", getFinalAbsensiFilters)
router.get("/", getAllFinalAbsensi)
router.post("/siswa", finalisasiSiswa)
router.post("/kelas/:kelas_id", finalisasiKelas)
router.post("/semua-kelas", finalisasiSemuaKelas)
router.post("/all", checkRole("ADMIN"), finalisasiSemuaSiswa)

export default router
