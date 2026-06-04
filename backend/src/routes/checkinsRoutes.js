import { Router } from 'express'
import { verificarToken } from '../middlewares/authMiddleware.js'
import {
  crearCheckin,
  listarCheckinsUsuario,
  estadisticasUsuario,
} from '../controllers/checkinsController.js'

const router = Router()

router.post('/',             verificarToken, crearCheckin)
router.get('/mis-checkins',  verificarToken, listarCheckinsUsuario)
router.get('/mis-stats',     verificarToken, estadisticasUsuario)

export default router
