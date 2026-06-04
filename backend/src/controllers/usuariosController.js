import pool from '../config/db.js'

// GET /api/usuarios/mis-logros
// Devuelve TODOS los logros del sistema marcando cuáles tiene el usuario
// desbloqueados (LEFT JOIN con usuarios_logros). Útil para el perfil que
// muestra logros bloqueados/desbloqueados juntos.
export async function misLogros(req, res) {
  const usuario_id = req.usuario.id
  try {
    const result = await pool.query(
      `
      SELECT
        l.id, l.nombre, l.descripcion, l.icono, l.condicion,
        CASE WHEN ul.usuario_id IS NOT NULL THEN true ELSE false END AS desbloqueado,
        ul.obtenido_en
      FROM logros l
      LEFT JOIN usuarios_logros ul
        ON l.id = ul.logro_id AND ul.usuario_id = $1
      ORDER BY l.id
      `,
      [usuario_id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Error en misLogros:', err)
    res.status(500).json({ error: err.message })
  }
}
