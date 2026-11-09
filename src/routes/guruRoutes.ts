import { Router } from 'express'
import { verifyToken, checkRole } from '../middleware/auth'
import {
    getAllGuru,
    getGuruById,
    createGuru,
    updateGuru,
    deleteGuru,
    getGuruWalas
} from '../controllers/guruControllers'

const router = Router()

router.get("/", getAllGuru)

router.use(verifyToken)
router.get("/walas", getGuruWalas)
router.get("/:id", getGuruById)
router.post("/", checkRole("ADMIN", "SUPER_ADMIN"), createGuru)
router.put("/:id", checkRole("ADMIN", "SUPER_ADMIN"), updateGuru)
router.delete("/:id", checkRole("ADMIN", "SUPER_ADMIN"), deleteGuru)

export default router
