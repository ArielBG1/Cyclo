import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, X, AlertCircle, Users, ShieldCheck, Shield, User as UserIcon } from 'lucide-react'
import api from '../../services/api'

function BadgeRol({ rol, t }) {
  if (rol === 'super_admin') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full feedback-success whitespace-nowrap">
        <ShieldCheck size={11} />
        {t('admin.rolSuperAdmin')}
      </span>
    )
  }
  if (rol === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full feedback-warning whitespace-nowrap">
        <Shield size={11} />
        {t('admin.rolAdmin')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-alt text-soft border border-theme whitespace-nowrap">
      <UserIcon size={11} />
      {t('admin.rolUser')}
    </span>
  )
}

export default function AdminUsuarios() {
  const { t } = useTranslation()

  const [usuarios, setUsuarios]   = useState([])
  const [cargando, setCargando]   = useState(true)
  const [errorListar, setErrorListar] = useState(null)

  const [editando, setEditando]   = useState(null)
  const [rolForm, setRolForm]     = useState('user')
  const [puntosForm, setPuntosForm] = useState('0')
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState(null)

  useEffect(() => { cargarUsuarios() }, [])

  async function cargarUsuarios() {
    setCargando(true)
    setErrorListar(null)
    try {
      const res = await api.get('/admin/usuarios')
      setUsuarios(res.data)
    } catch (err) {
      setErrorListar(err.response?.data?.error || t('admin.errorCargar'))
    } finally {
      setCargando(false)
    }
  }

  function abrirEditar(u) {
    setEditando(u)
    setRolForm(u.rol === 'super_admin' ? 'admin' : u.rol)
    setPuntosForm(String(u.puntos_totales))
    setErrorForm(null)
  }

  function cerrarForm() {
    if (guardando) return
    setEditando(null)
  }

  async function guardar() {
    setErrorForm(null)
    const puntos = parseInt(puntosForm)
    if (isNaN(puntos) || puntos < 0) {
      setErrorForm(t('admin.puntosInvalidos'))
      return
    }
    const payload = { puntos_totales: puntos }
    if (editando.rol !== 'super_admin') payload.rol = rolForm

    setGuardando(true)
    try {
      await api.put(`/admin/usuarios/${editando.id}`, payload)
      setEditando(null)
      await cargarUsuarios()
    } catch (err) {
      setErrorForm(err.response?.data?.error || t('admin.errorGuardar'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between gap-3 mb-5">
        <h2 className="font-display text-lg md:text-xl font-bold text-main">
          {t('admin.usuarios')}
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
      ) : usuarios.length === 0 ? (
        <div className="bg-surface border border-theme rounded-2xl p-10 text-center">
          <Users size={40} className="mx-auto mb-3 text-brand-600" strokeWidth={1.5} />
          <p className="font-display text-lg font-bold text-main mb-1">{t('admin.sinUsuarios')}</p>
        </div>
      ) : (
        <>
          {/* Desktop tabla */}
          <div className="hidden md:block bg-surface border border-theme rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt border-b border-theme">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider">{t('admin.tablaUsuario')}</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider">{t('admin.tablaRol')}</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider">{t('admin.tablaPuntos')}</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider">{t('admin.tablaNivel')}</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider whitespace-nowrap">{t('admin.tablaCheckins')}</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider">{t('admin.tablaAcciones')}</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-t border-theme hover:bg-surface-alt transition-colors">
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold text-main">{u.nombre}</p>
                      <p className="text-xs text-muted mt-0.5">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 align-top"><BadgeRol rol={u.rol} t={t} /></td>
                    <td className="px-4 py-3 align-top text-right font-semibold text-main">{u.puntos_totales}</td>
                    <td className="px-4 py-3 align-top text-soft">{u.nivel}</td>
                    <td className="px-4 py-3 align-top text-right font-semibold text-main">{u.cantidad_checkins}</td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex justify-end">
                        <button
                          onClick={() => abrirEditar(u)}
                          title={t('admin.editar')}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-600 hover:bg-surface-alt hover:text-brand-700 dark:hover:text-brand-400 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {usuarios.map((u) => (
              <div key={u.id} className="bg-surface border border-theme rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-main truncate">{u.nombre}</p>
                    <p className="text-xs text-muted mt-0.5 truncate">{u.email}</p>
                  </div>
                  <BadgeRol rol={u.rol} t={t} />
                </div>
                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-theme">
                  <span className="text-xs text-muted">
                    <span className="font-bold text-main">{u.puntos_totales}</span> pts · {u.nivel}
                  </span>
                  <button
                    onClick={() => abrirEditar(u)}
                    title={t('admin.editar')}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-600 hover:bg-surface-alt transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {editando && (
        <>
          <div
            onClick={cerrarForm}
            className="animate-fade-in"
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 14, 10, 0.65)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', zIndex: 1200 }}
          />
          <div
            onClick={cerrarForm}
            style={{ position: 'fixed', inset: 0, zIndex: 1201, overflowY: 'auto', padding: 'calc(56px + 16px) 12px 24px', WebkitOverflowScrolling: 'touch' }}
          >
            <div
              className="bg-surface animate-scale-in mx-auto"
              style={{ borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '420px', boxShadow: 'var(--shadow-lg)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-theme">
                <h2 className="font-display text-lg font-bold text-main">{t('admin.editarUsuario')}</h2>
                <button
                  onClick={cerrarForm}
                  disabled={guardando}
                  className="w-9 h-9 rounded-full border border-theme bg-surface-alt text-soft hover:text-main hover:bg-surface flex items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={t('admin.cancelar')}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-5 py-5 space-y-4">
                <div>
                  <p className="font-semibold text-main">{editando.nombre}</p>
                  <p className="text-xs text-muted">{editando.email}</p>
                </div>

                {editando.rol === 'super_admin' ? (
                  <div className="text-sm text-muted">{t('admin.rolSuperAdminAyuda')}</div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-main mb-1.5">{t('admin.tablaRol')}</label>
                    <select
                      value={rolForm}
                      onChange={(e) => setRolForm(e.target.value)}
                      className="w-full border border-theme bg-surface text-main rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="user">{t('admin.rolUser')}</option>
                      <option value="admin">{t('admin.rolAdmin')}</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-main mb-1.5">{t('admin.tablaPuntos')}</label>
                  <input
                    type="number"
                    min="0"
                    value={puntosForm}
                    onChange={(e) => setPuntosForm(e.target.value)}
                    className="w-full border border-theme bg-surface text-main rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                {errorForm && (
                  <div className="feedback-error flex items-start gap-2.5 px-4 py-3 text-sm">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    {errorForm}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-theme bg-surface-alt rounded-b-[var(--radius-xl)]">
                <button
                  onClick={cerrarForm}
                  disabled={guardando}
                  className="px-4 py-2.5 rounded-xl border border-theme bg-surface text-soft hover:bg-surface-alt hover:text-main text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {t('admin.cancelar')}
                </button>
                <button
                  onClick={guardar}
                  disabled={guardando}
                  className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-sm font-bold shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-60 flex items-center gap-2"
                >
                  {guardando && (
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white inline-block" style={{ animation: 'rm-spin 0.8s linear infinite' }} />
                  )}
                  {guardando ? t('admin.guardando') : t('admin.guardar')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
