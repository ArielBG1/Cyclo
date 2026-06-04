import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Guard de rutas que requieren usuario autenticado (cualquier rol).
// Mientras carga la sesión muestra un loader para evitar el flash de redirect.
export default function RutaPrivada({ children }) {
  const { usuario, cargando } = useAuth()

  if (cargando) {
    return (
      <div className="bg-app min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="rm-double-spinner" />
      </div>
    )
  }

  if (!usuario) return <Navigate to="/login" replace />
  return children
}
