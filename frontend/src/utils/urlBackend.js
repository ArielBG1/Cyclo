// VITE_API_URL apunta a la API (ej: http://localhost:3000/api).
// Para servir archivos estáticos del backend (/uploads/...) hay que sacarle
// el /api del final. Este helper hace eso, y también deja pasar URLs absolutas
// sin tocarlas.
export function urlBackend(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path
  const apiUrl = import.meta.env.VITE_API_URL || ''
  const base = apiUrl.replace(/\/api\/?$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${cleanPath}`
}
