import pool from '../config/db.js'

// Corre después de verificarToken + verificarAdmin. Igual que verificarAdmin,
// consulta el rol siempre desde la DB (no del JWT) para que un cambio de rol
// surta efecto inmediato. Reservado para gestión de usuarios y moderación de
// check-ins: capacidades más sensibles que el CRUD básico de puntos.
export async function verificarSuperAdmin(req, res, next) {
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
    if (result.rows[0].rol !== 'super_admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de super administrador.' })
    }
    next()
  } catch (err) {
    console.error('Error en verificarSuperAdmin:', err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}
