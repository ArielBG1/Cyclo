import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Guard de rutas /admin/*
// - Mientras carga el contexto: muestra un loader mínimo (evita el flash de redirect)
// - Si no hay sesión: redirige a /login
// - Si la sesión no es admin: redirige al home
// - Si es admin: renderiza children o <Outlet /> según cómo se use
export default function RutaAdmin({ children }) {
  const { usuario, cargando, esAdmin } = useAuth()

  if (cargando) {
    return (
      <div className="bg-app min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="rm-double-spinner" />
      </div>
    )
  }

  if (!usuario) return <Navigate to="/login" replace />
  if (!esAdmin) return <Navigate to="/" replace />

  return children ?? <Outlet />
}
