import { Router } from 'express'
import { verificarToken } from '../middlewares/authMiddleware.js'
import { verificarAdmin } from '../middlewares/adminMiddleware.js'
import {
  listarPuntosAdmin,
  crearPunto,
  actualizarPunto,
  eliminarPunto,
  estadisticasGenerales,
  checkinsPorPunto,
  materialesMasReciclados,
  rankingUsuarios,
  checkinsEnElTiempo,
} from '../controllers/adminController.js'

const router = Router()

// Todas las rutas admin requieren token válido + rol admin
router.use(verificarToken, verificarAdmin)

router.get('/puntos',       listarPuntosAdmin)
router.post('/puntos',      crearPunto)
router.put('/puntos/:id',   actualizarPunto)
router.delete('/puntos/:id', eliminarPunto)

// Stats / dashboard
router.get('/stats/general',    estadisticasGenerales)
router.get('/stats/por-punto',  checkinsPorPunto)
router.get('/stats/materiales', materialesMasReciclados)
router.get('/stats/ranking',    rankingUsuarios)
router.get('/stats/temporal',   checkinsEnElTiempo)

export default router
