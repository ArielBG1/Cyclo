import { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const tokenGuardado = localStorage.getItem('token')
    if (!tokenGuardado) {
      setCargando(false)
      return
    }

    api
      .get('/auth/me')
      .then((res) => setUsuario(res.data))
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('usuario')
        setToken(null)
      })
      .finally(() => setCargando(false))
  }, [])

  function login(nuevoToken, nuevoUsuario) {
    localStorage.setItem('token', nuevoToken)
    localStorage.setItem('usuario', JSON.stringify(nuevoUsuario))
    setToken(nuevoToken)
    setUsuario(nuevoUsuario)
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setToken(null)
    setUsuario(null)
  }

  async function refrescarUsuario() {
    try {
      const res = await api.get('/auth/me')
      setUsuario(res.data)
    } catch {
      // Silencioso — el token puede seguir siendo válido
    }
  }

  const esAdmin = usuario?.rol === 'admin'

  return (
    <AuthContext.Provider value={{ usuario, token, login, logout, cargando, refrescarUsuario, esAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
