import { Router } from 'express'
import { verifyToken, requirePokja } from '../middleware/auth'
import {
    exportRekapKelasMonthlyExcel,
    exportRekapKelasSemesterExcel,
    exportRekapKelasYearlyExcel,
    exportRekapKelasHarianExcel,
    exportRekapSiswaExcel
} from '../controllers/exportControllers'

const router = Router()
router.use(verifyToken)

router.get("/rekap/siswa/excel", exportRekapSiswaExcel)
router.get("/rekap/kelas/harian/excel", exportRekapKelasHarianExcel)
router.get("/rekap/kelas/bulanan/excel", exportRekapKelasMonthlyExcel)
router.get("/rekap/kelas/semester/excel", exportRekapKelasSemesterExcel)
router.get("/rekap/kelas/tahunan/excel", exportRekapKelasYearlyExcel)

export default router
