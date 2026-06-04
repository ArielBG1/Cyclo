import { Router } from 'express'
import { listarPuntos, puntosCercanos } from '../controllers/puntosController.js'

const router = Router()

router.get('/cercanos', puntosCercanos)
router.get('/', listarPuntos)

export default router
