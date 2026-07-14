import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, AlertCircle, ClipboardList, MapPin } from 'lucide-react'
import api from '../../services/api'
import { traducirMaterial } from '../../utils/materialKey'
import { colorContenedor, textoSobreColor } from '../../utils/colorContenedor'
import { urlBackend } from '../../utils/urlBackend'

export default function AdminCheckins() {
  const { t } = useTranslation()

  const [checkins, setCheckins]   = useState([])
  const [cargando, setCargando]   = useState(true)
  const [errorListar, setErrorListar] = useState(null)

  const [aBorrar, setABorrar]     = useState(null)
  const [borrando, setBorrando]   = useState(false)
  const [errorBorrar, setErrorBorrar] = useState(null)

  useEffect(() => { cargarCheckins() }, [])

  async function cargarCheckins() {
    setCargando(true)
    setErrorListar(null)
    try {
      const res = await api.get('/admin/checkins')
      setCheckins(res.data)
    } catch (err) {
      setErrorListar(err.response?.data?.error || t('admin.errorCargar'))
    } finally {
      setCargando(false)
    }
  }

  async function confirmarBorrado() {
    if (!aBorrar) return
    setBorrando(true)
    setErrorBorrar(null)
    try {
      await api.delete(`/admin/checkins/${aBorrar.id}`)
      setABorrar(null)
      await cargarCheckins()
    } catch (err) {
      setErrorBorrar(err.response?.data?.error || t('admin.errorBorrar'))
    } finally {
      setBorrando(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between gap-3 mb-5">
        <h2 className="font-display text-lg md:text-xl font-bold text-main">
          {t('admin.checkins')}
        </h2>
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
      ) : checkins.length === 0 ? (
        <div className="bg-surface border border-theme rounded-2xl p-10 text-center">
          <ClipboardList size={40} className="mx-auto mb-3 text-brand-600" strokeWidth={1.5} />
          <p className="font-display text-lg font-bold text-main mb-1">{t('admin.sinCheckins')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {checkins.map((c) => {
            const bg = colorContenedor(c.color_contenedor)
            const fg = textoSobreColor(c.color_contenedor)
            return (
              <div key={c.id} className="bg-surface border border-theme rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
                {c.foto_url ? (
                  <img
                    src={urlBackend(c.foto_url)}
                    alt=""
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-theme"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-surface-alt flex-shrink-0" />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-main text-sm truncate">{c.usuario_nombre}</p>
                    <span
                      className="inline-flex text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ backgroundColor: bg, color: fg }}
                    >
                      {traducirMaterial(t, { id: c.material_id, nombre: c.material_nombre })}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5 truncate flex items-center gap-1">
                    <MapPin size={11} className="flex-shrink-0" />
                    {c.punto_nombre}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {c.cantidad_estimada_kg} kg · +{c.puntos_ganados} pts · {new Date(c.creado_en).toLocaleString()}
                  </p>
                </div>

                <button
                  onClick={() => { setABorrar(c); setErrorBorrar(null) }}
                  title={t('admin.borrar')}
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-red-600 dark:text-red-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/20 dark:hover:text-red-300 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {aBorrar && (
        <>
          <div
            onClick={() => !borrando && setABorrar(null)}
            className="animate-fade-in"
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 14, 10, 0.65)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', zIndex: 1210 }}
          />
          <div
            onClick={() => !borrando && setABorrar(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 1211, overflowY: 'auto', padding: 'calc(56px + 16px) 12px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <div
              className="bg-surface animate-scale-in"
              style={{ borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '420px', boxShadow: 'var(--shadow-lg)', marginTop: 'auto', marginBottom: 'auto' }}
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
                <p className="text-sm text-soft leading-relaxed">
                  {t('admin.confirmarBorradoCheckinMensaje', { nombre: aBorrar.usuario_nombre, puntos: aBorrar.puntos_ganados })}
                </p>
                {errorBorrar && (
                  <div className="feedback-error flex items-start gap-2.5 px-4 py-3 mt-4 text-sm">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    {errorBorrar}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-theme bg-surface-alt rounded-b-[var(--radius-xl)]">
                <button
                  onClick={() => setABorrar(null)}
                  disabled={borrando}
                  className="px-4 py-2.5 rounded-xl border border-theme bg-surface text-soft hover:bg-surface-alt hover:text-main text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {t('admin.cancelar')}
                </button>
                <button
                  onClick={confirmarBorrado}
                  disabled={borrando}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-60 flex items-center gap-2"
                >
                  {borrando && (
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white inline-block" style={{ animation: 'rm-spin 0.8s linear infinite' }} />
                  )}
                  {borrando ? t('admin.borrando') : t('admin.borrar')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
