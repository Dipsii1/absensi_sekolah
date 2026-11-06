import { Router } from 'express'
import { verifyToken, checkRole, requirePokja } from '../middleware/auth'
import {
    getRekapAbsensiSemuaKelas,
    getRekapAbsensiSiswa,
    getRekapAbsensiSiswaYearly,
    getRekapAbsensiSiswaMonthly,
    getRekapAbsensiSiswaWeekly,
    getRekapAbsensiKelas,
    getRekapAbsensiKelasYearly,
    getRekapAbsensiKelasMonthly,
    getRekapAbsensiKelasSemester
} from '../controllers/rekapControllers'

const router = Router()
router.use(verifyToken, checkRole("KESISWAAN"), requirePokja)

// rekap absensi (semua kelas)
router.get('/rekap-absensi', getRekapAbsensiSemuaKelas)

// rekap siswa
router.get('/rekap-siswa', getRekapAbsensiSiswa)
router.get('/rekap-siswa/yearly', getRekapAbsensiSiswaYearly)
router.get('/rekap-siswa/monthly', getRekapAbsensiSiswaMonthly)
router.get('/rekap-siswa/weekly', getRekapAbsensiSiswaWeekly)

// rekap kelas
router.get('/rekap-kelas', getRekapAbsensiKelas)
router.get('/rekap-kelas/yearly', getRekapAbsensiKelasYearly)
router.get('/rekap-kelas/monthly', getRekapAbsensiKelasMonthly)
router.get('/rekap-kelas/semester', getRekapAbsensiKelasSemester)

export default router
