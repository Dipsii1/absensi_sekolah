import { Router } from 'express'
import { verifyToken, checkRole } from '../middleware/auth'
import {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser
} from '../controllers/usersControllers'

const router = Router()

router.get("/", verifyToken, getAllUsers)
router.get("/:id", verifyToken, getUserById)

router.put("/:id", verifyToken, checkRole("SUPER_ADMIN"), updateUser)
router.delete("/:id", verifyToken, checkRole("SUPER_ADMIN"), deleteUser)

export default router
