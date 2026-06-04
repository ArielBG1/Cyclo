export function calcularDistancia(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return parseFloat((R * c).toFixed(2))
}

// Acepta una función `t` opcional de i18next para traducir las unidades.
// Si no se pasa, queda en español ("m"/"km") por retrocompatibilidad.
export function formatearDistancia(km, t = null) {
  const unidadM  = t ? t('comun.metros') : 'm'
  const unidadKm = t ? t('comun.km')     : 'km'
  if (km < 1) return `${Math.round(km * 1000)} ${unidadM}`
  return `${km.toFixed(1)} ${unidadKm}`
}
