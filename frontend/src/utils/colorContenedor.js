// Los colores de contenedor en la DB son nombres en español ("amarillo", "verde", etc.).
// Este helper los mapea a hex CSS reales y calcula el color de texto con mejor
// contraste usando luminancia (W3C).

const COLOR_NOMBRE_A_HEX = {
  amarillo: '#FACC15',
  verde:    '#16A34A',
  azul:     '#2563EB',
  gris:     '#6B7280',
  rojo:     '#DC2626',
  marron:   '#92400E',
  marrón:   '#92400E',
  naranja:  '#EA580C',
  blanco:   '#F3F4F6',
  negro:    '#111827',
}

const BRAND_DEFAULT = '#1FAA59'

// Acepta nombre en español, hex válido o null. Siempre devuelve un hex CSS.
export function colorContenedor(color) {
  if (!color) return BRAND_DEFAULT
  const c = color.toLowerCase().trim()
  if (/^#[0-9a-f]{3,8}$/i.test(c)) return c
  return COLOR_NOMBRE_A_HEX[c] || BRAND_DEFAULT
}

// Devuelve '#fff' o un gris oscuro según la luminancia del fondo, así el texto
// se lee bien en cualquier color de contenedor.
export function textoSobreColor(color) {
  const hex = colorContenedor(color).replace('#', '')
  if (hex.length < 6) return '#fff'
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luma > 0.6 ? '#111827' : '#fff'
}
