import pool from '../config/db.js'
import { calcularNivel } from '../utils/niveles.js'

const ROLES_ASIGNABLES = ['user', 'admin']

// GET /api/admin/usuarios — solo super_admin
export async function listarUsuarios(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        u.id, u.nombre, u.email, u.puntos_totales, u.nivel, u.rol, u.creado_en,
        (SELECT COUNT(*)::int FROM checkins c WHERE c.usuario_id = u.id) AS cantidad_checkins
      FROM usuarios u
      ORDER BY u.creado_en DESC
    `)
    res.json(result.rows)
  } catch (err) {
    console.error('Error en listarUsuarios:', err)
    res.status(500).json({ error: err.message })
  }
}

// PUT /api/admin/usuarios/:id — solo super_admin
// Permite cambiar el rol (solo entre 'user' y 'admin' — 'super_admin' no se
// puede asignar desde la API, se reserva a asignación manual por SQL) y/o
// ajustar puntos_totales a mano (recalculando el nivel).
export async function actualizarUsuario(req, res) {
  const id = parseInt(req.params.id)
  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  const { rol, puntos_totales } = req.body

  if (rol !== undefined && !ROLES_ASIGNABLES.includes(rol)) {
    return res.status(400).json({ error: `Rol inválido. Valores permitidos: ${ROLES_ASIGNABLES.join(', ')}` })
  }

  let puntos
  if (puntos_totales !== undefined) {
    puntos = parseInt(puntos_totales)
    if (isNaN(puntos) || puntos < 0) {
      return res.status(400).json({ error: 'puntos_totales debe ser un número mayor o igual a 0' })
    }
  }

  try {
    const exists = await pool.query('SELECT id, rol FROM usuarios WHERE id = $1', [id])
    if (exists.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    // No permitir tocar el rol de otro super_admin desde acá (evita que un
    // super_admin se pise entre sí o degrade a otro por accidente).
    if (exists.rows[0].rol === 'super_admin' && rol !== undefined) {
      return res.status(403).json({ error: 'El rol de un super administrador no se puede cambiar desde este panel' })
    }

    const sets = []
    const values = []
    let idx = 1

    if (rol !== undefined) { sets.push(`rol = $${idx++}`); values.push(rol) }
    if (puntos !== undefined) {
      sets.push(`puntos_totales = $${idx++}`); values.push(puntos)
      sets.push(`nivel = $${idx++}`);           values.push(calcularNivel(puntos))
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' })
    }

    values.push(id)
    const result = await pool.query(
      `UPDATE usuarios SET ${sets.join(', ')} WHERE id = $${idx}
       RETURNING id, nombre, email, puntos_totales, nivel, rol, creado_en`,
      values
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error('Error en actualizarUsuario:', err)
    res.status(500).json({ error: err.message })
  }
}
