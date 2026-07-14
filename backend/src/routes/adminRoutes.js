import { Router } from 'express'
import { verificarToken } from '../middlewares/authMiddleware.js'
import { verificarAdmin } from '../middlewares/adminMiddleware.js'
import { verificarSuperAdmin } from '../middlewares/superAdminMiddleware.js'
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
import { listarUsuarios, actualizarUsuario } from '../controllers/adminUsuariosController.js'
import { listarCheckinsAdmin, eliminarCheckinAdmin } from '../controllers/adminCheckinsController.js'

const router = Router()

// Todas las rutas admin requieren token válido + rol admin (o super_admin)
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

// Gestión de usuarios y moderación de check-ins — solo super_admin
router.get('/usuarios',        verificarSuperAdmin, listarUsuarios)
router.put('/usuarios/:id',    verificarSuperAdmin, actualizarUsuario)
router.get('/checkins',        verificarSuperAdmin, listarCheckinsAdmin)
router.delete('/checkins/:id', verificarSuperAdmin, eliminarCheckinAdmin)

export default router
