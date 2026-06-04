import { Router } from 'express'
import { listarMateriales } from '../controllers/materialesController.js'

const router = Router()

router.get('/', listarMateriales)

export default router
