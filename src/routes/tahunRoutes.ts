import { Router } from 'express'
import { verifyToken, checkRole } from '../middleware/auth'
import {
    getAllTahunAjaran,
    getTahunAjaranById,
    createTahunAjaran,
    updateTahunAjaran,
    deleteTahunAjaran
} from '../controllers/tahunControllers'

const router = Router()

router.get("/", verifyToken, getAllTahunAjaran)
router.get("/:id", verifyToken, getTahunAjaranById)

// hanya SUPER_ADMIN
router.post("/", verifyToken, checkRole("SUPER_ADMIN"), createTahunAjaran)
router.put("/:id", verifyToken, checkRole("SUPER_ADMIN"), updateTahunAjaran)
router.delete("/:id", verifyToken, checkRole("SUPER_ADMIN"), deleteTahunAjaran)

export default router
