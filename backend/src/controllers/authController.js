import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../config/db.js'

export async function registro(req, res) {
  const { nombre, email, password } = req.body

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y password son requeridos' })
  }

  try {
    const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email])
    if (existe.rows.length > 0) {
      return res.status(409).json({ error: 'Email ya registrado' })
    }

    const password_hash = await bcrypt.hash(password, 10)

    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, nombre, email, puntos_totales, nivel, rol`,
      [nombre, email, password_hash]
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function login(req, res) {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son requeridos' })
  }

  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email])
    const usuario = result.rows[0]

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash)
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        puntos_totales: usuario.puntos_totales,
        nivel: usuario.nivel,
        rol: usuario.rol,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function obtenerPerfil(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, nombre, email, puntos_totales, nivel, rol FROM usuarios WHERE id = $1',
      [req.usuario.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
