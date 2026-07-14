import { Router } from 'express'
import { verificarToken } from '../middlewares/authMiddleware.js'
import { detectarMaterial } from '../controllers/escanearController.js'

const router = Router()

router.post('/', verificarToken, detectarMaterial)

export default router
