import { Router } from 'express'
import upload from '../middleware/upload'
import { verifyToken, checkRole } from '../middleware/auth'
import {
    getAllJadwal,
    createJadwal,
    updateJadwal,
    deleteJadwal,
    importJadwal
} from '../controllers/jadwalControllers'

const router = Router()
router.use(verifyToken)

router.get("/", getAllJadwal)
router.post("/", checkRole("ADMIN", "SUPER_ADMIN", "KESISWAAN"), createJadwal)
router.post("/import", checkRole("ADMIN", "SUPER_ADMIN", "KESISWAAN"), upload.single("file"), importJadwal)
router.put("/:id", checkRole("ADMIN", "SUPER_ADMIN", "KESISWAAN"), updateJadwal)
router.delete("/:id", checkRole("ADMIN", "SUPER_ADMIN", "KESISWAAN"), deleteJadwal)

export default router
