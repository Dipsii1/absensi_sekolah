import { Router } from 'express'
import { verifyToken, checkRole } from '../middleware/auth'
import {
    loginSiswa,
    login,
    logout,
    me
} from '../controllers/authControllers'

const router = Router()

// router.post("/register", verifyToken, checkRole("SUPER_ADMIN"), authController.register);
router.post("/moodle-login", loginSiswa)
router.post("/login", login)
router.post("/logout", verifyToken, logout)
router.get("/me", verifyToken, me)

export default router
