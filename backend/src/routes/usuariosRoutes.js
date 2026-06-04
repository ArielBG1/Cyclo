import { Router } from 'express'
import { verificarToken } from '../middlewares/authMiddleware.js'
import { misLogros } from '../controllers/usuariosController.js'

const router = Router()

router.get('/mis-logros', verificarToken, misLogros)

export default router
