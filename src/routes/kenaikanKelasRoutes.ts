import { Router } from 'express'
import { verifyToken } from '../middleware/auth'
import {
    getPreviewKenaikan,
    submitKeputusanKenaikan
} from '../controllers/kenaikanKelasControllers'

const router = Router()
router.use(verifyToken)

router.get("/preview", getPreviewKenaikan)
router.post("/submit", submitKeputusanKenaikan)

export default router
