import { useState, useRef, useEffect } from 'react'
import { Filter, X, LocateFixed } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { traducirMaterial } from '../utils/materialKey'
import { colorContenedor } from '../utils/colorContenedor'
import { IconoMaterial } from '../utils/iconoMaterial'

function ContenidoFiltros({
  t,
  checkboxRef,
  materiales,
  filtrosMateriales,
  todosSeleccionados,
  onToggleTodos,
  onToggleMaterial,
  onLimpiarFiltros,
  onLocalizarUsuario,
  puntosMostrados,
  puntosTotales,
}) {
  return (
    <div className="text-sm">
      {/* Botón Mi ubicación */}
      <button
        onClick={onLocalizarUsuario}
        className="w-full flex items-center gap-2.5 bg-brand-500 hover:bg-brand-400 text-white font-semibold px-3 py-2.5 rounded-xl transition-all duration-200 shadow-sm"
      >
        <LocateFixed size={15} />
        {t('mapa.miUbicacion')}
      </button>

      {/* Filtros por material */}
      <div className="border-t border-theme mt-3 pt-3">
        <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">
          {t('mapa.materialAceptado')}
        </p>
        {materiales.length === 0 ? (
          <p className="text-xs text-muted italic px-1">{t('mapa.sinMateriales')}</p>
        ) : (
          <div className="space-y-0.5">
            <label className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-xl bg-surface-alt border border-theme mb-1.5 select-none">
              <input
                ref={checkboxRef}
                type="checkbox"
                checked={todosSeleccionados}
                onChange={onToggleTodos}
                className="rounded accent-brand-500 cursor-pointer"
              />
              <span className="text-soft text-xs font-bold">
                {todosSeleccionados ? t('mapa.deseleccionarTodos') : t('mapa.seleccionarTodos')}
              </span>
            </label>
            {materiales.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-xl hover:bg-surface-alt select-none transition-colors"
              >
                <input
                  type="checkbox"
                  checked={filtrosMateriales.includes(Number(m.id))}
                  onChange={() => onToggleMaterial(m.id)}
                  className="rounded accent-brand-500 cursor-pointer"
                />
                <IconoMaterial
                  material={m}
                  size={12}
                  style={{ color: colorContenedor(m.color_contenedor), flexShrink: 0 }}
                />
                <span className="text-soft text-xs truncate">
                  {traducirMaterial(t, m)}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Limpiar filtros */}
      {filtrosMateriales.length > 0 && (
        <button
          onClick={onLimpiarFiltros}
          className="mt-2 w-full text-xs font-medium text-brand-600 hover:text-brand-700 hover:bg-surface-alt px-2 py-1.5 rounded-xl transition-colors"
        >
          {t('mapa.limpiarFiltros')}
        </button>
      )}

      {/* Contador */}
      <div className="mt-3 pt-2.5 border-t border-theme text-xs text-muted text-center">
        {t('mapa.mostrandoPuntos', { visibles: puntosMostrados, total: puntosTotales })}
      </div>
    </div>
  )
}

export default function MapaControles({
  materiales,
  filtrosMateriales,
  onCambiarFiltros,
  onLocalizarUsuario,
  puntosMostrados,
  puntosTotales,
}) {
  const { t } = useTranslation()
  const [abierto, setAbierto] = useState(() => window.innerWidth >= 768)

  const todosRefDesktop = useRef(null)
  const todosRefMobile = useRef(null)

  const todosSeleccionados =
    materiales.length > 0 && filtrosMateriales.length === materiales.length
  const algunosSeleccionados =
    filtrosMateriales.length > 0 && filtrosMateriales.length < materiales.length

  useEffect(() => {
    if (todosRefDesktop.current) todosRefDesktop.current.indeterminate = algunosSeleccionados
    if (todosRefMobile.current) todosRefMobile.current.indeterminate = algunosSeleccionados
  }, [algunosSeleccionados])

  function toggleTodos() {
    if (todosSeleccionados) onCambiarFiltros([])
    else onCambiarFiltros(materiales.map((m) => Number(m.id)))
  }

  function toggleMaterial(id) {
    const idNum = Number(id)
    if (filtrosMateriales.includes(idNum)) {
      onCambiarFiltros(filtrosMateriales.filter((m) => m !== idNum))
    } else {
      onCambiarFiltros([...filtrosMateriales, idNum])
    }
  }

  const contenidoProps = {
    t,
    materiales,
    filtrosMateriales,
    todosSeleccionados,
    onToggleTodos: toggleTodos,
    onToggleMaterial: toggleMaterial,
    onLimpiarFiltros: () => onCambiarFiltros([]),
    onLocalizarUsuario,
    puntosMostrados,
    puntosTotales,
  }

  return (
    <>
      {/* ════════════════════════════════════
          MÓVIL — FAB + Bottom Sheet
          z-[699] backdrop / z-[700] sheet+FAB
          ════════════════════════════════════ */}

      {/* Backdrop oscuro — cierra el sheet al tocar fuera */}
      <div
        className={`md:hidden fixed inset-0 bg-black/40 z-[699] transition-opacity duration-300 ${
          abierto ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setAbierto(false)}
      />

      {/* FAB — Floating Action Button */}
      <button
        className="md:hidden fixed bottom-20 right-4 z-[700] w-14 h-14 bg-brand-500 hover:bg-brand-400 active:scale-95 hover:scale-105 text-white rounded-full flex items-center justify-center transition-all duration-200"
        style={{ boxShadow: 'var(--shadow-brand-glow)' }}
        onClick={() => setAbierto(!abierto)}
        aria-label={t('mapa.abrirFiltrosAria')}
      >
        <Filter size={22} />
        {filtrosMateriales.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-brand-900 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold leading-none ring-2 ring-white">
            {filtrosMateriales.length}
          </span>
        )}
      </button>

      {/* Bottom Sheet */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 z-[700] bg-surface rounded-t-2xl shadow-2xl border-t border-theme transition-transform duration-300 ease-out ${
          abierto ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Handle drag visual */}
        <div className="flex justify-center pt-3 pb-0">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--color-border)' }} />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-theme">
          <h2 className="font-display font-bold text-main text-base">{t('mapa.filtros')}</h2>
          <button
            onClick={() => setAbierto(false)}
            className="p-1.5 hover:bg-surface-alt rounded-lg transition-colors"
            aria-label={t('mapa.cerrarFiltrosAria')}
          >
            <X size={18} className="text-muted" />
          </button>
        </div>
        {/* Contenido scrolleable */}
        <div className="overflow-y-auto max-h-[60vh] px-4 py-3">
          <ContenidoFiltros {...contenidoProps} checkboxRef={todosRefMobile} />
        </div>
      </div>

      {/* ════════════════════════════════════
          DESKTOP — Panel lateral
          z-[700], absolute dentro del mapa
          ════════════════════════════════════ */}
      <div
        className="hidden md:block absolute top-3 right-3 z-[700]"
        style={{ maxWidth: '248px', minWidth: '188px' }}
      >
        {/* Botón toggle */}
        <button
          onClick={() => setAbierto(!abierto)}
          className="w-full flex items-center justify-between gap-2 bg-surface-80 backdrop-blur-md border border-theme rounded-2xl shadow-lg hover:shadow-xl hover:bg-surface-95 px-3.5 py-2.5 text-sm font-semibold text-soft transition-all duration-200"
        >
          <span className="flex items-center gap-2">
            <Filter size={14} className="text-brand-600" />
            <span className="font-display">{t('mapa.filtros')}</span>
            {filtrosMateriales.length > 0 && (
              <span className="bg-brand-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none font-bold">
                {filtrosMateriales.length}
              </span>
            )}
          </span>
          <X
            size={13}
            className="text-muted transition-transform duration-200 flex-shrink-0"
            style={{ transform: abierto ? 'rotate(0deg)' : 'rotate(45deg)' }}
          />
        </button>

        {/* Panel desplegable */}
        {abierto && (
          <div className="mt-1.5 bg-surface-85 backdrop-blur-md border border-theme rounded-2xl shadow-xl p-3.5 animate-scale-in">
            <ContenidoFiltros {...contenidoProps} checkboxRef={todosRefDesktop} />
          </div>
        )}
      </div>
    </>
  )
}
