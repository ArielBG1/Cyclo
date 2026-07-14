// Evalúa si unas estadísticas de usuario cumplen la condición de un logro.
// `condicion` viene de la tabla `logros` (ej: "checkins >= 10").
// `stats` = { total_checkins, puntos_totales, puntos_distintos }
export function cumpleCondicion(condicion, stats) {
  if (condicion.startsWith('checkins >=')) {
    return stats.total_checkins >= parseInt(condicion.split('>=')[1])
  }
  if (condicion.startsWith('puntos_totales >=')) {
    return stats.puntos_totales >= parseInt(condicion.split('>=')[1])
  }
  if (condicion.startsWith('puntos_distintos >=')) {
    return stats.puntos_distintos >= parseInt(condicion.split('>=')[1])
  }
  return false
}
