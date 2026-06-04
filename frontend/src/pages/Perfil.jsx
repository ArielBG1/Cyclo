import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Recycle, CheckCircle2, Star, MapPin, Cloud, Sparkles,
  Lock, Trophy, AlertCircle, Calendar, ArrowRight,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { traducirMaterial, traducirLogro } from '../utils/materialKey'
import { colorContenedor, textoSobreColor } from '../utils/colorContenedor'
import { IconoMaterial } from '../utils/iconoMaterial'
import { IconoLogro } from '../utils/iconoLogro'
import { IconoNivel } from '../utils/iconoNivel'
import { urlBackend } from '../utils/urlBackend'
import api from '../services/api'

// ── Helpers ─────────────────────────────────────────────────────────────────

// Tiempo relativo en el idioma activo usando Intl.RelativeTimeFormat.
// Para fechas viejas (>30 días) muestra fecha absoluta corta.
function tiempoRelativo(fechaIso, locale) {
  if (!fechaIso) return ''
  const fecha = new Date(fechaIso)
  const ahora = new Date()
  const diffMs = ahora - fecha
  const diffSec  = Math.floor(diffMs / 1000)
  const diffMin  = Math.floor(diffSec / 60)
  const diffHora = Math.floor(diffMin / 60)
  const diffDia  = Math.floor(diffHora / 24)

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (diffDia < 1) {
    if (diffHora < 1) {
      if (diffMin < 1) return rtf.format(-Math.max(0, diffSec), 'second')
      return rtf.format(-diffMin, 'minute')
    }
    return rtf.format(-diffHora, 'hour')
  }
  if (diffDia < 7) return rtf.format(-diffDia, 'day')
  if (diffDia < 30) return rtf.format(-Math.floor(diffDia / 7), 'week')
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(fecha)
}

function obtenerIniciales(nombre) {
  if (!nombre) return ''
  return nombre.trim().split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

function formatNum(n, decimales = 0) {
  if (n == null || Number.isNaN(n)) return '0'
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: decimales }).format(Number(n))
}

// ── Componente principal ────────────────────────────────────────────────────

export default function Perfil() {
  const { t, i18n } = useTranslation()
  const { usuario } = useAuth()

  const [stats, setStats]     = useState(null)
  const [logros, setLogros]   = useState([])
  const [checkins, setCheckins] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError]     = useState(null)

  const locale = (i18n.resolvedLanguage || i18n.language || 'es').split('-')[0]

  useEffect(() => {
    let cancelado = false
    setCargando(true)
    setError(null)

    Promise.all([
      api.get('/checkins/mis-stats'),
      api.get('/usuarios/mis-logros'),
      api.get('/checkins/mis-checkins'),
    ])
      .then(([s, l, c]) => {
        if (cancelado) return
        setStats(s.data)
        setLogros(l.data)
        setCheckins(c.data)
      })
      .catch((err) => {
        if (!cancelado) setError(err.response?.data?.error || t('perfil.errorCargar'))
      })
      .finally(() => { if (!cancelado) setCargando(false) })

    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (cargando) {
    return (
      <div className="bg-app min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
        <div className="rm-double-spinner" />
        <p className="text-muted text-sm mt-4">{t('perfil.cargando')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-app min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] p-6">
        <div className="max-w-3xl mx-auto">
          <div className="feedback-error flex items-start gap-2.5 px-4 py-3 text-sm">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-app min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] py-6 md:py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6 animate-fade-in">
        <Cabecera usuario={usuario} stats={stats} t={t} />
        <Stats stats={stats} t={t} />
        <Logros logros={logros} t={t} locale={locale} />
        <Historial checkins={checkins} t={t} locale={locale} />
      </div>
    </div>
  )
}

// ── Cabecera con avatar + nivel + barra ─────────────────────────────────────

function Cabecera({ usuario, stats, t }) {
  const iniciales = obtenerIniciales(usuario?.nombre)
  const tieneProximo = stats?.proximo_nivel != null

  const progresoActual = Math.max(0, (stats?.puntos_totales ?? 0) - (stats?.nivel_min ?? 0))
  const progresoTotal  = tieneProximo
    ? Math.max(1, (stats.proximo_nivel_min ?? 0) - (stats.nivel_min ?? 0))
    : 1
  const progresoPct = tieneProximo
    ? Math.min(100, Math.round((progresoActual / progresoTotal) * 100))
    : 100

  return (
    <div className="bg-surface border border-theme rounded-2xl p-5 md:p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-brand-500 text-white font-display font-bold text-xl md:text-2xl flex items-center justify-center shadow-md ring-2 ring-brand-400/30 flex-shrink-0">
          {iniciales}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl md:text-2xl font-bold text-main truncate">
            {usuario?.nombre}
          </h1>
          <p className="text-xs md:text-sm text-muted truncate">{usuario?.email}</p>
          <span
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-alt border border-theme text-xs md:text-sm font-semibold text-brand-600"
            style={{ maxWidth: '100%' }}
          >
            <IconoNivel nivel={stats?.nivel} size={14} />
            <span className="truncate">{stats?.nivel}</span>
          </span>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2 gap-2">
          <span className="text-xs font-semibold text-muted truncate">
            {tieneProximo
              ? t('perfil.progresoHacia', { nivel: stats.proximo_nivel })
              : t('perfil.nivelMaximo')}
          </span>
          <span className="text-xs font-semibold text-soft whitespace-nowrap">
            {tieneProximo
              ? t('perfil.puntosFormato', {
                  actuales: formatNum(stats.puntos_totales),
                  proximo: formatNum(stats.proximo_nivel_min),
                })
              : `${formatNum(stats?.puntos_totales ?? 0)} pts`}
          </span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-alt)' }}>
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-700"
            style={{ width: `${progresoPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Grid de stats ───────────────────────────────────────────────────────────

function Stats({ stats, t }) {
  if (!stats) return null

  const co2 = (Number(stats.total_kg) || 0) * 1.5

  const items = [
    { key: 'kg',       icon: Recycle,      bg: 'rgba(16, 185, 129, 0.12)', fg: '#10B981', valor: formatNum(stats.total_kg, 1), label: t('perfil.kgReciclados') },
    { key: 'checkins', icon: CheckCircle2, bg: 'rgba(168, 85, 247, 0.12)', fg: '#A855F7', valor: formatNum(stats.total_checkins), label: t('perfil.totalCheckins') },
    { key: 'puntos',   icon: Star,         bg: 'rgba(245, 158, 11, 0.14)', fg: '#F59E0B', valor: formatNum(stats.puntos_totales), label: t('perfil.puntosTotales') },
    { key: 'visit',    icon: MapPin,       bg: 'rgba(31, 170, 89, 0.14)',  fg: 'var(--color-brand)', valor: formatNum(stats.puntos_distintos), label: t('perfil.puntosVisitados') },
    { key: 'co2',      icon: Cloud,        bg: 'rgba(59, 130, 246, 0.12)', fg: '#3B82F6', valor: formatNum(co2, 1), label: t('perfil.co2Evitado'), suffix: t('perfil.co2Unidad') },
  ]

  return (
    <div>
      <h2 className="font-display text-base md:text-lg font-bold text-main mb-3">
        {t('perfil.statsTitulo')}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((it) => (
          <div
            key={it.key}
            className="bg-surface border border-theme rounded-2xl p-3 shadow-sm flex items-center gap-3"
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: it.bg, color: it.fg }}
            >
              <it.icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="font-display text-xl font-bold text-main leading-none">
                {it.valor}
                {it.suffix && <span className="text-xs text-muted ml-1 font-medium">{it.suffix}</span>}
              </p>
              <p className="text-xs text-muted mt-1 truncate">{it.label}</p>
            </div>
          </div>
        ))}

        {/* Material favorito — card especial con el color del contenedor */}
        {stats.material_favorito && (
          <MaterialFavoritoCard material={stats.material_favorito} t={t} />
        )}
      </div>
    </div>
  )
}

function MaterialFavoritoCard({ material, t }) {
  const color = colorContenedor(material.color_contenedor)
  return (
    <div className="bg-surface border border-theme rounded-2xl p-3 shadow-sm flex items-center gap-3">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}26`, color }}
      >
        <IconoMaterial material={material} size={20} />
      </div>
      <div className="min-w-0">
        <p className="font-display text-base font-bold text-main leading-none truncate">
          {traducirMaterial(t, material)}
        </p>
        <p className="text-xs text-muted mt-1 truncate inline-flex items-center gap-1">
          <Sparkles size={11} />
          {t('perfil.materialFavorito')}
        </p>
      </div>
    </div>
  )
}

// ── Logros ──────────────────────────────────────────────────────────────────

function Logros({ logros, t, locale }) {
  if (!logros || logros.length === 0) return null
  const desbloqueados = logros.filter((l) => l.desbloqueado).length
  const total = logros.length

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="font-display text-base md:text-lg font-bold text-main inline-flex items-center gap-2">
          <Trophy size={18} className="text-brand-600" />
          {t('perfil.logrosTitulo')}
        </h2>
        <span className="text-xs font-semibold text-muted whitespace-nowrap">
          {t('perfil.logrosContador', { actual: desbloqueados, total })}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {logros.map((l) => (
          <LogroCard key={l.id} logro={l} t={t} locale={locale} />
        ))}
      </div>
    </div>
  )
}

function LogroCard({ logro, t, locale }) {
  const trad = traducirLogro(t, logro)
  const desbloqueado = !!logro.desbloqueado

  if (!desbloqueado) {
    return (
      <div className="bg-surface border border-theme rounded-2xl p-4 flex items-center gap-3 opacity-70 hover:opacity-90 transition-opacity">
        <div className="w-12 h-12 rounded-full bg-surface-alt text-muted flex items-center justify-center flex-shrink-0">
          <Lock size={18} />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-soft truncate">{trad.nombre}</p>
          {trad.descripcion && (
            <p className="text-xs text-muted mt-0.5 leading-snug">{trad.descripcion}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-3 border"
      style={{
        backgroundColor: 'var(--color-surface-alt)',
        borderColor: 'var(--color-brand)',
      }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-white"
        style={{ backgroundColor: 'var(--color-brand)' }}
      >
        <IconoLogro logro={logro} size={20} />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-brand-600 truncate">{trad.nombre}</p>
        {trad.descripcion && (
          <p className="text-xs text-soft mt-0.5 leading-snug">{trad.descripcion}</p>
        )}
        {logro.obtenido_en && (
          <p className="text-[11px] text-muted mt-1 inline-flex items-center gap-1">
            <Calendar size={10} />
            {t('perfil.obtenidoEn', { cuando: tiempoRelativo(logro.obtenido_en, locale) })}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Historial de check-ins ──────────────────────────────────────────────────

function Historial({ checkins, t, locale }) {
  return (
    <div>
      <h2 className="font-display text-base md:text-lg font-bold text-main mb-3">
        {t('perfil.historialTitulo')}
      </h2>
      {checkins.length === 0 ? (
        <EmptyHistorial t={t} />
      ) : (
        <div className="space-y-2">
          {checkins.map((c) => (
            <CheckinItem key={c.id} checkin={c} t={t} locale={locale} />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyHistorial({ t }) {
  return (
    <div className="bg-surface border border-theme rounded-2xl p-8 text-center">
      <div
        className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-brand)' }}
      >
        <Recycle size={26} strokeWidth={1.8} />
      </div>
      <p className="font-display text-base font-bold text-main mb-1">{t('perfil.sinCheckins')}</p>
      <p className="text-sm text-muted mb-4 max-w-sm mx-auto">{t('perfil.sinCheckinsDescripcion')}</p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
      >
        {t('perfil.irAlMapa')}
        <ArrowRight size={14} />
      </Link>
    </div>
  )
}

function CheckinItem({ checkin, t, locale }) {
  const material = {
    id: checkin.material_id,
    nombre: checkin.material_nombre,
    color_contenedor: checkin.color_contenedor,
  }
  const color = colorContenedor(checkin.color_contenedor)
  const fg = textoSobreColor(checkin.color_contenedor)
  const fecha = tiempoRelativo(checkin.creado_en, locale)
  const fotoSrc = urlBackend(checkin.foto_url)
  const kgNum = Number(checkin.cantidad_estimada_kg) || 0

  return (
    <div className="bg-surface border border-theme rounded-2xl p-3 flex items-center gap-3 shadow-sm">
      {fotoSrc ? (
        <img
          src={fotoSrc}
          alt=""
          loading="lazy"
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover flex-shrink-0 bg-surface-alt"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      ) : (
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center flex-shrink-0 bg-surface-alt text-muted">
          <MapPin size={20} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-main truncate text-sm">{checkin.punto_nombre}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span
            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ backgroundColor: color, color: fg }}
          >
            <IconoMaterial material={material} size={10} />
            {traducirMaterial(t, material)}
          </span>
          <span className="text-xs text-muted font-medium">
            {t('perfil.historialKgUnidad', { kg: kgNum.toFixed(1) })}
          </span>
        </div>
        <p className="text-[11px] text-muted mt-1">{fecha}</p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-brand-600 whitespace-nowrap">
          {t('perfil.historialPtsFormato', { puntos: checkin.puntos_ganados })}
        </p>
      </div>
    </div>
  )
}
