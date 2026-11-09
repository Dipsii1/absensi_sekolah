import { Router } from 'express'
import { checkRole, verifyToken } from '../middleware/auth'
import { createRole, deleteRole, getAllRole, getRoleById, updateRole } from '../controllers/roleControllers'

const router = Router()

router.use(verifyToken, checkRole('SUPER_ADMIN'))
router.get('/', getAllRole)
router.get('/:id', getRoleById)
router.post('/', createRole)
router.put('/:id', updateRole)
router.delete('/:id', deleteRole)

export default router
