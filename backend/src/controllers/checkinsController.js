import pool from '../config/db.js'
import fs from 'fs'
import path from 'path'

const NIVELES = [
  { nombre: 'Principiante',       min: 0    },
  { nombre: 'Aprendiz',           min: 50   },
  { nombre: 'Reciclador',         min: 200  },
  { nombre: 'Eco-Activista',      min: 500  },
  { nombre: 'Eco-Warrior',        min: 1000 },
  { nombre: 'Guardián del Planeta', min: 2000 },
  { nombre: 'Maestro del Reciclaje', min: 5000 },
]

function calcularNivel(puntos) {
  let nivel = NIVELES[0].nombre
  for (const n of NIVELES) {
    if (puntos >= n.min) nivel = n.nombre
  }
  return nivel
}

// ── Endpoints del perfil de usuario ──────────────────────────────────────

// GET /api/checkins/mis-checkins
// Devuelve todos los check-ins del usuario logueado con datos del punto y
// material asociados, ordenados por fecha descendente.
export async function listarCheckinsUsuario(req, res) {
  const usuario_id = req.usuario.id
  try {
    const result = await pool.query(
      `
      SELECT
        c.id, c.cantidad_estimada_kg, c.puntos_ganados, c.foto_url, c.creado_en,
        c.latitud, c.longitud,
        p.id   AS punto_id,
        p.nombre AS punto_nombre,
        p.direccion AS punto_direccion,
        m.id   AS material_id,
        m.nombre AS material_nombre,
        m.color_contenedor,
        m.icono AS material_icono
      FROM checkins c
      INNER JOIN puntos_reciclaje p ON c.punto_id = p.id
      INNER JOIN materiales m       ON c.material_id = m.id
      WHERE c.usuario_id = $1
      ORDER BY c.creado_en DESC
      `,
      [usuario_id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Error en listarCheckinsUsuario:', err)
    res.status(500).json({ error: err.message })
  }
}

// GET /api/checkins/mis-stats
// KPIs del usuario + cálculo del próximo nivel (usando el array NIVELES
// que ya está en este archivo, para no duplicar la lógica en el frontend).
export async function estadisticasUsuario(req, res) {
  const usuario_id = req.usuario.id
  try {
    const [statsRes, userRes, matFavRes] = await Promise.all([
      pool.query(
        `
        SELECT
          COUNT(*)::int                                 AS total_checkins,
          COALESCE(SUM(cantidad_estimada_kg), 0)::float AS total_kg,
          COUNT(DISTINCT punto_id)::int                 AS puntos_distintos
        FROM checkins
        WHERE usuario_id = $1
        `,
        [usuario_id]
      ),
      pool.query(
        'SELECT puntos_totales, nivel FROM usuarios WHERE id = $1',
        [usuario_id]
      ),
      pool.query(
        `
        SELECT m.id, m.nombre, m.color_contenedor, COUNT(*)::int AS veces
        FROM checkins c
        INNER JOIN materiales m ON c.material_id = m.id
        WHERE c.usuario_id = $1
        GROUP BY m.id, m.nombre, m.color_contenedor
        ORDER BY veces DESC
        LIMIT 1
        `,
        [usuario_id]
      ),
    ])

    const stats = statsRes.rows[0]
    const user = userRes.rows[0] || { puntos_totales: 0, nivel: NIVELES[0].nombre }
    const matFav = matFavRes.rows[0] || null

    // Calcular nivel actual / próximo a partir del array NIVELES
    const puntos = user.puntos_totales || 0
    let idxActual = 0
    for (let i = 0; i < NIVELES.length; i++) {
      if (puntos >= NIVELES[i].min) idxActual = i
    }
    const proximo = idxActual + 1 < NIVELES.length ? NIVELES[idxActual + 1] : null

    res.json({
      total_checkins:    stats.total_checkins,
      total_kg:          stats.total_kg,
      puntos_distintos:  stats.puntos_distintos,
      puntos_totales:    puntos,
      nivel:             user.nivel,
      nivel_min:         NIVELES[idxActual].min,
      proximo_nivel:     proximo ? proximo.nombre : null,
      proximo_nivel_min: proximo ? proximo.min : null,
      puntos_para_proximo: proximo ? proximo.min - puntos : 0,
      material_favorito: matFav
        ? { id: matFav.id, nombre: matFav.nombre, color_contenedor: matFav.color_contenedor }
        : null,
    })
  } catch (err) {
    console.error('Error en estadisticasUsuario:', err)
    res.status(500).json({ error: err.message })
  }
}

export async function crearCheckin(req, res) {
  const usuario_id = req.usuario.id
  const { punto_id, material_id, cantidad_estimada_kg, foto_base64, latitud, longitud } = req.body

  if (!punto_id || !material_id || !cantidad_estimada_kg || !foto_base64 || latitud == null || longitud == null) {
    return res.status(400).json({ error: 'Todos los campos son requeridos: punto_id, material_id, cantidad_estimada_kg, foto_base64, latitud, longitud' })
  }

  const cantidad = parseFloat(cantidad_estimada_kg)
  if (isNaN(cantidad) || cantidad <= 0 || cantidad > 50) {
    return res.status(400).json({ error: 'La cantidad debe ser entre 0.1 y 50 kg' })
  }

  const punto_id_int   = parseInt(punto_id)
  const material_id_int = parseInt(material_id)

  const client = await pool.connect()
  try {
    // 1. Verificar que el punto acepta ese material
    const pmRes = await client.query(
      'SELECT 1 FROM puntos_materiales WHERE punto_id = $1 AND material_id = $2',
      [punto_id_int, material_id_int]
    )
    if (pmRes.rows.length === 0) {
      return res.status(400).json({ error: 'Este punto no acepta ese material' })
    }

    // 2. Verificar distancia ≤ 100 m
    const distRes = await client.query(
      `SELECT ST_Distance(ubicacion, ST_GeogFromText($1)) AS distancia
       FROM puntos_reciclaje WHERE id = $2`,
      [`POINT(${longitud} ${latitud})`, punto_id_int]
    )
    if (distRes.rows.length === 0) {
      return res.status(404).json({ error: 'Punto de reciclaje no encontrado' })
    }
    const distancia = parseFloat(distRes.rows[0].distancia)
    if (distancia > 100) {
      return res.status(400).json({
        error: `Tenés que estar a menos de 100 metros del punto para hacer check-in (estás a ${Math.round(distancia)} m)`,
      })
    }

    // 3. Cooldown: mismo usuario + mismo punto en la última hora
    const coolRes = await client.query(
      `SELECT 1 FROM checkins
       WHERE usuario_id = $1 AND punto_id = $2
         AND creado_en > NOW() - INTERVAL '1 hour'`,
      [usuario_id, punto_id_int]
    )
    if (coolRes.rows.length > 0) {
      return res.status(429).json({ error: '¡Ya reciclaste aquí hace menos de 1 hora! Volvé más tarde.' })
    }

    // 4. Límite de 5 check-ins por día
    const diaRes = await client.query(
      `SELECT COUNT(*)::int AS total FROM checkins
       WHERE usuario_id = $1 AND creado_en > NOW() - INTERVAL '24 hours'`,
      [usuario_id]
    )
    if (diaRes.rows[0].total >= 5) {
      return res.status(429).json({ error: 'Alcanzaste el límite de 5 check-ins diarios. ¡Volvé mañana!' })
    }

    // 5. Calcular puntos
    const matRes = await client.query('SELECT puntos_por_kg FROM materiales WHERE id = $1', [material_id_int])
    if (matRes.rows.length === 0) {
      return res.status(404).json({ error: 'Material no encontrado' })
    }
    const puntos_ganados = Math.round(cantidad * matRes.rows[0].puntos_por_kg)

    // 6. Guardar foto en uploads/
    const uploadsDir = path.join(process.cwd(), 'uploads')
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
    const base64Data    = foto_base64.replace(/^data:image\/\w+;base64,/, '')
    const nombreArchivo = `checkin_${usuario_id}_${Date.now()}.jpg`
    fs.writeFileSync(path.join(uploadsDir, nombreArchivo), Buffer.from(base64Data, 'base64'))
    const foto_url = `/uploads/${nombreArchivo}`

    // 7. Transacción: insertar checkin + actualizar usuario + logros
    await client.query('BEGIN')

    const checkinRes = await client.query(
      `INSERT INTO checkins
         (usuario_id, punto_id, material_id, cantidad_estimada_kg, foto_url, puntos_ganados, latitud, longitud)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [usuario_id, punto_id_int, material_id_int, cantidad, foto_url, puntos_ganados, latitud, longitud]
    )

    const updRes = await client.query(
      `UPDATE usuarios SET puntos_totales = puntos_totales + $1
       WHERE id = $2 RETURNING id, nombre, email, puntos_totales, nivel`,
      [puntos_ganados, usuario_id]
    )
    const usu        = updRes.rows[0]
    const nuevoPuntos = usu.puntos_totales
    const nuevaNivel  = calcularNivel(nuevoPuntos)
    const subioDeNivel = nuevaNivel !== usu.nivel

    if (subioDeNivel) {
      await client.query('UPDATE usuarios SET nivel = $1 WHERE id = $2', [nuevaNivel, usuario_id])
      usu.nivel = nuevaNivel
    }
    usu.subio_de_nivel = subioDeNivel

    // 8. Verificar logros (stats incluyen el checkin recién insertado)
    const statsRes = await client.query(
      `SELECT COUNT(*)::int AS total_checkins,
              COUNT(DISTINCT punto_id)::int AS puntos_distintos
       FROM checkins WHERE usuario_id = $1`,
      [usuario_id]
    )
    const stats = statsRes.rows[0]

    const logrosYaRes = await client.query(
      'SELECT logro_id FROM usuarios_logros WHERE usuario_id = $1',
      [usuario_id]
    )
    const logrosYa = new Set(logrosYaRes.rows.map((r) => r.logro_id))

    const todosRes = await client.query('SELECT * FROM logros ORDER BY id')
    const logrosNuevos = []

    for (const logro of todosRes.rows) {
      if (logrosYa.has(logro.id)) continue
      const cond = logro.condicion
      let cumple = false
      if      (cond.startsWith('checkins >='))        cumple = stats.total_checkins >= parseInt(cond.split('>=')[1])
      else if (cond.startsWith('puntos_totales >='))   cumple = nuevoPuntos >= parseInt(cond.split('>=')[1])
      else if (cond.startsWith('puntos_distintos >=')) cumple = stats.puntos_distintos >= parseInt(cond.split('>=')[1])

      if (cumple) {
        await client.query(
          'INSERT INTO usuarios_logros (usuario_id, logro_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [usuario_id, logro.id]
        )
        logrosNuevos.push(logro)
      }
    }

    await client.query('COMMIT')

    res.status(201).json({
      checkin:              checkinRes.rows[0],
      usuario:              usu,
      logros_desbloqueados: logrosNuevos,
    })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Error en crearCheckin:', err)
    res.status(500).json({ error: 'Error interno del servidor' })
  } finally {
    client.release()
  }
}
