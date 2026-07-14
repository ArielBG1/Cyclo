import pool from '../config/db.js'
import { calcularNivel } from '../utils/niveles.js'
import { cumpleCondicion } from '../utils/logros.js'

// GET /api/admin/checkins — solo super_admin. Solo check-ins activos (los
// anulados desaparecen de la cola de moderación). Últimos 200 (suficiente
// para moderar sin necesitar paginación con el volumen actual de la app).
export async function listarCheckinsAdmin(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        c.id, c.cantidad_estimada_kg, c.puntos_ganados, c.foto_url, c.foto_base64, c.creado_en,
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
      WHERE c.estado = 'activo'
      ORDER BY c.creado_en DESC
      LIMIT 200
    `)
    const rows = result.rows.map(({ foto_base64, ...c }) => ({
      ...c,
      foto_url: foto_base64 ? `data:image/jpeg;base64,${foto_base64}` : c.foto_url,
    }))
    res.json(rows)
  } catch (err) {
    console.error('Error en listarCheckinsAdmin:', err)
    res.status(500).json({ error: err.message })
  }
}

// DELETE /api/admin/checkins/:id — solo super_admin
// No borra la fila: la marca estado = 'eliminado' (así queda el historial
// para auditoría). Le resta al usuario los puntos que ese check-in había
// otorgado (recalculando el nivel) y revoca cualquier logro que ya no
// corresponda con las estadísticas resultantes.
export async function eliminarCheckinAdmin(req, res) {
  const id = parseInt(req.params.id)
  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const checkinRes = await client.query(
      `SELECT usuario_id, puntos_ganados FROM checkins WHERE id = $1 AND estado = 'activo'`,
      [id]
    )
    if (checkinRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Check-in no encontrado' })
    }
    const { usuario_id, puntos_ganados } = checkinRes.rows[0]

    await client.query(`UPDATE checkins SET estado = 'eliminado' WHERE id = $1`, [id])

    const userRes = await client.query('SELECT puntos_totales FROM usuarios WHERE id = $1', [usuario_id])
    const nuevoPuntos = Math.max(0, userRes.rows[0].puntos_totales - puntos_ganados)
    await client.query(
      'UPDATE usuarios SET puntos_totales = $1, nivel = $2 WHERE id = $3',
      [nuevoPuntos, calcularNivel(nuevoPuntos), usuario_id]
    )

    // Revocar logros que ya no correspondan con las stats post-eliminación
    const statsRes = await client.query(
      `SELECT COUNT(*)::int AS total_checkins, COUNT(DISTINCT punto_id)::int AS puntos_distintos
       FROM checkins WHERE usuario_id = $1 AND estado = 'activo'`,
      [usuario_id]
    )
    const stats = { ...statsRes.rows[0], puntos_totales: nuevoPuntos }

    const logrosActualesRes = await client.query(
      `SELECT ul.logro_id, l.condicion FROM usuarios_logros ul
       INNER JOIN logros l ON ul.logro_id = l.id
       WHERE ul.usuario_id = $1`,
      [usuario_id]
    )

    const logrosRevocados = []
    for (const { logro_id, condicion } of logrosActualesRes.rows) {
      if (!cumpleCondicion(condicion, stats)) {
        await client.query(
          'DELETE FROM usuarios_logros WHERE usuario_id = $1 AND logro_id = $2',
          [usuario_id, logro_id]
        )
        logrosRevocados.push(logro_id)
      }
    }

    await client.query('COMMIT')
    res.json({ mensaje: 'Check-in anulado correctamente', id, logros_revocados: logrosRevocados })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Error en eliminarCheckinAdmin:', err)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
}
