import { Router } from 'express'
import { verifyToken, checkRole } from '../middleware/auth'
import {
    getAllMapel,
    getMapelById,
    createMapel,
    updateMapel,
    deleteMapel
} from '../controllers/mapelControllers'

const router = Router()

router.use(verifyToken)

router.get("/", getAllMapel)
router.get("/:id", getMapelById)

// Hanya SUPER_ADMIN yang bisa tulis
router.post("/", checkRole("SUPER_ADMIN"), createMapel)
router.put("/:id", checkRole("SUPER_ADMIN"), updateMapel)
router.delete("/:id", checkRole("SUPER_ADMIN"), deleteMapel)

export default router
