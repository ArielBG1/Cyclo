import {
  Recycle, Wine, Newspaper, Package, Wrench, Battery, Leaf, Smartphone, HelpCircle,
} from 'lucide-react'

// Mapeo id de material → componente lucide-react
const ICONOS = {
  1: Recycle,    // Plástico PET
  2: Wine,       // Vidrio
  3: Newspaper,  // Papel
  4: Package,    // Cartón
  5: Wrench,     // Metal
  6: Battery,    // Pilas y baterías
  7: Leaf,       // Orgánico
  8: Smartphone, // Electrónicos
}

// Recibe el material entero { id, ... } o un id, y renderiza el ícono lucide.
export function IconoMaterial({ material, size = 14, className = '', ...props }) {
  if (material == null) return null
  const id = typeof material === 'object' ? Number(material.id) : Number(material)
  const Icon = ICONOS[id] || HelpCircle
  return <Icon size={size} className={className} aria-hidden="true" {...props} />
}
