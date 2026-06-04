import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, AlertCircle, CheckCircle2, XCircle, X, MapPin } from 'lucide-react'
import api from '../../services/api'
import { traducirMaterial } from '../../utils/materialKey'
import { colorContenedor, textoSobreColor } from '../../utils/colorContenedor'
import { IconoMaterial } from '../../utils/iconoMaterial'
import MiniMapaSelector from './MiniMapaSelector'

const FORM_VACIO = {
  nombre: '',
  descripcion: '',
  direccion: '',
  horario: '',
  latitud: '',
  longitud: '',
  materiales: [],
  verificado: true,
}

export default function AdminPuntos() {
  const { t } = useTranslation()

  const [puntos, setPuntos]                       = useState([])
  const [materialesDisponibles, setMateriales]    = useState([])
  const [cargando, setCargando]                   = useState(true)
  const [errorListar, setErrorListar]             = useState(null)

  // Modal form
  const [modalAbierto, setModalAbierto]           = useState(false)
  const [puntoEditando, setPuntoEditando]         = useState(null)
  const [form, setForm]                           = useState(FORM_VACIO)
  const [guardando, setGuardando]                 = useState(false)
  const [errorForm, setErrorForm]                 = useState(null)

  // Modal confirmar borrado
  const [puntoABorrar, setPuntoABorrar]           = useState(null)
  const [borrando, setBorrando]                   = useState(false)
  const [errorBorrar, setErrorBorrarMsg]          = useState(null)

  useEffect(() => { cargarPuntos() }, [])
  useEffect(() => {
    api.get('/materiales').then((r) => setMateriales(r.data)).catch(() => {})
  }, [])

  async function cargarPuntos() {
    setCargando(true)
    setErrorListar(null)
    try {
      const res = await api.get('/admin/puntos')
      setPuntos(res.data)
    } catch (err) {
      setErrorListar(err.response?.data?.error || t('admin.errorCargar'))
    } finally {
      setCargando(false)
    }
  }

  function abrirNuevo() {
    setPuntoEditando(null)
    setForm(FORM_VACIO)
    setErrorForm(null)
    setModalAbierto(true)
  }

  function abrirEditar(p) {
    setPuntoEditando(p)
    setForm({
      nombre:      p.nombre || '',
      descripcion: p.descripcion || '',
      direccion:   p.direccion || '',
      horario:     p.horario || '',
      latitud:     p.latitud != null ? String(p.latitud) : '',
      longitud:    p.longitud != null ? String(p.longitud) : '',
      materiales:  (p.materiales || []).map((m) => Number(m.id)),
      verificado:  !!p.verificado,
    })
    setErrorForm(null)
    setModalAbierto(true)
  }

  function cerrarForm() {
    if (guardando) return
    setModalAbierto(false)
  }

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function toggleMaterial(matId) {
    setForm((prev) => {
      const id = Number(matId)
      const seleccionado = prev.materiales.includes(id)
      return {
        ...prev,
        materiales: seleccionado
          ? prev.materiales.filter((m) => m !== id)
          : [...prev.materiales, id],
      }
    })
  }

  function setUbicacionDesdeMapa(lat, lng) {
    setForm((prev) => ({ ...prev, latitud: lat.toFixed(7), longitud: lng.toFixed(7) }))
  }

  async function guardar() {
    setErrorForm(null)
    if (!form.nombre.trim() || !form.latitud || !form.longitud) {
      setErrorForm(t('admin.faltaNombreUbicacion'))
      return
    }
    const payload = {
      nombre:      form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      direccion:   form.direccion.trim() || null,
      horario:     form.horario.trim() || null,
      latitud:     parseFloat(form.latitud),
      longitud:    parseFloat(form.longitud),
      materiales:  form.materiales,
      verificado:  !!form.verificado,
    }
    setGuardando(true)
    try {
      if (puntoEditando) {
        await api.put(`/admin/puntos/${puntoEditando.id}`, payload)
      } else {
        await api.post('/admin/puntos', payload)
      }
      setModalAbierto(false)
      await cargarPuntos()
    } catch (err) {
      setErrorForm(err.response?.data?.error || t('admin.errorGuardar'))
    } finally {
      setGuardando(false)
    }
  }

  function pedirConfirmacionBorrado(p) {
    setPuntoABorrar(p)
    setErrorBorrarMsg(null)
  }
  function cancelarBorrado() {
    if (borrando) return
    setPuntoABorrar(null)
  }
  async function confirmarBorrado() {
    if (!puntoABorrar) return
    setBorrando(true)
    setErrorBorrarMsg(null)
    try {
      await api.delete(`/admin/puntos/${puntoABorrar.id}`)
      setPuntoABorrar(null)
      await cargarPuntos()
    } catch (err) {
      setErrorBorrarMsg(err.response?.data?.error || t('admin.errorBorrar'))
    } finally {
      setBorrando(false)
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <h2 className="font-display text-lg md:text-xl font-bold text-main">
          {t('admin.puntos')}
        </h2>
        <button
          onClick={abrirNuevo}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">{t('admin.agregarPunto')}</span>
        </button>
      </div>

      {errorListar && (
        <div className="feedback-error flex items-start gap-2.5 px-4 py-3 mb-5 text-sm">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          {errorListar}
        </div>
      )}

      {cargando ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="rm-double-spinner" />
          <p className="text-muted text-sm mt-4">{t('admin.cargando')}</p>
        </div>
      ) : puntos.length === 0 ? (
        <div className="bg-surface border border-theme rounded-2xl p-10 text-center">
          <MapPin size={40} className="mx-auto mb-3 text-brand-600" strokeWidth={1.5} />
          <p className="font-display text-lg font-bold text-main mb-1">{t('admin.sinPuntos')}</p>
          <p className="text-sm text-muted">{t('admin.sinPuntosDescripcion')}</p>
        </div>
      ) : (
        <>
          {/* Desktop tabla */}
          <div className="hidden md:block bg-surface border border-theme rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt border-b border-theme">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider">{t('admin.tablaNombre')}</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider">{t('admin.tablaDireccion')}</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider">{t('admin.tablaMateriales')}</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider">{t('admin.tablaEstado')}</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider whitespace-nowrap">{t('admin.tablaCheckins')}</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider">{t('admin.tablaAcciones')}</th>
                </tr>
              </thead>
              <tbody>
                {puntos.map((p) => (
                  <tr key={p.id} className="border-t border-theme hover:bg-surface-alt transition-colors">
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold text-main">{p.nombre}</p>
                      {p.horario && <p className="text-xs text-muted mt-0.5">{p.horario}</p>}
                    </td>
                    <td className="px-4 py-3 align-top text-soft">
                      {p.direccion || <span className="italic text-muted">{t('admin.sinDireccion')}</span>}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <ChipsMateriales materiales={p.materiales} t={t} />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <BadgeEstado verificado={p.verificado} t={t} />
                    </td>
                    <td className="px-4 py-3 align-top text-right font-semibold text-main">
                      {p.cantidad_checkins}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex justify-end gap-1.5">
                        <BotonIcono onClick={() => abrirEditar(p)} title={t('admin.editar')} variante="editar">
                          <Pencil size={14} />
                        </BotonIcono>
                        <BotonIcono onClick={() => pedirConfirmacionBorrado(p)} title={t('admin.borrar')} variante="borrar">
                          <Trash2 size={14} />
                        </BotonIcono>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {puntos.map((p) => (
              <div key={p.id} className="bg-surface border border-theme rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-main truncate">{p.nombre}</p>
                    {p.direccion && <p className="text-xs text-muted mt-0.5">{p.direccion}</p>}
                  </div>
                  <BadgeEstado verificado={p.verificado} t={t} />
                </div>
                <ChipsMateriales materiales={p.materiales} t={t} />
                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-theme">
                  <span className="text-xs text-muted">
                    <span className="font-bold text-main">{p.cantidad_checkins}</span>{' '}
                    {t('admin.tablaCheckins').toLowerCase()}
                  </span>
                  <div className="flex gap-1.5">
                    <BotonIcono onClick={() => abrirEditar(p)} title={t('admin.editar')} variante="editar">
                      <Pencil size={14} />
                    </BotonIcono>
                    <BotonIcono onClick={() => pedirConfirmacionBorrado(p)} title={t('admin.borrar')} variante="borrar">
                      <Trash2 size={14} />
                    </BotonIcono>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {modalAbierto && (
        <PuntoFormModal
          t={t}
          edicion={!!puntoEditando}
          form={form}
          materialesDisponibles={materialesDisponibles}
          guardando={guardando}
          errorForm={errorForm}
          onCambioCampo={actualizarCampo}
          onToggleMaterial={toggleMaterial}
          onUbicacionMapa={setUbicacionDesdeMapa}
          onGuardar={guardar}
          onCerrar={cerrarForm}
        />
      )}

      {puntoABorrar && (
        <ConfirmarBorradoModal
          t={t}
          punto={puntoABorrar}
          borrando={borrando}
          error={errorBorrar}
          onCancelar={cancelarBorrado}
          onConfirmar={confirmarBorrado}
        />
      )}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// Subcomponentes
// ───────────────────────────────────────────────────────────────────────────

function ChipsMateriales({ materiales, t }) {
  if (!materiales || materiales.length === 0) {
    return <span className="text-xs italic text-muted">{t('admin.sinMateriales')}</span>
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {materiales.map((m) => {
        const bg = colorContenedor(m.color_contenedor)
        const fg = textoSobreColor(m.color_contenedor)
        return (
          <span
            key={m.id}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap"
            style={{ backgroundColor: bg, color: fg }}
          >
            <IconoMaterial material={m} size={11} />
            {traducirMaterial(t, m)}
          </span>
        )
      })}
    </div>
  )
}

function BadgeEstado({ verificado, t }) {
  if (verificado) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full feedback-success whitespace-nowrap">
        <CheckCircle2 size={11} />
        {t('admin.estadoVerificado')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full feedback-warning whitespace-nowrap">
      <XCircle size={11} />
      {t('admin.estadoNoVerificado')}
    </span>
  )
}

function BotonIcono({ children, onClick, title, variante = 'editar' }) {
  const colorClases = variante === 'borrar'
    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/20 dark:hover:text-red-300'
    : 'text-brand-600 hover:bg-surface-alt hover:text-brand-700 dark:hover:text-brand-400'
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${colorClases}`}
    >
      {children}
    </button>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// Form modal (crear / editar)
// ───────────────────────────────────────────────────────────────────────────

function PuntoFormModal({
  t, edicion, form, materialesDisponibles, guardando, errorForm,
  onCambioCampo, onToggleMaterial, onUbicacionMapa, onGuardar, onCerrar,
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCerrar}
        className="animate-fade-in"
        style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0, 14, 10, 0.65)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          zIndex: 1200,
        }}
      />

      {/* Wrapper scrolleable, deja gap del navbar arriba */}
      <div
        onClick={onCerrar}
        style={{
          position: 'fixed', inset: 0,
          zIndex: 1201,
          overflowY: 'auto',
          padding: 'calc(56px + 16px) 12px 24px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div
          className="bg-surface animate-scale-in mx-auto"
          style={{
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: '640px',
            boxShadow: 'var(--shadow-lg)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-theme">
            <h2 className="font-display text-lg font-bold text-main">
              {edicion ? t('admin.editarPunto') : t('admin.nuevoPunto')}
            </h2>
            <button
              onClick={onCerrar}
              disabled={guardando}
              className="w-9 h-9 rounded-full border border-theme bg-surface-alt text-soft hover:text-main hover:bg-surface flex items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={t('admin.cancelar')}
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-5 space-y-5">
            {/* Nombre */}
            <FormCampo label={t('admin.nombre')} requerido>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => onCambioCampo('nombre', e.target.value)}
                placeholder={t('admin.nombrePlaceholder')}
                className="w-full border border-theme bg-surface text-main placeholder-muted rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200"
              />
            </FormCampo>

            {/* Descripción */}
            <FormCampo label={t('admin.descripcion')}>
              <textarea
                value={form.descripcion}
                onChange={(e) => onCambioCampo('descripcion', e.target.value)}
                placeholder={t('admin.descripcionPlaceholder')}
                rows={2}
                className="w-full border border-theme bg-surface text-main placeholder-muted rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200 resize-none"
              />
            </FormCampo>

            {/* Dirección + Horario */}
            <div className="grid sm:grid-cols-2 gap-4">
              <FormCampo label={t('admin.direccion')}>
                <input
                  type="text"
                  value={form.direccion}
                  onChange={(e) => onCambioCampo('direccion', e.target.value)}
                  placeholder={t('admin.direccionPlaceholder')}
                  className="w-full border border-theme bg-surface text-main placeholder-muted rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200"
                />
              </FormCampo>
              <FormCampo label={t('admin.horario')}>
                <input
                  type="text"
                  value={form.horario}
                  onChange={(e) => onCambioCampo('horario', e.target.value)}
                  placeholder={t('admin.horarioPlaceholder')}
                  className="w-full border border-theme bg-surface text-main placeholder-muted rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200"
                />
              </FormCampo>
            </div>

            {/* Ubicación */}
            <FormCampo label={t('admin.ubicacion')} requerido>
              <p className="text-xs text-muted mb-2">{t('admin.clickEnMapa')}</p>
              <MiniMapaSelector
                lat={form.latitud}
                lng={form.longitud}
                onCambio={onUbicacionMapa}
              />
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">{t('admin.latitud')}</label>
                  <input
                    type="number"
                    step="any"
                    value={form.latitud}
                    onChange={(e) => onCambioCampo('latitud', e.target.value)}
                    className="w-full border border-theme bg-surface text-main rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">{t('admin.longitud')}</label>
                  <input
                    type="number"
                    step="any"
                    value={form.longitud}
                    onChange={(e) => onCambioCampo('longitud', e.target.value)}
                    className="w-full border border-theme bg-surface text-main rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
            </FormCampo>

            {/* Materiales — checkboxes */}
            <FormCampo label={t('admin.materialesAcepta')}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {materialesDisponibles.map((m) => {
                  const id  = Number(m.id)
                  const sel = form.materiales.includes(id)
                  const color = colorContenedor(m.color_contenedor)
                  return (
                    <label
                      key={m.id}
                      className={[
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all duration-150 select-none',
                        sel
                          ? 'border-brand-500 bg-surface-alt'
                          : 'border-theme bg-surface hover:bg-surface-alt',
                      ].join(' ')}
                    >
                      <input
                        type="checkbox"
                        checked={sel}
                        onChange={() => onToggleMaterial(id)}
                        className="w-4 h-4 rounded accent-brand-500 cursor-pointer flex-shrink-0"
                      />
                      <IconoMaterial material={m} size={15} style={{ color, flexShrink: 0 }} />
                      <span className="text-sm font-medium text-main truncate">
                        {traducirMaterial(t, m)}
                      </span>
                    </label>
                  )
                })}
              </div>
            </FormCampo>

            {/* Verificado */}
            <label className="flex items-start gap-3 cursor-pointer select-none p-3 rounded-xl border border-theme bg-surface-alt/50 hover:bg-surface-alt transition-colors">
              <input
                type="checkbox"
                checked={form.verificado}
                onChange={(e) => onCambioCampo('verificado', e.target.checked)}
                className="mt-0.5 rounded accent-brand-500 cursor-pointer w-4 h-4 flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-main">{t('admin.verificado')}</p>
                <p className="text-xs text-muted mt-0.5">{t('admin.verificadoAyuda')}</p>
              </div>
            </label>

            {errorForm && (
              <div className="feedback-error flex items-start gap-2.5 px-4 py-3 text-sm">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                {errorForm}
              </div>
            )}
          </div>

          {/* Footer sticky-ish */}
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-theme bg-surface-alt rounded-b-[var(--radius-xl)]">
            <button
              onClick={onCerrar}
              disabled={guardando}
              className="px-4 py-2.5 rounded-xl border border-theme bg-surface text-soft hover:bg-surface-alt hover:text-main text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {t('admin.cancelar')}
            </button>
            <button
              onClick={onGuardar}
              disabled={guardando}
              className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-sm font-bold shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-60 flex items-center gap-2"
            >
              {guardando && (
                <span
                  className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white inline-block"
                  style={{ animation: 'rm-spin 0.8s linear infinite' }}
                />
              )}
              {guardando ? t('admin.guardando') : t('admin.guardar')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function FormCampo({ label, requerido, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-main mb-1.5">
        {label}
        {requerido && <span className="text-brand-600 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// Confirmar borrado
// ───────────────────────────────────────────────────────────────────────────

function ConfirmarBorradoModal({ t, punto, borrando, error, onCancelar, onConfirmar }) {
  const tieneCheckins = punto.cantidad_checkins > 0
  const mensaje = tieneCheckins
    ? t('admin.confirmarBorradoConCheckins', { nombre: punto.nombre, count: punto.cantidad_checkins })
    : t('admin.confirmarBorradoSinCheckins', { nombre: punto.nombre })

  return (
    <>
      <div
        onClick={onCancelar}
        className="animate-fade-in"
        style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0, 14, 10, 0.65)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          zIndex: 1210,
        }}
      />
      <div
        onClick={onCancelar}
        style={{
          position: 'fixed', inset: 0,
          zIndex: 1211,
          overflowY: 'auto',
          padding: 'calc(56px + 16px) 12px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          className="bg-surface animate-scale-in"
          style={{
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: '420px',
            boxShadow: 'var(--shadow-lg)',
            marginTop: 'auto',
            marginBottom: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 py-5">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(239,68,68,0.14)', color: '#DC2626' }}
              >
                <Trash2 size={18} />
              </div>
              <h3 className="font-display text-lg font-bold text-main">{t('admin.confirmarBorradoTitulo')}</h3>
            </div>
            <p className="text-sm text-soft leading-relaxed">{mensaje}</p>
            {error && (
              <div className="feedback-error flex items-start gap-2.5 px-4 py-3 mt-4 text-sm">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-theme bg-surface-alt rounded-b-[var(--radius-xl)]">
            <button
              onClick={onCancelar}
              disabled={borrando}
              className="px-4 py-2.5 rounded-xl border border-theme bg-surface text-soft hover:bg-surface-alt hover:text-main text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {t('admin.cancelar')}
            </button>
            <button
              onClick={onConfirmar}
              disabled={borrando}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-60 flex items-center gap-2"
            >
              {borrando && (
                <span
                  className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white inline-block"
                  style={{ animation: 'rm-spin 0.8s linear infinite' }}
                />
              )}
              {borrando ? t('admin.borrando') : t('admin.borrar')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
