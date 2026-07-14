import pool from '../config/db.js'

// SELECT estándar que devuelve un punto con sus materiales agregados
const SELECT_PUNTO_CON_MATERIALES = `
  SELECT
    p.id, p.nombre, p.descripcion, p.direccion, p.verificado, p.creado_en,
    p.abierto_24h, p.dias_apertura, p.hora_apertura, p.hora_cierre,
    ST_Y(p.ubicacion::geometry) AS latitud,
    ST_X(p.ubicacion::geometry) AS longitud,
    COALESCE(
      json_agg(
        DISTINCT jsonb_build_object(
          'id', m.id,
          'nombre', m.nombre,
          'color_contenedor', m.color_contenedor,
          'icono', m.icono,
          'puntos_por_kg', m.puntos_por_kg
        )
      ) FILTER (WHERE m.id IS NOT NULL),
      '[]'
    ) AS materiales
  FROM puntos_reciclaje p
  LEFT JOIN puntos_materiales pm ON p.id = pm.punto_id
  LEFT JOIN materiales m ON pm.material_id = m.id
`

// GET /api/admin/puntos — todos los puntos (verificados o no) + conteo de check-ins
export async function listarPuntosAdmin(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        p.id, p.nombre, p.descripcion, p.direccion, p.verificado, p.creado_en,
        p.abierto_24h, p.dias_apertura, p.hora_apertura, p.hora_cierre,
        ST_Y(p.ubicacion::geometry) AS latitud,
        ST_X(p.ubicacion::geometry) AS longitud,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', m.id,
              'nombre', m.nombre,
              'color_contenedor', m.color_contenedor,
              'icono', m.icono,
              'puntos_por_kg', m.puntos_por_kg
            )
          ) FILTER (WHERE m.id IS NOT NULL),
          '[]'
        ) AS materiales,
        (SELECT COUNT(*)::int FROM checkins c WHERE c.punto_id = p.id) AS cantidad_checkins
      FROM puntos_reciclaje p
      LEFT JOIN puntos_materiales pm ON p.id = pm.punto_id
      LEFT JOIN materiales m ON pm.material_id = m.id
      GROUP BY p.id
      ORDER BY p.id DESC
    `)
    res.json(result.rows)
  } catch (err) {
    console.error('Error en listarPuntosAdmin:', err)
    res.status(500).json({ error: err.message })
  }
}

// POST /api/admin/puntos
export async function crearPunto(req, res) {
  const {
    nombre,
    descripcion,
    direccion,
    latitud,
    longitud,
    abierto_24h = false,
    dias_apertura,
    hora_apertura,
    hora_cierre,
    materiales = [],
    verificado = true,
  } = req.body

  if (!nombre || latitud == null || longitud == null) {
    return res.status(400).json({ error: 'nombre, latitud y longitud son requeridos' })
  }

  const lat = parseFloat(latitud)
  const lng = parseFloat(longitud)
  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Coordenadas inválidas' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const insertRes = await client.query(
      `INSERT INTO puntos_reciclaje
         (nombre, descripcion, direccion, ubicacion, abierto_24h, dias_apertura, hora_apertura, hora_cierre, creado_por, verificado)
       VALUES ($1, $2, $3, ST_GeogFromText($4), $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        nombre,
        descripcion || null,
        direccion || null,
        `POINT(${lng} ${lat})`,
        !!abierto_24h,
        abierto_24h ? null : (Array.isArray(dias_apertura) ? dias_apertura : null),
        abierto_24h ? null : (hora_apertura || null),
        abierto_24h ? null : (hora_cierre || null),
        req.usuario.id,
        !!verificado,
      ]
    )
    const puntoId = insertRes.rows[0].id

    if (Array.isArray(materiales) && materiales.length > 0) {
      const matIds = [...new Set(materiales.map((m) => parseInt(m)).filter((n) => !isNaN(n)))]
      for (const matId of matIds) {
        await client.query(
          'INSERT INTO puntos_materiales (punto_id, material_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [puntoId, matId]
        )
      }
    }

    await client.query('COMMIT')

    const finalRes = await client.query(
      `${SELECT_PUNTO_CON_MATERIALES} WHERE p.id = $1 GROUP BY p.id`,
      [puntoId]
    )
    res.status(201).json(finalRes.rows[0])
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Error en crearPunto:', err)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
}

// PUT /api/admin/puntos/:id
export async function actualizarPunto(req, res) {
  const id = parseInt(req.params.id)
  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  const {
    nombre, descripcion, direccion, latitud, longitud,
    abierto_24h, dias_apertura, hora_apertura, hora_cierre,
    materiales, verificado,
  } = req.body

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const exists = await client.query('SELECT id FROM puntos_reciclaje WHERE id = $1', [id])
    if (exists.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Punto no encontrado' })
    }

    // UPDATE dinámico con los campos que vinieron
    const sets = []
    const values = []
    let idx = 1

    if (nombre !== undefined)      { sets.push(`nombre = $${idx++}`);      values.push(nombre) }
    if (descripcion !== undefined) { sets.push(`descripcion = $${idx++}`); values.push(descripcion || null) }
    if (direccion !== undefined)   { sets.push(`direccion = $${idx++}`);   values.push(direccion || null) }
    if (verificado !== undefined)  { sets.push(`verificado = $${idx++}`);  values.push(!!verificado) }
    if (abierto_24h !== undefined) {
      sets.push(`abierto_24h = $${idx++}`);   values.push(!!abierto_24h)
      sets.push(`dias_apertura = $${idx++}`); values.push(abierto_24h ? null : (Array.isArray(dias_apertura) ? dias_apertura : null))
      sets.push(`hora_apertura = $${idx++}`); values.push(abierto_24h ? null : (hora_apertura || null))
      sets.push(`hora_cierre = $${idx++}`);   values.push(abierto_24h ? null : (hora_cierre || null))
    }
    if (latitud !== undefined && longitud !== undefined) {
      const lat = parseFloat(latitud)
      const lng = parseFloat(longitud)
      if (isNaN(lat) || isNaN(lng)) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: 'Coordenadas inválidas' })
      }
      sets.push(`ubicacion = ST_GeogFromText($${idx++})`)
      values.push(`POINT(${lng} ${lat})`)
    }

    if (sets.length > 0) {
      values.push(id)
      await client.query(
        `UPDATE puntos_reciclaje SET ${sets.join(', ')} WHERE id = $${idx}`,
        values
      )
    }

    // Si vinieron materiales, reemplazar el set completo
    if (Array.isArray(materiales)) {
      await client.query('DELETE FROM puntos_materiales WHERE punto_id = $1', [id])
      const matIds = [...new Set(materiales.map((m) => parseInt(m)).filter((n) => !isNaN(n)))]
      for (const matId of matIds) {
        await client.query(
          'INSERT INTO puntos_materiales (punto_id, material_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, matId]
        )
      }
    }

    await client.query('COMMIT')

    const finalRes = await client.query(
      `${SELECT_PUNTO_CON_MATERIALES} WHERE p.id = $1 GROUP BY p.id`,
      [id]
    )
    res.json(finalRes.rows[0])
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Error en actualizarPunto:', err)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
}

// ── Estadísticas (dashboard admin) ────────────────────────────────────────

// GET /api/admin/stats/general → KPIs totales para el dashboard
export async function estadisticasGenerales(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM usuarios)                                       AS total_usuarios,
        (SELECT COUNT(*)::int FROM puntos_reciclaje)                                AS total_puntos,
        (SELECT COUNT(*)::int FROM checkins WHERE estado = 'activo')                AS total_checkins,
        COALESCE((SELECT SUM(cantidad_estimada_kg) FROM checkins WHERE estado = 'activo'), 0)::float AS total_kg_reciclado,
        COALESCE((SELECT SUM(puntos_ganados) FROM checkins WHERE estado = 'activo'), 0)::int         AS total_puntos_otorgados,
        (SELECT COUNT(*)::int FROM checkins WHERE estado = 'activo' AND creado_en::date = CURRENT_DATE) AS checkins_hoy
    `)
    res.json(result.rows[0])
  } catch (err) {
    console.error('Error en estadisticasGenerales:', err)
    res.status(500).json({ error: err.message })
  }
}

// GET /api/admin/stats/por-punto → cantidad y kg por punto
export async function checkinsPorPunto(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        p.id, p.nombre,
        COUNT(c.id)::int                                  AS cantidad_checkins,
        COALESCE(SUM(c.cantidad_estimada_kg), 0)::float   AS total_kg
      FROM puntos_reciclaje p
      LEFT JOIN checkins c ON p.id = c.punto_id AND c.estado = 'activo'
      GROUP BY p.id, p.nombre
      ORDER BY cantidad_checkins DESC, p.nombre ASC
    `)
    res.json(result.rows)
  } catch (err) {
    console.error('Error en checkinsPorPunto:', err)
    res.status(500).json({ error: err.message })
  }
}

// GET /api/admin/stats/materiales → cuánto se reciclo de cada material
export async function materialesMasReciclados(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        m.id, m.nombre, m.color_contenedor,
        COUNT(c.id)::int                                  AS cantidad_checkins,
        COALESCE(SUM(c.cantidad_estimada_kg), 0)::float   AS total_kg
      FROM materiales m
      LEFT JOIN checkins c ON m.id = c.material_id AND c.estado = 'activo'
      GROUP BY m.id, m.nombre, m.color_contenedor
      ORDER BY total_kg DESC, m.id ASC
    `)
    res.json(result.rows)
  } catch (err) {
    console.error('Error en materialesMasReciclados:', err)
    res.status(500).json({ error: err.message })
  }
}

// GET /api/admin/stats/ranking → top 10 usuarios por puntos
export async function rankingUsuarios(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        id, nombre, puntos_totales, nivel,
        (SELECT COUNT(*)::int FROM checkins WHERE usuario_id = usuarios.id AND estado = 'activo') AS cantidad_checkins
      FROM usuarios
      ORDER BY puntos_totales DESC, id ASC
      LIMIT 10
    `)
    res.json(result.rows)
  } catch (err) {
    console.error('Error en rankingUsuarios:', err)
    res.status(500).json({ error: err.message })
  }
}

// GET /api/admin/stats/temporal → check-ins por día (últimos 30 días)
export async function checkinsEnElTiempo(req, res) {
  try {
    const result = await pool.query(`
      SELECT creado_en::date AS fecha, COUNT(*)::int AS cantidad
      FROM checkins
      WHERE estado = 'activo' AND creado_en > NOW() - INTERVAL '30 days'
      GROUP BY creado_en::date
      ORDER BY fecha ASC
    `)
    res.json(result.rows)
  } catch (err) {
    console.error('Error en checkinsEnElTiempo:', err)
    res.status(500).json({ error: err.message })
  }
}

// DELETE /api/admin/puntos/:id
// Las relaciones en puntos_materiales y checkins se borran solas (ON DELETE CASCADE)
export async function eliminarPunto(req, res) {
  const id = parseInt(req.params.id)
  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido' })
  }
  try {
    const result = await pool.query(
      'DELETE FROM puntos_reciclaje WHERE id = $1 RETURNING id',
      [id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Punto no encontrado' })
    }
    res.json({ mensaje: 'Punto eliminado correctamente', id })
  } catch (err) {
    console.error('Error en eliminarPunto:', err)
    res.status(500).json({ error: err.message })
  }
}
