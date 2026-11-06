import { Router } from 'express'
import { verifyToken, checkRole } from '../middleware/auth'
import {
    getAllKelas,
    getKelasById,
    createKelas,
    updateKelas,
    deleteKelas,
    assignWalas
} from '../controllers/kelasControllers'

const router = Router()

router.use(verifyToken)

router.get("/", getAllKelas)
router.patch("/:id/assign-walas", checkRole("SUPER_ADMIN", "ADMIN"), assignWalas)
router.post("/", checkRole("ADMIN", "SUPER_ADMIN"), createKelas)
router.get("/:id", getKelasById)
router.put("/:id", checkRole("ADMIN", "SUPER_ADMIN"), updateKelas)
router.delete("/:id", checkRole("ADMIN", "SUPER_ADMIN"), deleteKelas)

export default router
