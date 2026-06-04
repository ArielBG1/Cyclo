import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

const ASUNCION = [-25.2867, -57.3333]

const iconoSeleccion = L.divIcon({
  className: '',
  html: `
    <div style="
      background:#1FAA59;width:30px;height:30px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:3px solid #fff;
      box-shadow:0 2px 10px rgba(0,0,0,.4);
      display:flex;align-items:center;justify-content:center;
    ">
      <div style="
        transform:rotate(45deg);
        width:10px;height:10px;
        border-radius:50%;
        background:#fff;
      "></div>
    </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
})

function ClickHandler({ onClick }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function MiniMapaSelector({ lat, lng, onCambio }) {
  const latNum = parseFloat(lat)
  const lngNum = parseFloat(lng)
  const valida = !isNaN(latNum) && !isNaN(lngNum)
  const centroInicial = valida ? [latNum, lngNum] : ASUNCION

  return (
    <div className="rounded-xl overflow-hidden border border-theme" style={{ height: '260px' }}>
      <MapContainer
        center={centroInicial}
        zoom={valida ? 14 : 12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <ClickHandler onClick={onCambio} />
        {valida && <Marker position={[latNum, lngNum]} icon={iconoSeleccion} />}
      </MapContainer>
    </div>
  )
}
