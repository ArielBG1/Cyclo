export const NIVELES = [
  { nombre: 'Principiante',       min: 0    },
  { nombre: 'Aprendiz',           min: 50   },
  { nombre: 'Reciclador',         min: 200  },
  { nombre: 'Eco-Activista',      min: 500  },
  { nombre: 'Eco-Warrior',        min: 1000 },
  { nombre: 'Guardián del Planeta', min: 2000 },
  { nombre: 'Maestro del Reciclaje', min: 5000 },
]

export function calcularNivel(puntos) {
  let nivel = NIVELES[0].nombre
  for (const n of NIVELES) {
    if (puntos >= n.min) nivel = n.nombre
  }
  return nivel
}
