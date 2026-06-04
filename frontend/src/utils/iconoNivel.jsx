import { Sprout, Leaf, Recycle, TreePine, Shield, Globe2, Crown, Award } from 'lucide-react'

// Mapea el nombre del nivel (devuelto por el backend) al ícono lucide correspondiente.
const ICONOS = {
  'Principiante':           Sprout,
  'Aprendiz':               Leaf,
  'Reciclador':             Recycle,
  'Eco-Activista':          TreePine,
  'Eco-Warrior':            Shield,
  'Guardián del Planeta':   Globe2,
  'Maestro del Reciclaje':  Crown,
}

export function IconoNivel({ nivel, size = 18, className = '', ...props }) {
  const Icon = ICONOS[nivel] || Award
  return <Icon size={size} className={className} aria-hidden="true" {...props} />
}
