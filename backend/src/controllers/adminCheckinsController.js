import pool from '../config/db.js'
import { calcularNivel } from '../utils/niveles.js'

// GET /api/admin/checkins — solo super_admin. Últimos 200 (suficiente para
// moderar sin necesitar paginación con el volumen actual de la app).
export async function listarCheckinsAdmin(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        c.id, c.cantidad_estimada_kg, c.puntos_ganados, c.foto_url, c.creado_en,
        u.id   AS usuario_id,
        u.nombre AS usuario_nombre,
        u.email  AS usuario_email,
        p.id   AS punto_id,
        p.nombre AS punto_nombre,
        m.id   AS material_id,
        m.nombre AS material_nombre,
        m.color_contenedor
      FROM checkins c
      INNER JOIN usuarios u         ON c.usuario_id = u.id
      INNER JOIN puntos_reciclaje p ON c.punto_id = p.id
      INNER JOIN materiales m       ON c.material_id = m.id
      ORDER BY c.creado_en DESC
      LIMIT 200
    `)
    res.json(result.rows)
  } catch (err) {
    console.error('Error en listarCheckinsAdmin:', err)
    res.status(500).json({ error: err.message })
  }
}

// DELETE /api/admin/checkins/:id — solo super_admin
// Borra el check-in y le resta los puntos que había otorgado al usuario
// (recalculando el nivel). Los logros ya desbloqueados NO se revocan: es un
// caso borde poco común y revisarlo agrega complejidad que no vale la pena
// para el caso de uso principal (sacar un check-in fraudulento/de prueba).
export async function eliminarCheckinAdmin(req, res) {
  const id = parseInt(req.params.id)
  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const checkinRes = await client.query(
      'SELECT usuario_id, puntos_ganados FROM checkins WHERE id = $1',
      [id]
    )
    if (checkinRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Check-in no encontrado' })
    }
    const { usuario_id, puntos_ganados } = checkinRes.rows[0]

    await client.query('DELETE FROM checkins WHERE id = $1', [id])

    const userRes = await client.query('SELECT puntos_totales FROM usuarios WHERE id = $1', [usuario_id])
    const nuevoPuntos = Math.max(0, userRes.rows[0].puntos_totales - puntos_ganados)
    await client.query(
      'UPDATE usuarios SET puntos_totales = $1, nivel = $2 WHERE id = $3',
      [nuevoPuntos, calcularNivel(nuevoPuntos), usuario_id]
    )

    await client.query('COMMIT')
    res.json({ mensaje: 'Check-in eliminado correctamente', id })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Error en eliminarCheckinAdmin:', err)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
}
