import jwt from 'jsonwebtoken'

export function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.startsWith('Bearer ') && authHeader.slice(7)

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.usuario = { id: payload.id, email: payload.email }
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
}
