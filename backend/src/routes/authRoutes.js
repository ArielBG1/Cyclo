import { Router } from 'express'
import { registro, login, obtenerPerfil } from '../controllers/authController.js'
import { verificarToken } from '../middlewares/authMiddleware.js'

const router = Router()

router.post('/registro', registro)
router.post('/login', login)
router.get('/me', verificarToken, obtenerPerfil)

export default router
