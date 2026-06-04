import pool from '../config/db.js'

export async function puntosCercanos(req, res) {
  const { material_id, lat, lng } = req.query
  if (!material_id || !lat || !lng) {
    return res.status(400).json({ error: 'Se requieren los parámetros material_id, lat y lng' })
  }
  try {
    const geog = `POINT(${lng} ${lat})`
    const result = await pool.query(`
      SELECT
        p.id, p.nombre, p.direccion, p.horario,
        ST_Y(p.ubicacion::geometry) AS latitud,
        ST_X(p.ubicacion::geometry) AS longitud,
        ROUND(
          (ST_Distance(p.ubicacion, ST_GeogFromText($1)) / 1000)::numeric,
          2
        ) AS distancia_km
      FROM puntos_reciclaje p
      INNER JOIN puntos_materiales pm ON p.id = pm.punto_id
      WHERE pm.material_id = $2
      ORDER BY p.ubicacion <-> ST_GeogFromText($1)
      LIMIT 3
    `, [geog, parseInt(material_id)])
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function listarPuntos(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        p.id, p.nombre, p.descripcion, p.direccion, p.horario,
        ST_Y(p.ubicacion::geometry) AS latitud,
        ST_X(p.ubicacion::geometry) AS longitud,
        COALESCE(
          json_agg(
            json_build_object('id', m.id, 'nombre', m.nombre, 'color_contenedor', m.color_contenedor, 'icono', m.icono, 'puntos_por_kg', m.puntos_por_kg)
          ) FILTER (WHERE m.id IS NOT NULL), '[]'
        ) AS materiales
      FROM puntos_reciclaje p
      LEFT JOIN puntos_materiales pm ON p.id = pm.punto_id
      LEFT JOIN materiales m ON pm.material_id = m.id
      GROUP BY p.id
      ORDER BY p.id
    `)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
