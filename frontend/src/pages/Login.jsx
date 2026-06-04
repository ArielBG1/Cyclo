import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AlertCircle, CheckCircle, Recycle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const { t } = useTranslation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const mensajeExito = location.state?.mensaje

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      const res = await api.post('/auth/login', form)
      login(res.data.token, res.data.usuario)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || t('auth.errorLogin'))
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] grid md:grid-cols-2 bg-app relative z-10">

      {/* ── Panel izquierdo — solo desktop ── */}
      <div className="hidden md:flex flex-col justify-center relative overflow-hidden bg-brand-900">
        {/* Gradiente de fondo */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700" />
        {/* Círculos decorativos con flotación sutil */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand-800/60 animate-float-a" />
        <div className="absolute -bottom-32 -right-20 w-[28rem] h-[28rem] rounded-full bg-brand-700/40 animate-float-b" />
        <div className="absolute top-1/3 right-16 w-40 h-40 rounded-full bg-brand-600/25 animate-float-c" />
        {/* Contenido */}
        <div className="relative z-10 px-14 py-12 animate-fade-in">
          <Recycle size={56} className="text-brand-400 mb-8" strokeWidth={1.5} />
          <h1 className="font-display text-4xl font-extrabold text-white leading-tight mb-4 whitespace-pre-line">
            {t('auth.loginFraseDecorativa')}
          </h1>
          <p className="text-brand-200 text-lg leading-relaxed max-w-sm">
            {t('auth.loginFraseDescripcion')}
          </p>
          <p className="mt-8 text-brand-400 text-sm font-semibold tracking-wide uppercase">
            {t('marca.tagline')}
          </p>
        </div>
      </div>

      {/* ── Panel derecho — formulario ── */}
      <div className="flex items-center justify-center bg-app px-6 py-12 md:px-12">
        <div className="w-full max-w-sm animate-scale-in">

          {/* Logo solo en mobile */}
          <div className="md:hidden flex items-center justify-center gap-2 mb-10">
            <Recycle size={28} className="text-brand-500" />
            <span className="font-display text-2xl font-bold text-brand-500">{t('marca.nombre')}</span>
          </div>

          <h2 className="font-display text-2xl font-bold text-main mb-1">{t('auth.loginTitulo')}</h2>
          <p className="text-muted text-sm mb-8">{t('auth.loginSubtitulo')}</p>

          {/* Mensaje de éxito (viene del registro) */}
          {mensajeExito && (
            <div className="feedback-success flex items-start gap-2.5 px-4 py-3 mb-5 text-sm">
              <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
              {mensajeExito}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="feedback-error flex items-start gap-2.5 px-4 py-3 mb-5 text-sm">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-soft mb-1.5">{t('auth.email')}</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder={t('auth.emailPlaceholder')}
                className="w-full border border-theme bg-surface text-main placeholder-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 focus:border-transparent transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-soft mb-1.5">{t('auth.password')}</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                placeholder={t('auth.passwordPlaceholder')}
                className="w-full border border-theme bg-surface text-main placeholder-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 focus:border-transparent transition-all duration-200"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 mt-2"
            >
              {cargando ? t('auth.botonLoginCargando') : t('auth.botonLogin')}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-7">
            {t('auth.noTenesCuenta')}{' '}
            <Link to="/registro" className="font-semibold text-brand-600 hover:text-brand-500 transition-colors">
              {t('auth.linkRegistro')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
