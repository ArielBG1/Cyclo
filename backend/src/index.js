import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import pool from './config/db.js'
import materialesRoutes from './routes/materialesRoutes.js'
import puntosRoutes from './routes/puntosRoutes.js'
import authRoutes from './routes/authRoutes.js'
import checkinsRoutes from './routes/checkinsRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import usuariosRoutes from './routes/usuariosRoutes.js'
import escanearRoutes from './routes/escanearRoutes.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({
  origin: true,      // refleja el origin del request (acepta cualquier origen)
  credentials: true, // permite cookies y headers de autorización
}))
app.use(express.json({ limit: '10mb' }))
app.use('/uploads', express.static('uploads'))

// Verificar conexión a PostgreSQL al arrancar
try {
  const client = await pool.connect()
  client.release()
  console.log('✅ Conectado a PostgreSQL')
} catch (err) {
  console.error('❌ Error al conectar a PostgreSQL:', err.message || err)
  if (err.errors) {
    for (const e of err.errors) console.error('  causa:', e.message)
  }
  process.exit(1)
}

app.get('/', (req, res) => {
  res.json({ mensaje: 'API Cyclo funcionando' })
})

app.use('/api/materiales', materialesRoutes)
app.use('/api/puntos', puntosRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/checkins', checkinsRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/usuarios', usuariosRoutes)
app.use('/api/escanear', escanearRoutes)

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})
