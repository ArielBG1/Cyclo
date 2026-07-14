// Días de la semana en convención ISO 8601: 1=lunes ... 7=domingo
const CLAVES_DIA = {
  1: 'lunes',
  2: 'martes',
  3: 'miercoles',
  4: 'jueves',
  5: 'viernes',
  6: 'sabado',
  7: 'domingo',
}

// Agrupa días consecutivos en rangos: [1,2,3,5,6] → [[1,3],[5,6]]
function agruparRangos(dias) {
  const ordenados = [...new Set(dias)].sort((a, b) => a - b)
  const rangos = []
  let inicio = ordenados[0]
  let anterior = ordenados[0]

  for (let i = 1; i <= ordenados.length; i++) {
    const actual = ordenados[i]
    if (actual === anterior + 1) {
      anterior = actual
      continue
    }
    rangos.push([inicio, anterior])
    inicio = actual
    anterior = actual
  }
  return rangos
}

function formatearHora(hora) {
  if (!hora) return ''
  return hora.slice(0, 5)  // 'HH:MM:SS' → 'HH:MM'
}

/**
 * Arma el texto de horario de un punto en el idioma activo a partir de los
 * campos estructurados (abierto_24h, dias_apertura, hora_apertura, hora_cierre).
 */
export function formatearHorario(t, punto) {
  if (!punto) return null
  if (punto.abierto_24h) return t('horario.24h')
  if (!punto.dias_apertura || punto.dias_apertura.length === 0) return null

  const textoDias = agruparRangos(punto.dias_apertura)
    .map(([desde, hasta]) => {
      const nombreDesde = t(`dias.${CLAVES_DIA[desde]}`)
      if (desde === hasta) return nombreDesde
      return t('horario.rangoDias', { desde: nombreDesde, hasta: t(`dias.${CLAVES_DIA[hasta]}`) })
    })
    .join(', ')

  if (!punto.hora_apertura || !punto.hora_cierre) return textoDias

  return t('horario.diasYHoras', {
    dias:  textoDias,
    desde: formatearHora(punto.hora_apertura),
    hasta: formatearHora(punto.hora_cierre),
  })
}

/** Días 1-7 (lunes a domingo) para armar selectores en el admin. */
export const DIAS_SEMANA = [1, 2, 3, 4, 5, 6, 7]

export function claveDia(dia) {
  return CLAVES_DIA[dia]
}
