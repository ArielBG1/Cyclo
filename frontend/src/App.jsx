import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Navbar from './components/Navbar'
import RutaAdmin from './components/RutaAdmin'
import RutaPrivada from './components/RutaPrivada'
import ErrorBoundary from './components/ErrorBoundary'
import Home from './pages/Home'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Escanear from './pages/Escanear'
import Perfil from './pages/Perfil'
import AdminLayout from './pages/admin/AdminLayout'
import AdminPuntos from './pages/admin/AdminPuntos'
import AdminDashboard from './pages/admin/AdminDashboard'

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
          <div className="pt-14 md:pt-16">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/registro" element={<Registro />} />
              <Route path="/escanear" element={<Escanear />} />
              <Route path="/perfil" element={<RutaPrivada><Perfil /></RutaPrivada>} />

              {/* Admin (protegido por RutaAdmin → AdminLayout con tabs) */}
              <Route path="/admin" element={<RutaAdmin />}>
                <Route element={<AdminLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<ErrorBoundary><AdminDashboard /></ErrorBoundary>} />
                  <Route path="puntos" element={<AdminPuntos />} />
                </Route>
              </Route>
            </Routes>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
