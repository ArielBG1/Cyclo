import pool from '../config/db.js'

export async function listarMateriales(req, res) {
  try {
    const result = await pool.query('SELECT * FROM materiales')
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
