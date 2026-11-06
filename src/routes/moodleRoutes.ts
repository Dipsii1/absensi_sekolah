import { Router } from 'express'

import { verifyToken } from '../middleware/auth'
import { getLmsAutologinUrl } from '../controllers/moodleControllers'

// Generate link auto-login ke Moodle LMS, dipakai tombol "Buka LMS" di dashboard siswa
const router = Router()

router.get("/lms-url", verifyToken, getLmsAutologinUrl)

export default router
