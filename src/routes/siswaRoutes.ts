import { Router } from 'express'
import { verifyToken, checkRole } from '../middleware/auth'
import upload from '../middleware/upload'
import {
    getAllSiswa,
    getSiswaById,
    createSiswa,
    updateSiswa,
    deleteSiswa,
    importSiswa,
    getSiswaCount
} from '../controllers/siswaControllers'

const router = Router()

router.post("/import", verifyToken, checkRole("ADMIN", "SUPER_ADMIN"), upload.single("file"), importSiswa);
router.get("/", getAllSiswa);
router.get("/count", verifyToken, checkRole("ADMIN", "SUPER_ADMIN"), getSiswaCount);
router.get("/:id", getSiswaById);
router.post("/", verifyToken, checkRole("ADMIN", "SUPER_ADMIN"), createSiswa);
router.put("/:id", verifyToken, checkRole("ADMIN", "SUPER_ADMIN"), updateSiswa);
router.delete("/:id", verifyToken, checkRole("ADMIN", "SUPER_ADMIN"), deleteSiswa);

export default router
