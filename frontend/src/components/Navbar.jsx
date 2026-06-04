import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Sun, Moon, Recycle, Leaf, Map, Camera, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import LanguageSelector from './LanguageSelector'

function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation()
  const isDark = theme === 'dark'
  const label = isDark ? t('navbar.themeToggleClaro') : t('navbar.themeToggleOscuro')
  return (
    <button
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={[
        'relative w-9 h-9 rounded-full flex items-center justify-center',
        'text-brand-100 hover:text-white hover:bg-brand-800/60',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:ring-offset-2 focus:ring-offset-brand-900',
        className,
      ].join(' ')}
    >
      <Sun
        size={18}
        className={[
          'absolute transition-all duration-300',
          isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75',
        ].join(' ')}
      />
      <Moon
        size={18}
        className={[
          'absolute transition-all duration-300',
          isDark ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100',
        ].join(' ')}
      />
    </button>
  )
}

export default function Navbar() {
  const { usuario, logout, esAdmin } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [dropdownAbierto, setDropdownAbierto] = useState(false)
  const dropdownRef = useRef(null)

  // Efecto visual al hacer scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const onClickAfuera = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownAbierto(false)
      }
    }
    document.addEventListener('mousedown', onClickAfuera)
    return () => document.removeEventListener('mousedown', onClickAfuera)
  }, [])

  // Cerrar menú móvil al navegar
  useEffect(() => {
    setMenuAbierto(false)
    setDropdownAbierto(false)
  }, [location.pathname])

  const iniciales = usuario?.nombre
    ? usuario.nombre.trim().split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : ''

  // Clase del link activo vs inactivo — subrayado animado desde el centro.
  // Con `porPrefijo=true` se marca activo si el pathname empieza con `path`
  // (útil para "Admin", que debe quedar marcado en cualquier subruta /admin/*).
  const linkClase = (path, porPrefijo = false) => {
    const activo = porPrefijo
      ? location.pathname.startsWith(path)
      : location.pathname === path
    return [
      'rm-nav-link text-sm font-medium',
      activo ? 'is-active text-white' : 'text-brand-100 hover:text-white',
    ].join(' ')
  }

  return (
    <nav
      className={[
        'fixed top-0 left-0 right-0 z-[1000] transition-all duration-300',
        scrolled
          ? 'bg-brand-900/85 backdrop-blur-lg shadow-lg border-b border-brand-800/40'
          : 'bg-gradient-to-r from-brand-900 via-brand-800 to-brand-900 shadow-sm',
      ].join(' ')}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 md:h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
          <Recycle size={22} className="text-brand-400 group-hover:scale-110 transition-transform duration-200" />
          <span className="font-display font-bold text-lg text-white tracking-tight">{t('marca.nombre')}</span>
        </Link>

        {/* Links centrales — solo desktop */}
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className={linkClase('/')}>{t('navbar.mapa')}</Link>
          {usuario && (
            <Link to="/escanear" className={linkClase('/escanear')}>{t('navbar.escanear')}</Link>
          )}
          {esAdmin && (
            <Link to="/admin/dashboard" className={linkClase('/admin', true)}>
              {t('admin.linkNavbar')}
            </Link>
          )}
        </div>

        {/* Lado derecho — solo desktop */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageSelector variante="desktop" />
          <ThemeToggle />
          {usuario ? (
            <>
              {/* Pill de puntos — animate al cambiar (key fuerza remount) */}
              <span
                key={usuario.puntos_totales ?? 0}
                className="animate-pill-pop inline-flex items-center gap-1.5 bg-brand-800/80 text-brand-100 text-sm font-medium px-3 py-1 rounded-full select-none shadow-sm border border-brand-700/40"
              >
                <Leaf size={13} />
                {usuario.puntos_totales ?? 0} {t('navbar.puntos')}
              </span>

              {/* Avatar + dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownAbierto(!dropdownAbierto)}
                  className="w-9 h-9 rounded-full bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm flex items-center justify-center transition-all duration-200 shadow-md ring-2 ring-brand-400/25 hover:ring-brand-400/55 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-brand-300 focus:ring-offset-2 focus:ring-offset-brand-900"
                  title={usuario.nombre}
                >
                  {iniciales}
                </button>

                {dropdownAbierto && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-surface rounded-xl shadow-xl border border-theme py-1 z-50 animate-scale-in">
                    <div className="px-4 py-2.5 border-b border-theme">
                      <p className="text-xs font-semibold text-main truncate">{usuario.nombre}</p>
                      <p className="text-xs text-muted truncate">{usuario.email}</p>
                    </div>
                    <Link
                      to="/perfil"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-soft hover:bg-surface-alt hover:text-brand-700 transition-colors"
                    >
                      {t('navbar.miPerfil')}
                    </Link>
                    <button
                      onClick={() => { logout(); setDropdownAbierto(false) }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:opacity-100 opacity-90 hover:bg-surface-alt transition-colors"
                    >
                      {t('navbar.cerrarSesion')}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-brand-100 border border-brand-600 hover:border-brand-400 hover:text-white px-4 py-1.5 rounded-xl transition-all duration-200"
              >
                {t('navbar.iniciarSesion')}
              </Link>
              <Link
                to="/registro"
                className="text-sm font-semibold text-white bg-brand-500 hover:bg-brand-400 px-4 py-1.5 rounded-xl transition-all duration-200 shadow-sm"
              >
                {t('navbar.registrarse')}
              </Link>
            </>
          )}
        </div>

        {/* Toggle + hamburger — solo móvil */}
        <div className="md:hidden flex items-center gap-1">
          <ThemeToggle />
          <button
            className="text-white p-1.5 hover:bg-brand-700 rounded-lg transition-colors"
            onClick={() => setMenuAbierto(!menuAbierto)}
            aria-label={t('navbar.menuAria')}
          >
            {menuAbierto ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Menú móvil — slide down */}
      <div
        className={[
          'md:hidden border-t border-brand-800 overflow-hidden transition-all duration-300',
          menuAbierto ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0',
        ].join(' ')}
      >
        <div className="bg-brand-900 px-4 py-4 flex flex-col gap-1">
          <Link
            to="/"
            className="flex items-center gap-3 text-brand-100 hover:text-white hover:bg-brand-800 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Map size={16} />
            {t('navbar.mapa')}
          </Link>
          {usuario && (
            <Link
              to="/escanear"
              className="flex items-center gap-3 text-brand-100 hover:text-white hover:bg-brand-800 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Camera size={16} />
              {t('navbar.escanear')}
            </Link>
          )}
          {esAdmin && (
            <Link
              to="/admin/dashboard"
              className="flex items-center gap-3 text-brand-100 hover:text-white hover:bg-brand-800 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Settings size={16} />
              {t('admin.linkNavbar')}
            </Link>
          )}

          <div className="border-t border-brand-800 mt-2 pt-3">
            {usuario ? (
              <>
                {/* Info de usuario */}
                <div className="flex items-center gap-3 px-3 py-2 mb-2">
                  <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {iniciales}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white leading-tight truncate">{usuario.nombre}</p>
                    <p className="text-xs text-brand-400 flex items-center gap-1">
                      <Leaf size={11} />
                      {usuario.puntos_totales ?? 0} {t('navbar.puntos')}
                    </p>
                  </div>
                </div>
                <Link
                  to="/perfil"
                  className="flex items-center gap-3 text-brand-100 hover:text-white hover:bg-brand-800 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  {t('navbar.miPerfil')}
                </Link>
                <button
                  onClick={logout}
                  className="w-full text-left text-red-400 hover:text-red-300 hover:bg-brand-800/60 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  {t('navbar.cerrarSesion')}
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <Link
                  to="/login"
                  className="text-center text-sm font-medium text-brand-100 border border-brand-600 hover:border-brand-400 hover:text-white px-4 py-2.5 rounded-xl transition-colors"
                >
                  {t('navbar.iniciarSesion')}
                </Link>
                <Link
                  to="/registro"
                  className="text-center text-sm font-semibold text-white bg-brand-500 hover:bg-brand-400 px-4 py-2.5 rounded-xl transition-colors"
                >
                  {t('navbar.registrarse')}
                </Link>
              </div>
            )}

            {/* Selector de idioma — variante mobile-inline */}
            <div className="border-t border-brand-800 mt-3 pt-3">
              <LanguageSelector variante="mobile-inline" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
