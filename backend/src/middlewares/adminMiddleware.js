import pool from '../config/db.js'

// Se asume que verificarToken corrió antes y populó req.usuario.
// El rol se consulta SIEMPRE desde la DB (no del JWT) para que un cambio
// de rol surta efecto inmediatamente sin esperar a que expire el token.
export async function verificarAdmin(req, res, next) {
  if (!req.usuario?.id) {
    return res.status(401).json({ error: 'No autenticado' })
  }
  try {
    const result = await pool.query(
      'SELECT rol FROM usuarios WHERE id = $1',
      [req.usuario.id]
    )
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' })
    }
    if (result.rows[0].rol !== 'admin' && result.rows[0].rol !== 'super_admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' })
    }
    next()
  } catch (err) {
    console.error('Error en verificarAdmin:', err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}
