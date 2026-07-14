import { MapPin, Clock, Navigation, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { calcularDistancia, formatearDistancia } from '../utils/distancia'
import { formatearHorario } from '../utils/horario'
import { traducirMaterial } from '../utils/materialKey'
import { colorContenedor } from '../utils/colorContenedor'
import { IconoMaterial } from '../utils/iconoMaterial'

export default function PopupPunto({ punto, ubicacionUsuario, onReciclar }) {
  const { usuario } = useAuth()
  const { theme } = useTheme()
  const { t } = useTranslation()
  const isDark = theme === 'dark'

  const distancia =
    ubicacionUsuario != null
      ? calcularDistancia(
          ubicacionUsuario.lat,
          ubicacionUsuario.lng,
          punto.latitud,
          punto.longitud
        )
      : null

  const horario = formatearHorario(t, punto)

  return (
    <div style={{ minWidth: '260px', maxWidth: '320px', fontFamily: "'Inter', system-ui, sans-serif", padding: '16px' }}>

      {/* Nombre */}
      <p style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: '700', fontSize: '15px', color: 'var(--color-text)', margin: '0 0 8px' }}>
        {punto.nombre}
      </p>

      {/* Dirección */}
      {punto.direccion && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '4px' }}>
          <MapPin size={13} style={{ color: 'var(--color-text-muted)', marginTop: '1px', flexShrink: 0 }} />
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0, lineHeight: '1.4' }}>
            {punto.direccion}
          </p>
        </div>
      )}

      {/* Horario */}
      {horario && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '4px' }}>
          <Clock size={13} style={{ color: 'var(--color-text-muted)', marginTop: '1px', flexShrink: 0 }} />
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0, lineHeight: '1.4' }}>
            {horario}
          </p>
        </div>
      )}

      {/* Distancia — badge verde suave */}
      {distancia !== null && (
        <div style={{ marginBottom: '10px', marginTop: '2px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            backgroundColor: 'var(--color-surface-alt)',
            color: 'var(--color-brand)',
            fontSize: '11px',
            fontWeight: '600',
            padding: '3px 8px',
            borderRadius: '999px',
          }}>
            <Navigation size={11} />
            {t('popup.aDistancia', { distancia: formatearDistancia(distancia, t) })}
          </span>
        </div>
      )}

      {/* Chips de materiales — bordered pill */}
      {punto.materiales?.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
            {t('popup.materialesAceptados')}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {punto.materiales.map((m) => {
              const color = colorContenedor(m.color_contenedor)
              const bg = isDark ? `${color}33` : `${color}1A`
              return (
                <span
                  key={m.id}
                  style={{
                    border: `1.5px solid ${color}`,
                    color: color,
                    fontSize: '11px',
                    padding: '3px 9px',
                    borderRadius: '999px',
                    fontWeight: '600',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: bg,
                    transition: 'background-color 0.3s ease',
                  }}
                >
                  <IconoMaterial material={m} size={11} />
                  {traducirMaterial(t, m)}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Botones */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${punto.latitud},${punto.longitud}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            backgroundColor: '#1FAA59',
            color: '#fff',
            textAlign: 'center',
            padding: '8px 6px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: '600',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            transition: 'background-color 0.2s, transform 0.18s, box-shadow 0.18s',
            boxShadow: '0 1px 2px rgba(31,170,89,0.18)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#3FC380'
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 6px 14px rgba(31,170,89,0.30)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1FAA59'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(31,170,89,0.18)'
          }}
        >
          <Navigation size={12} />
          {t('popup.comoLlegar')}
        </a>

        <button
          disabled={!usuario}
          onClick={() => onReciclar && onReciclar(punto)}
          title={usuario ? t('popup.titleReciclarAqui') : t('popup.titleIniciaSesion')}
          style={{
            flex: 1,
            backgroundColor: usuario ? '#1FAA59' : '#C7D0CC',
            color: usuario ? '#fff' : '#6B7872',
            border: 'none',
            padding: '8px 6px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: usuario ? 'pointer' : 'not-allowed',
            opacity: usuario ? 1 : 0.6,
            transition: 'background-color 0.2s, transform 0.18s, box-shadow 0.18s',
            boxShadow: usuario ? '0 1px 2px rgba(31,170,89,0.18)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
          }}
          onMouseEnter={(e) => {
            if (!usuario) return
            e.currentTarget.style.backgroundColor = '#3FC380'
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 6px 14px rgba(31,170,89,0.30)'
          }}
          onMouseLeave={(e) => {
            if (!usuario) return
            e.currentTarget.style.backgroundColor = '#1FAA59'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(31,170,89,0.18)'
          }}
        >
          <Check size={12} />
          {t('popup.reciclarAqui')}
        </button>
      </div>
    </div>
  )
}
