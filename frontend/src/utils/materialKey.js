// Mapeo de IDs de materiales (de la DB) a claves de i18n.
// La DB sigue devolviendo el nombre en español (ej: "Plástico PET").
// En la capa de presentación traducimos usando este mapeo.

const MAPEO_ID_A_CLAVE = {
  1: 'plasticoPet',
  2: 'vidrio',
  3: 'papel',
  4: 'carton',
  5: 'metal',
  6: 'pilas',
  7: 'organico',
  8: 'electronicos',
}

export function claveMaterial(idOrObj) {
  if (idOrObj == null) return null
  const id = typeof idOrObj === 'object' ? Number(idOrObj.id) : Number(idOrObj)
  return MAPEO_ID_A_CLAVE[id] ?? null
}

// Devuelve el nombre del material traducido, con fallback al nombre del backend.
export function traducirMaterial(t, material) {
  if (!material) return ''
  const clave = claveMaterial(material)
  if (!clave) return material.nombre || ''
  return t(`materiales.${clave}`, { defaultValue: material.nombre || '' })
}

// Devuelve las instrucciones de manejo del material en el idioma activo.
export function traducirInstrucciones(t, materialId) {
  const clave = claveMaterial(materialId)
  if (!clave) return null
  const valor = t(`instrucciones.${clave}`, { defaultValue: '' })
  return valor || null
}

// ── Logros (achievements) ──────────────────────────────────────────────────

const MAPEO_ID_LOGRO_A_CLAVE = {
  1: 'primerPaso',
  2: 'ecoAprendiz',
  3: 'ecoWarrior',
  4: 'guardianPlaneta',
  5: 'explorador',
  6: 'recicladorMes',
}

export function claveLogro(logroIdOrObj) {
  if (logroIdOrObj == null) return null
  const id = typeof logroIdOrObj === 'object' ? Number(logroIdOrObj.id) : Number(logroIdOrObj)
  return MAPEO_ID_LOGRO_A_CLAVE[id] ?? null
}

// Devuelve { nombre, descripcion } traducidos, con fallback al texto del backend.
export function traducirLogro(t, logro) {
  if (!logro) return { nombre: '', descripcion: '' }
  const clave = claveLogro(logro)
  if (!clave) {
    return { nombre: logro.nombre || '', descripcion: logro.descripcion || '' }
  }
  return {
    nombre:      t(`logros.${clave}.nombre`,      { defaultValue: logro.nombre || '' }),
    descripcion: t(`logros.${clave}.descripcion`, { defaultValue: logro.descripcion || '' }),
  }
}
