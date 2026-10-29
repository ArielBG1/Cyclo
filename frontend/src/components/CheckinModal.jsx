import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Camera, Check, AlertCircle, X, Trophy, PartyPopper } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { detectarMaterial } from '../utils/mapeoMateriales'
import { cargarModelo, cargarImagen, redimensionarParaIA, detectarObjetos } from '../utils/cycloScan'
import { traducirMaterial, claveMaterial, traducirLogro } from '../utils/materialKey'
import { colorContenedor, textoSobreColor } from '../utils/colorContenedor'
import { IconoMaterial } from '../utils/iconoMaterial'
import { IconoLogro } from '../utils/iconoLogro'
import api from '../services/api'
import CameraCapture from './CameraCapture'

const CANTIDADES = [
  { valor: 0.2, claveLabel: 'checkin.poco'   },
  { valor: 0.5, claveLabel: 'checkin.normal' },
  { valor: 1.5, claveLabel: 'checkin.mucho'  },
]

export default function CheckinModal({ isOpen, onClose, punto, onSuccess }) {
  const { usuario, refrescarUsuario } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [materialSeleccionado, setMaterialSeleccionado] = useState(null)
  const [cantidadKg,           setCantidadKg]           = useState(null)
  const [fotoBase64,           setFotoBase64]           = useState(null)
  const [modoCamera,           setModoCamera]           = useState(null)  // 'ia' | 'foto' | null
  const [procesando,           setProcesando]           = useState(false)
  const [exito,                setExito]                = useState(null)
  const [errorMsg,             setErrorMsg]             = useState(null)
  const [toastMsg,             setToastMsg]             = useState(null)
  const [cargandoModelo,       setCargandoModelo]       = useState(false)
  const [analizandoIA,         setAnalizandoIA]         = useState(false)

  // Redirigir si no hay sesión (defensivo)
  useEffect(() => {
    if (isOpen && !usuario) navigate('/login')
  }, [isOpen, usuario, navigate])

  if (!isOpen || !punto) return null
  if (!usuario) return null

  // ── helpers ──────────────────────────────────────────────────

  function mostrarToast(msg, tipo = 'warning') {
    setToastMsg({ msg, tipo })
    setTimeout(() => setToastMsg(null), 4500)
  }

  // Carga CycloScan (COCO-SSD) antes de abrir la cámara. Si el usuario ya
  // pasó por /escanear el modelo está en memoria y esto es instantáneo.
  async function abrirCamaraIA() {
    setCargandoModelo(true)
    try {
      await cargarModelo()
      setModoCamera('ia')
    } catch (err) {
      console.error('Error al cargar CycloScan:', err)
      mostrarToast(t('checkin.toastErrorProcesar'))
    } finally {
      setCargandoModelo(false)
    }
  }

  async function handleCapturaIA(base64) {
    setModoCamera(null)
    setAnalizandoIA(true)
    try {
      const modelo      = await cargarModelo()
      const img         = await cargarImagen(base64)
      const canvas      = redimensionarParaIA(img, img.width, img.height)
      const detecciones = await detectarObjetos(modelo, canvas)
      const match       = detectarMaterial(detecciones)

      if (!match) {
        mostrarToast(t('checkin.toastNoIdentificado'))
        return
      }

      // Nombre del material detectado en el idioma actual
      const claveMat = claveMaterial(match.materialId)
      const nombreDetectado = claveMat
        ? t(`materiales.${claveMat}`, { defaultValue: match.nombreMaterial })
        : match.nombreMaterial

      const materialEnPunto = punto.materiales.find((m) => Number(m.id) === match.materialId)
      if (!materialEnPunto) {
        const aceptados = punto.materiales.map((m) => traducirMaterial(t, m)).join(', ')
        mostrarToast(t('checkin.toastNoAcepta', { material: nombreDetectado, lista: aceptados }))
        return
      }

      setMaterialSeleccionado(Number(materialEnPunto.id))
      mostrarToast(t('checkin.toastDetectamos', { material: nombreDetectado }), 'success')
    } catch (err) {
      console.error('Error al detectar material:', err)
      mostrarToast(t('checkin.toastErrorProcesar'))
    } finally {
      setAnalizandoIA(false)
    }
  }

  function handleCapturaFoto(base64) {
    setFotoBase64(base64)
    setModoCamera(null)
  }

  async function confirmar() {
    setErrorMsg(null)
    setProcesando(true)

    let pos
    try {
      pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      )
    } catch (geoErr) {
      setErrorMsg(
        geoErr.code === 1
          ? t('checkin.errorPermisoUbicacion')
          : t('checkin.errorUbicacion')
      )
      setProcesando(false)
      return
    }

    try {
      const res = await api.post('/checkins', {
        punto_id:             punto.id,
        material_id:          materialSeleccionado,
        cantidad_estimada_kg: cantidadKg,
        foto_base64:          fotoBase64,
        latitud:              pos.coords.latitude,
        longitud:             pos.coords.longitude,
      })
      await refrescarUsuario()
      setExito(res.data)
    } catch (err) {
      setErrorMsg(err.response?.data?.error || t('checkin.errorRegistrar'))
    } finally {
      setProcesando(false)
    }
  }

  // ── materiales y preview ──────────────────────────────────────

  const materialObj   = materialSeleccionado
    ? punto.materiales.find((m) => Number(m.id) === materialSeleccionado)
    : null

  const puntosPreview = materialObj && cantidadKg
    ? Math.round(cantidadKg * (materialObj.puntos_por_kg ?? 10))
    : null

  const puedeConfirmar = materialSeleccionado && cantidadKg && fotoBase64 && !procesando

  // ── si cámara abierta, renderizarla sobre todo ────────────────
  if (modoCamera) {
    return (
      <CameraCapture
        onCapture={modoCamera === 'ia' ? handleCapturaIA : handleCapturaFoto}
        onClose={() => setModoCamera(null)}
      />
    )
  }

  // ── modal principal ───────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => !procesando && onClose()}
        className="animate-fade-in"
        style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0, 14, 10, 0.55)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          zIndex: 1200,
        }}
      />

      {/* Wrapper para centrar — deja que `animate-scale-in` controle el transform del modal */}
      <div
        style={{
          position: 'fixed', inset: 0,
          zIndex: 1201,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          pointerEvents: 'none',
        }}
      >
        {/* Caja del modal */}
        <div
          className="animate-scale-in"
          style={{
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text)',
            borderRadius: 'var(--radius-xl)',
            width: '100%', maxWidth: '480px',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: 'var(--shadow-lg)',
            fontFamily: "'Inter', system-ui, sans-serif",
            pointerEvents: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
        {exito ? (
          <PantallaExito exito={exito} onCerrar={() => { onSuccess?.(); onClose() }} />
        ) : (
          <>
            {/* ── Header ── */}
            <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', system-ui", fontWeight: '700', fontSize: '18px', color: 'var(--color-text)', margin: 0 }}>
                  {t('checkin.titulo')}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                  {punto.nombre}
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={procesando}
                style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  border: '1.5px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface-alt)',
                  color: 'var(--color-text-muted)',
                  cursor: procesando ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: '2px',
                }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ padding: '16px 20px 24px' }}>

              {/* Toast */}
              {toastMsg && (
                <div
                  className={`flex items-start gap-2 ${toastMsg.tipo === 'success' ? 'feedback-success' : 'feedback-warning'}`}
                  style={{
                    padding: '10px 14px',
                    fontSize: '13px',
                    marginBottom: '14px',
                    lineHeight: '1.4',
                  }}
                >
                  {toastMsg.tipo === 'success'
                    ? <Check size={15} className="flex-shrink-0 mt-0.5" />
                    : <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />}
                  <span>{toastMsg.msg}</span>
                </div>
              )}

              {/* ── SECCIÓN 1: Material ── */}
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text-soft)', margin: '0 0 10px' }}>
                  {t('checkin.queVasAReciclar')}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  {punto.materiales.map((m) => {
                    const sel   = materialSeleccionado === Number(m.id)
                    const color = colorContenedor(m.color_contenedor)
                    const tc    = textoSobreColor(m.color_contenedor)
                    return (
                      <button
                        key={m.id}
                        onClick={() => setMaterialSeleccionado(Number(m.id))}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '7px 14px', borderRadius: '999px',
                          backgroundColor: sel ? color : 'transparent',
                          border: `2px solid ${color}`,
                          color: sel ? tc : color,
                          fontSize: '13px', fontWeight: '600',
                          cursor: 'pointer',
                          transform: sel ? 'scale(1.04)' : 'scale(1)',
                          boxShadow: sel ? `0 4px 14px ${color}40` : 'none',
                          transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.18s, box-shadow 0.18s, color 0.18s',
                        }}
                      >
                        <IconoMaterial material={m} size={13} />
                        {traducirMaterial(t, m)}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={abrirCamaraIA}
                  disabled={cargandoModelo || analizandoIA}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    backgroundColor: 'transparent',
                    border: '1.5px solid var(--color-border)',
                    color: 'var(--color-text-soft)', padding: '8px 14px',
                    borderRadius: '10px', fontSize: '12px',
                    fontWeight: '600',
                    cursor: cargandoModelo || analizandoIA ? 'not-allowed' : 'pointer',
                  }}
                >
                  {cargandoModelo || analizandoIA ? (
                    <>
                      <span style={{
                        width: '14px', height: '14px',
                        border: '2px solid var(--color-border)',
                        borderTopColor: 'var(--color-brand)',
                        borderRadius: '50%', display: 'inline-block',
                        animation: 'rm-spin 0.8s linear infinite',
                      }} />
                      {cargandoModelo ? t('checkin.cargandoModelo') : t('checkin.cargandoIA')}
                    </>
                  ) : (
                    <>
                      <Camera size={13} />
                      {t('checkin.identificarConCamara')}
                    </>
                  )}
                </button>
              </div>

              {/* ── SECCIÓN 2: Cantidad ── */}
              {materialSeleccionado && (
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text-soft)', margin: '0 0 10px' }}>
                    {t('checkin.cuantoVasAReciclar')}
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {CANTIDADES.map(({ valor, claveLabel }) => {
                      const sel = cantidadKg === valor
                      return (
                        <button
                          key={valor}
                          onClick={() => setCantidadKg(valor)}
                          style={{
                            flex: 1,
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', gap: '2px',
                            padding: '14px 8px', borderRadius: '14px',
                            backgroundColor: sel ? 'var(--color-surface-alt)' : 'var(--color-bg)',
                            border: `2px solid ${sel ? 'var(--color-brand)' : 'var(--color-border)'}`,
                            cursor: 'pointer',
                            transition: 'background-color 0.18s, border-color 0.18s, color 0.18s',
                          }}
                        >
                          <span style={{ fontSize: '14px', fontWeight: '700', color: sel ? 'var(--color-brand)' : 'var(--color-text-soft)' }}>
                            {t(claveLabel)}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{t('checkin.kgEtiqueta', { kg: valor })}</span>
                        </button>
                      )
                    })}
                  </div>
                  {puntosPreview !== null && (
                    <p style={{ fontSize: '13px', color: 'var(--color-brand)', fontWeight: '600', margin: '10px 0 0', textAlign: 'center' }}>
                      {t('checkin.vasAGanar', { puntos: puntosPreview })}
                    </p>
                  )}
                </div>
              )}

              {/* ── SECCIÓN 3: Foto ── */}
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text-soft)', margin: '0 0 10px' }}>
                  {t('checkin.sacateFoto')}
                </p>
                {fotoBase64 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                      src={fotoBase64}
                      alt=""
                      style={{
                        width: '80px', height: '80px',
                        borderRadius: '12px', objectFit: 'cover',
                        border: '2px solid var(--color-border)',
                      }}
                    />
                    <button
                      onClick={() => setModoCamera('foto')}
                      style={{
                        padding: '8px 14px', borderRadius: '10px',
                        backgroundColor: 'transparent',
                        border: '1.5px solid var(--color-border)',
                        color: 'var(--color-text-soft)', fontSize: '13px',
                        fontWeight: '600', cursor: 'pointer',
                      }}
                    >
                      {t('checkin.retomar')}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setModoCamera('foto')}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      backgroundColor: 'transparent',
                      border: '1.5px solid var(--color-border)',
                      color: 'var(--color-text-soft)', padding: '10px 16px',
                      borderRadius: '10px', fontSize: '13px',
                      fontWeight: '600', cursor: 'pointer',
                    }}
                  >
                    <Camera size={14} />
                    {t('checkin.tomarFoto')}
                  </button>
                )}
              </div>

              {/* Error de envío */}
              {errorMsg && (
                <div
                  className="feedback-error flex items-start gap-2"
                  style={{
                    padding: '10px 14px',
                    fontSize: '13px',
                    marginBottom: '14px',
                    lineHeight: '1.4',
                  }}
                >
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Botón confirmar */}
              <button
                onClick={confirmar}
                disabled={!puedeConfirmar}
                style={{
                  width: '100%', padding: '14px',
                  backgroundColor: puedeConfirmar ? 'var(--color-brand)' : 'var(--color-border)',
                  color: puedeConfirmar ? '#fff' : 'var(--color-text-muted)',
                  border: 'none', borderRadius: '14px',
                  fontSize: '15px', fontWeight: '700',
                  cursor: puedeConfirmar ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.2s',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '8px',
                }}
              >
                {procesando ? (
                  <>
                    <span style={{
                      width: '18px', height: '18px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'rm-spin 0.8s linear infinite',
                    }} />
                    {t('checkin.procesando')}
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    {t('checkin.confirmar')}
                  </>
                )}
              </button>
            </div>
          </>
        )}
        </div>
      </div>

    </>
  )
}

// ── Pantalla de éxito ─────────────────────────────────────────────────────────

function PantallaExito({ exito, onCerrar }) {
  const { t } = useTranslation()
  const { checkin, usuario, logros_desbloqueados } = exito
  return (
    <div style={{ padding: '36px 24px 28px', textAlign: 'center' }}>
      <div
        className="animate-celebrate"
        style={{
          fontFamily: "'Plus Jakarta Sans', system-ui",
          fontSize: '62px', fontWeight: '900',
          color: '#1FAA59', marginBottom: '6px',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          textShadow: '0 6px 20px rgba(31, 170, 89, 0.28)',
        }}
      >
        {t('checkin.puntosGanados', { puntos: checkin.puntos_ganados })}
      </div>

      <p className="animate-fade-in" style={{ fontFamily: "'Plus Jakarta Sans', system-ui", fontSize: '20px', fontWeight: '700', color: 'var(--color-text)', margin: '8px 0 4px' }}>
        {t('checkin.reciclajeConfirmado')}
      </p>

      {usuario.subio_de_nivel && (
        <p style={{ fontSize: '15px', color: 'var(--color-brand)', fontWeight: '700', margin: '14px 0 0', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <PartyPopper size={16} />
          {t('checkin.subisteNivel', { nivel: usuario.nivel })}
        </p>
      )}

      {logros_desbloqueados.length > 0 && (
        <div style={{ marginTop: '20px', textAlign: 'left' }}>
          <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Trophy size={12} />
            {t('checkin.logrosDesbloqueados')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {logros_desbloqueados.map((logro) => {
              const trad = traducirLogro(t, logro)
              return (
                <div
                  key={logro.id}
                  style={{
                    backgroundColor: 'var(--color-surface-alt)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px', padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: '50%',
                      backgroundColor: 'var(--color-brand)',
                      color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <IconoLogro logro={logro} size={20} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontWeight: '700', color: 'var(--color-brand)', fontSize: '14px', margin: 0 }}>
                      {trad.nombre}
                    </p>
                    {trad.descripcion && (
                      <p style={{ fontSize: '12px', color: 'var(--color-text-soft)', margin: '2px 0 0' }}>
                        {trad.descripcion}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <button
        onClick={onCerrar}
        style={{
          marginTop: '24px', width: '100%',
          backgroundColor: 'var(--color-brand)', color: '#fff',
          border: 'none', borderRadius: '14px',
          padding: '14px', fontSize: '15px',
          fontWeight: '700', cursor: 'pointer',
        }}
      >
        {t('checkin.cerrar')}
      </button>

    </div>
  )
}
