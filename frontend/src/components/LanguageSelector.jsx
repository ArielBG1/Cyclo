import { useState, useRef, useEffect } from 'react'
import { Languages, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const IDIOMAS = [
  { codigo: 'es', etiqueta: 'ES',     completo: 'Español' },
  { codigo: 'en', etiqueta: 'EN',     completo: 'English' },
  { codigo: 'ko', etiqueta: '한국어', completo: '한국어' },
]

export default function LanguageSelector({ variante = 'desktop' }) {
  const { i18n, t } = useTranslation()
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)

  // Cerrar al hacer click fuera (solo desktop)
  useEffect(() => {
    if (variante !== 'desktop') return
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [variante])

  const actual = i18n.resolvedLanguage || i18n.language || 'es'
  const baseActual = actual.split('-')[0]
  const idiomaActual = IDIOMAS.find((i) => i.codigo === baseActual) ?? IDIOMAS[0]

  function elegir(codigo) {
    i18n.changeLanguage(codigo)
    setAbierto(false)
  }

  // ── Variante móvil: 3 botones lado a lado dentro del menú hamburger ──
  if (variante === 'mobile-inline') {
    return (
      <div className="grid grid-cols-3 gap-1.5 pt-1">
        {IDIOMAS.map((idi) => {
          const activo = idi.codigo === baseActual
          return (
            <button
              key={idi.codigo}
              onClick={() => elegir(idi.codigo)}
              className={[
                'flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors',
                activo
                  ? 'bg-brand-500 text-white'
                  : 'bg-brand-800/50 text-brand-100 hover:bg-brand-700',
              ].join(' ')}
            >
              {activo && <Check size={13} />}
              {idi.etiqueta}
            </button>
          )
        })}
      </div>
    )
  }

  // ── Variante desktop: botón compacto con dropdown ──
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAbierto(!abierto)}
        aria-label={t('navbar.idiomaAria')}
        title={t('navbar.idiomaAria')}
        className={[
          'flex items-center gap-1.5 px-2.5 h-9 rounded-full',
          'text-brand-100 hover:text-white hover:bg-brand-800/60',
          'transition-all duration-200',
          'text-xs font-semibold uppercase tracking-wide',
          'focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:ring-offset-2 focus:ring-offset-brand-900',
        ].join(' ')}
      >
        <Languages size={16} />
        <span>{idiomaActual.etiqueta}</span>
      </button>

      {abierto && (
        <div className="absolute right-0 top-full mt-2 w-36 bg-surface rounded-xl shadow-xl border border-theme py-1 z-50 animate-scale-in">
          {IDIOMAS.map((idi) => {
            const activo = idi.codigo === baseActual
            return (
              <button
                key={idi.codigo}
                onClick={() => elegir(idi.codigo)}
                className={[
                  'w-full flex items-center justify-between gap-2 px-4 py-2 text-sm transition-colors',
                  activo
                    ? 'text-brand-600 font-semibold'
                    : 'text-soft hover:bg-surface-alt hover:text-main',
                ].join(' ')}
              >
                <span>{idi.completo}</span>
                {activo && <Check size={14} className="text-brand-600 flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
