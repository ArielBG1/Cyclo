import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Guard de rutas exclusivas de super_admin (gestión de usuarios, moderación
// de check-ins). A diferencia de RutaAdmin, un admin normal que no sea
// super_admin se redirige a /admin/puntos en vez de al home, porque sigue
// teniendo sesión de admin válida — solo no le corresponde esta sub-sección.
export default function RutaSuperAdmin({ children }) {
  const { usuario, cargando, esAdmin, esSuperAdmin } = useAuth()

  if (cargando) {
    return (
      <div className="bg-app min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="rm-double-spinner" />
      </div>
    )
  }

  if (!usuario) return <Navigate to="/login" replace />
  if (!esAdmin) return <Navigate to="/" replace />
  if (!esSuperAdmin) return <Navigate to="/admin/puntos" replace />

  return children ?? <Outlet />
}
