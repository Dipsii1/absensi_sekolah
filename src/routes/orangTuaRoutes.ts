import { Router } from 'express'
import { verifyToken, checkRole } from '../middleware/auth'
import {
    getAllOrangTua,
    getOrangTuaById,
    createOrangTua,
    updateOrangTua,
    deleteOrangTua
} from '../controllers/orangtuaControllers'

const router = Router()
router.use(verifyToken)

router.get("/", getAllOrangTua)
router.get("/:id", getOrangTuaById)
router.post("/", checkRole("ADMIN", "SUPER_ADMIN"), createOrangTua)
router.put("/:id", checkRole("ADMIN", "SUPER_ADMIN"), updateOrangTua)
router.delete("/:id", checkRole("ADMIN", "SUPER_ADMIN"), deleteOrangTua)

export default router
