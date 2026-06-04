import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Users, MapPin, CheckCircle2, Recycle, Star, Calendar,
  AlertCircle, Medal, BarChart3,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import api from '../../services/api'
import { colorContenedor } from '../../utils/colorContenedor'
import { traducirMaterial } from '../../utils/materialKey'

// ── Helpers ─────────────────────────────────────────────────────────────────

// Completa los huecos en la serie temporal con 0 para que la línea cubra los 30
// días aunque algunos no tengan check-ins.
function rellenar30Dias(datos) {
  const map = new Map(
    (datos || []).map((d) => {
      const iso = typeof d.fecha === 'string' ? d.fecha.split('T')[0] : new Date(d.fecha).toISOString().split('T')[0]
      return [iso, Number(d.cantidad) || 0]
    })
  )
  const out = []
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  for (let i = 29; i >= 0; i--) {
    const d = new Date(hoy)
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().split('T')[0]
    out.push({
      fecha: iso,
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      cantidad: map.get(iso) || 0,
    })
  }
  return out
}

function formatNumero(n) {
  if (n == null) return '0'
  return new Intl.NumberFormat('es-AR').format(Math.round(n))
}
function formatKg(n) {
  if (n == null) return '0'
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(Number(n) || 0)
}

// ── Componente principal ────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { t } = useTranslation()

  const [stats, setStats]         = useState(null)
  const [porPunto, setPorPunto]   = useState([])
  const [materiales, setMats]     = useState([])
  const [ranking, setRanking]     = useState([])
  const [temporal, setTemporal]   = useState([])
  const [cargando, setCargando]   = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    let cancelado = false
    setCargando(true)
    setError(null)

    Promise.all([
      api.get('/admin/stats/general'),
      api.get('/admin/stats/por-punto'),
      api.get('/admin/stats/materiales'),
      api.get('/admin/stats/ranking'),
      api.get('/admin/stats/temporal'),
    ])
      .then(([g, pp, m, r, te]) => {
        if (cancelado) return
        setStats(g.data)
        setPorPunto(pp.data)
        setMats(m.data)
        setRanking(r.data)
        setTemporal(rellenar30Dias(te.data))
      })
      .catch((err) => {
        if (!cancelado) setError(err.response?.data?.error || t('dashboard.errorCargar'))
      })
      .finally(() => {
        if (!cancelado) setCargando(false)
      })

    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rm-double-spinner" />
        <p className="text-muted text-sm mt-4">{t('dashboard.cargando')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="feedback-error flex items-start gap-2.5 px-4 py-3 text-sm">
        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
        {error}
      </div>
    )
  }

  const hayCheckins = (stats?.total_checkins ?? 0) > 0

  return (
    <div className="animate-fade-in space-y-6">
      {/* KPIs */}
      <KpiGrid stats={stats} t={t} />

      {/* Línea temporal */}
      <CardChart titulo={t('dashboard.actividadReciente')}>
        {hayCheckins ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={temporal} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                stroke="var(--color-border)"
                tick={{ fill: 'var(--color-text-soft)', fontSize: 11 }}
              />
              <YAxis
                stroke="var(--color-border)"
                tick={{ fill: 'var(--color-text-soft)', fontSize: 11 }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip etiqueta={t('dashboard.tooltipCantidad')} />} />
              <Line
                type="monotone"
                dataKey="cantidad"
                stroke="#1FAA59"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#1FAA59', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#1FAA59', strokeWidth: 2, stroke: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState t={t} />
        )}
      </CardChart>

      {/* Fila de 2 charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Materiales más reciclados */}
        <CardChart titulo={t('dashboard.materialesReciclados')}>
          {materiales.length > 0 && materiales.some((m) => m.total_kg > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={materiales} layout="vertical" margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="var(--color-border)"
                  tick={{ fill: 'var(--color-text-soft)', fontSize: 11 }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  stroke="var(--color-border)"
                  tick={{ fill: 'var(--color-text-soft)', fontSize: 11 }}
                  width={100}
                  tickFormatter={(name) => {
                    const m = materiales.find((x) => x.nombre === name)
                    return m ? traducirMaterial(t, m) : name
                  }}
                />
                <Tooltip content={<CustomTooltip etiqueta={t('dashboard.tooltipKg')} suffixKg />} />
                <Bar dataKey="total_kg" radius={[0, 8, 8, 0]}>
                  {materiales.map((m, i) => (
                    <Cell key={i} fill={colorContenedor(m.color_contenedor)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState t={t} />
          )}
        </CardChart>

        {/* Check-ins por punto */}
        <CardChart titulo={t('dashboard.checkinsPorPunto')}>
          {porPunto.length > 0 && porPunto.some((p) => p.cantidad_checkins > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={porPunto.slice(0, 10)}
                layout="vertical"
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="var(--color-border)"
                  tick={{ fill: 'var(--color-text-soft)', fontSize: 11 }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  stroke="var(--color-border)"
                  tick={{ fill: 'var(--color-text-soft)', fontSize: 11 }}
                  width={120}
                />
                <Tooltip content={<CustomTooltip etiqueta={t('dashboard.tooltipCantidad')} />} />
                <Bar dataKey="cantidad_checkins" fill="var(--color-brand)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState t={t} />
          )}
        </CardChart>
      </div>

      {/* Ranking de usuarios */}
      <CardChart titulo={t('dashboard.rankingUsuarios')}>
        {ranking.length > 0 ? <RankingTabla ranking={ranking} t={t} /> : <EmptyState t={t} />}
      </CardChart>
    </div>
  )
}

// ── KPIs ────────────────────────────────────────────────────────────────────

function KpiGrid({ stats, t }) {
  if (!stats) return null
  const items = [
    {
      key: 'total_usuarios',
      label: t('dashboard.totalUsuarios'),
      icon: Users,
      valor: formatNumero(stats.total_usuarios),
      bg: 'rgba(59, 130, 246, 0.12)',
      fg: '#3B82F6',
    },
    {
      key: 'total_puntos',
      label: t('dashboard.totalPuntos'),
      icon: MapPin,
      valor: formatNumero(stats.total_puntos),
      bg: 'rgba(31, 170, 89, 0.14)',
      fg: 'var(--color-brand)',
    },
    {
      key: 'total_checkins',
      label: t('dashboard.totalCheckins'),
      icon: CheckCircle2,
      valor: formatNumero(stats.total_checkins),
      bg: 'rgba(168, 85, 247, 0.12)',
      fg: '#A855F7',
    },
    {
      key: 'total_kg_reciclado',
      label: t('dashboard.totalKg'),
      icon: Recycle,
      valor: formatKg(stats.total_kg_reciclado),
      bg: 'rgba(16, 185, 129, 0.12)',
      fg: '#10B981',
    },
    {
      key: 'total_puntos_otorgados',
      label: t('dashboard.puntosOtorgados'),
      icon: Star,
      valor: formatNumero(stats.total_puntos_otorgados),
      bg: 'rgba(245, 158, 11, 0.14)',
      fg: '#F59E0B',
    },
    {
      key: 'checkins_hoy',
      label: t('dashboard.checkinsHoy'),
      icon: Calendar,
      valor: formatNumero(stats.checkins_hoy),
      bg: 'rgba(244, 63, 94, 0.12)',
      fg: '#F43F5E',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((it) => (
        <div
          key={it.key}
          className="bg-surface border border-theme rounded-2xl p-3 shadow-sm flex items-center gap-3 transition-shadow hover:shadow-md"
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: it.bg, color: it.fg }}
          >
            <it.icon size={20} />
          </div>
          <div className="min-w-0">
            <p className="font-display text-xl font-bold text-main leading-none">{it.valor}</p>
            <p className="text-xs text-muted mt-1 truncate">{it.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Card wrapper para gráficos ──────────────────────────────────────────────

function CardChart({ titulo, children }) {
  return (
    <div className="bg-surface border border-theme rounded-2xl p-5 shadow-sm">
      <h3 className="font-display text-base font-bold text-main mb-4">{titulo}</h3>
      {children}
    </div>
  )
}

// ── Tooltip custom (respeta tema) ───────────────────────────────────────────

// Notas:
// - `label` lo inyecta recharts (valor del eje X / categoría según el chart).
// - `etiqueta` es nuestro prop (ej: "Check-ins", "kg") para acompañar el valor.
function CustomTooltip({ active, payload, label, etiqueta, suffixKg }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-surface border border-theme rounded-xl shadow-lg px-3 py-2 text-xs">
      {label && <p className="font-semibold text-main mb-1">{label}</p>}
      {payload.map((p, i) => {
        const val = typeof p.value === 'number'
          ? new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(p.value)
          : p.value
        return (
          <p key={i} className="text-soft flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: p.color || p.fill || 'var(--color-brand)' }}
            />
            <span>
              {etiqueta && <span className="text-muted mr-1">{etiqueta}:</span>}
              <span className="font-semibold text-main">{val}{suffixKg ? ' kg' : ''}</span>
            </span>
          </p>
        )
      })}
    </div>
  )
}

// ── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ t }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <BarChart3 size={36} className="text-muted mb-3" strokeWidth={1.5} />
      <p className="text-sm font-semibold text-soft">{t('dashboard.sinDatos')}</p>
      <p className="text-xs text-muted mt-1 max-w-xs">{t('dashboard.sinDatosDescripcion')}</p>
    </div>
  )
}

// ── Ranking tabla con medallas top 3 ────────────────────────────────────────

const MEDALLA = {
  1: { bg: 'rgba(234, 179, 8, 0.18)',  fg: '#CA8A04' }, // oro
  2: { bg: 'rgba(148, 163, 184, 0.22)', fg: '#475569' }, // plata
  3: { bg: 'rgba(217, 119, 6, 0.18)',  fg: '#B45309' }, // bronce
}

function MedallaPosicion({ posicion }) {
  if (posicion <= 3) {
    const c = MEDALLA[posicion]
    return (
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{ backgroundColor: c.bg, color: c.fg }}
        title={`#${posicion}`}
      >
        <Medal size={18} />
      </div>
    )
  }
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center bg-surface-alt text-soft text-xs font-bold">
      {posicion}
    </div>
  )
}

function RankingTabla({ ranking, t }) {
  return (
    <>
      {/* Desktop tabla */}
      <div className="hidden md:block overflow-x-auto -mx-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-theme">
              <th className="text-left px-3 py-2 text-xs font-bold text-muted uppercase tracking-wider w-16">
                {t('dashboard.rankingEncabezadoPosicion')}
              </th>
              <th className="text-left px-3 py-2 text-xs font-bold text-muted uppercase tracking-wider">
                {t('dashboard.rankingEncabezadoUsuario')}
              </th>
              <th className="text-left px-3 py-2 text-xs font-bold text-muted uppercase tracking-wider">
                {t('dashboard.rankingEncabezadoNivel')}
              </th>
              <th className="text-right px-3 py-2 text-xs font-bold text-muted uppercase tracking-wider">
                {t('dashboard.rankingEncabezadoPuntos')}
              </th>
              <th className="text-right px-3 py-2 text-xs font-bold text-muted uppercase tracking-wider">
                {t('dashboard.rankingEncabezadoCheckins')}
              </th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((u, i) => {
              const pos = i + 1
              return (
                <tr key={u.id} className="border-b border-theme last:border-0 hover:bg-surface-alt transition-colors">
                  <td className="px-3 py-2.5">
                    <MedallaPosicion posicion={pos} />
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-main">{u.nombre}</td>
                  <td className="px-3 py-2.5">
                    <BadgeNivel nivel={u.nivel} />
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-brand-600">
                    {formatNumero(u.puntos_totales)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-soft">
                    {formatNumero(u.cantidad_checkins)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-2">
        {ranking.map((u, i) => {
          const pos = i + 1
          return (
            <div key={u.id} className="flex items-center gap-3 bg-surface-alt rounded-xl px-3 py-2.5">
              <MedallaPosicion posicion={pos} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-main truncate">{u.nombre}</p>
                <p className="text-xs text-muted mt-0.5">
                  <BadgeNivel nivel={u.nivel} compacta />
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-brand-600">{formatNumero(u.puntos_totales)}</p>
                <p className="text-xs text-muted">{formatNumero(u.cantidad_checkins)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function BadgeNivel({ nivel, compacta = false }) {
  if (!nivel) return null
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${
        compacta ? 'text-[10px] px-2 py-0' : 'text-xs px-2 py-0.5'
      }`}
      style={{
        backgroundColor: 'var(--color-surface-alt)',
        color: 'var(--color-brand)',
        border: '1px solid var(--color-border)',
      }}
    >
      {nivel}
    </span>
  )
}
