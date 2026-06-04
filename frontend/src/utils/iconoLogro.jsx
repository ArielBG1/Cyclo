import { Award, Sprout, Shield, Globe2, Map, Trophy, Star } from 'lucide-react'

const ICONOS_LOGRO = {
  1: Award,    // Primer paso
  2: Sprout,   // Eco-Aprendiz
  3: Shield,   // Eco-Warrior
  4: Globe2,   // Guardián del Planeta
  5: Map,      // Explorador
  6: Trophy,   // Reciclador del mes
}

export function IconoLogro({ logro, size = 24, className = '', ...props }) {
  if (!logro) return null
  const id = typeof logro === 'object' ? Number(logro.id) : Number(logro)
  const Icon = ICONOS_LOGRO[id] || Star
  return <Icon size={size} className={className} aria-hidden="true" {...props} />
}
