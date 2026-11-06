import { Router } from 'express'
import {
    createRequest,
    getPendingRequests,
    respondRequest
} from '../controllers/statusRequestControllers'

const router = Router()

router.post("/", createRequest)
router.get("/pending", getPendingRequests)
router.patch("/:id/respond", respondRequest)

export default router
