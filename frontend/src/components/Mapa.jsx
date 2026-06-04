import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Recycle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import MapaControls from './MapaControls'
import PopupPunto from './PopupPunto'
import CheckinModal from './CheckinModal'

// SVG inline del ícono recycle de lucide-react (los markers Leaflet usan HTML
// strings, no JSX, así que no podemos importar el componente directamente).
const SVG_RECYCLE = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"/>
    <path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12"/>
    <path d="m14 16-3 3 3 3"/>
    <path d="M8.293 13.596 7.196 9.5 3.1 10.598"/>
    <path d="m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 12.001 3a1.784 1.784 0 0 1 1.564.913l1.196 2.121"/>
    <path d="M13.378 9.633 14.5 7.5l3 1.5 1-1"/>
  </svg>
`

// Ícono verde con símbolo de reciclaje para los puntos
const iconoReciclaje = L.divIcon({
  className: '',
  html: `
    <div style="
      background:#0B4D43;
      width:34px;height:34px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,.3);
      display:flex;align-items:center;justify-content:center;
      color:#fff;
    ">
      <div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;">${SVG_RECYCLE}</div>
    </div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -36],
})

// Ícono azul para la ubicación del usuario
const iconoUsuario = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:22px;height:22px;display:flex;align-items:center;justify-content:center;">
      <div style="
        position:absolute;
        width:22px;height:22px;
        background:rgba(37,99,235,0.2);
        border-radius:50%;
      "></div>
      <div style="
        width:14px;height:14px;
        background:#2563eb;
        border-radius:50%;
        border:2.5px solid #fff;
        box-shadow:0 1px 6px rgba(37,99,235,.5);
        position:relative;z-index:1;
      "></div>
    </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -14],
})

const ASUNCION = [-25.2867, -57.3333]

const crearIconoCluster = (cluster) => {
  const count = cluster.getChildCount()
  let size = 44
  if (count >= 10) size = 54
  if (count >= 25) size = 64

  const svgSize = size >= 54 ? 18 : 14
  return L.divIcon({
    html: `
      <div style="
        background: #0B4D43;
        color: white;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        font-family: system-ui, -apple-system, sans-serif;
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        line-height: 1;
        padding-top: 2px;
      ">
        <div style="display:flex;align-items:center;justify-content:center;line-height:1;margin-bottom:2px;width:${svgSize}px;height:${svgSize}px;">
          ${SVG_RECYCLE.replace('width="16" height="16"', `width="${svgSize}" height="${svgSize}"`)}
        </div>
        <span style="
          font-size: ${size >= 54 ? '18px' : '15px'};
          font-weight: 800;
          line-height: 1;
          letter-spacing: -0.5px;
        ">${count}</span>
      </div>
    `,
    className: 'cluster-custom',
    iconSize: L.point(size, size),
    iconAnchor: [size / 2, size / 2],
  })
}

// Componente auxiliar para exponer la instancia del mapa via ref
function MapController({ mapRef }) {
  const map = useMap()
  useEffect(() => {
    mapRef.current = map
  }, [map, mapRef])
  return null
}

export default function Mapa() {
  const { usuario } = useAuth()
  const { t } = useTranslation()
  const mapRef = useRef(null)

  const [puntos, setPuntos] = useState([])
  const [materialesDisponibles, setMaterialesDisponibles] = useState([])
  const [filtrosMateriales, setFiltrosMateriales] = useState([])
  const [ubicacionUsuario, setUbicacionUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [puntoCheckin, setPuntoCheckin] = useState(null)

  // Carga inicial: puntos y materiales en paralelo
  useEffect(() => {
    Promise.all([api.get('/puntos'), api.get('/materiales')])
      .then(([resPuntos, resMateriales]) => {
        setPuntos(resPuntos.data)
        setMaterialesDisponibles(resMateriales.data)
      })
      .catch((err) => console.error('Error al cargar datos del mapa:', err))
      .finally(() => setCargando(false))
  }, [])

  function localizarUsuario() {
    if (!navigator.geolocation) {
      alert(t('mapa.errorGeoNoSoportada'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords
        setUbicacionUsuario({ lat, lng })
        mapRef.current?.setView([lat, lng], 15)
      },
      () => alert(t('mapa.errorGeoNoUbicacion'))
    )
  }

  // Filtrado: vacío = todos; si hay filtros = al menos un material coincide (OR).
  // Normaliza a Number para evitar type mismatch entre pg y json_agg.
  const puntosFiltrados =
    filtrosMateriales.length === 0
      ? puntos
      : puntos.filter((p) =>
          p.materiales.some((m) => filtrosMateriales.includes(Number(m.id)))
        )

  return (
    <div className="relative h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)]">
      <MapContainer
        center={ASUNCION}
        zoom={12}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <ZoomControl position="bottomleft" />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <MapController mapRef={mapRef} />

        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={crearIconoCluster}
          showCoverageOnHover={false}
          spiderfyOnMaxZoom={true}
          maxClusterRadius={50}
        >
          {puntosFiltrados.map((punto) => (
            <Marker
              key={punto.id}
              position={[punto.latitud, punto.longitud]}
              icon={iconoReciclaje}
            >
              <Popup minWidth={280} maxWidth={340}>
                <PopupPunto
                  punto={punto}
                  ubicacionUsuario={ubicacionUsuario}
                  onReciclar={(p) => setPuntoCheckin(p)}
                />
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>

        {ubicacionUsuario && (
          <Marker
            position={[ubicacionUsuario.lat, ubicacionUsuario.lng]}
            icon={iconoUsuario}
          >
            <Popup>
              <strong>{t('mapa.tuUbicacion')}</strong>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Panel de controles flotante */}
      <MapaControls
        materiales={materialesDisponibles}
        filtrosMateriales={filtrosMateriales}
        onCambiarFiltros={setFiltrosMateriales}
        onLocalizarUsuario={localizarUsuario}
        puntosMostrados={puntosFiltrados.length}
        puntosTotales={puntos.length}
      />

      {/* Modal de check-in */}
      {puntoCheckin && (
        <CheckinModal
          key={puntoCheckin.id}
          isOpen={true}
          punto={puntoCheckin}
          onClose={() => setPuntoCheckin(null)}
          onSuccess={() => {}}
        />
      )}

      {/* Overlay de carga */}
      {cargando && (
        <div
          className="animate-fade-in"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--map-loader-bg)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1002,
          }}
        >
          <div className="relative flex items-center justify-center">
            <div className="rm-double-spinner" />
            <Recycle size={22} className="absolute text-brand-500 animate-gentle-pulse" />
          </div>
          <p
            style={{
              marginTop: '18px',
              color: 'var(--color-text-soft)',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              letterSpacing: '0.01em',
            }}
          >
            {t('mapa.cargandoPuntos')}
          </p>
        </div>
      )}
    </div>
  )
}
