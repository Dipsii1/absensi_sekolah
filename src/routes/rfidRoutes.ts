import { Router } from 'express'
import { verifyToken, checkRole } from '../middleware/auth'
import upload from '../middleware/upload'
import {
    getAllRfid,
    loadAllRfid,
    getRfidById,
    createRFID,
    updateRFID,
    deleteRFID,
    importRFID
} from '../controllers/rfidControllers'

const router = Router()

router.get("/", getAllRfid)
router.get("/load-Rfid", loadAllRfid)
router.get("/:id", getRfidById)
router.post("/", createRFID)
router.post("/import", upload.single("file"), importRFID)
router.put("/:id", updateRFID)
router.patch("/:id", updateRFID)
router.delete("/:id", deleteRFID)

export default router
