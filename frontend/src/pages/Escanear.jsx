import { useState, useEffect, useRef } from 'react'
import {
  Camera, RotateCcw, AlertCircle, MapPin, Navigation, Bot,
  Recycle, Lightbulb, CheckCircle2, AlertTriangle, SwitchCamera,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { traducirMaterial, traducirInstrucciones } from '../utils/materialKey'
import { colorContenedor } from '../utils/colorContenedor'
import { IconoMaterial } from '../utils/iconoMaterial'
import api from '../services/api'

export default function Escanear() {
  const { t } = useTranslation()
  const [cargando, setCargando] = useState(true)
  const [materiales, setMateriales] = useState([])
  const [streamActivo, setStreamActivo] = useState(false)
  const [capturando, setCapturando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState(null)
  const [ubicacion, setUbicacion] = useState(null)
  const [facingMode, setFacingMode] = useState('environment')  // 'environment' = trasera, 'user' = frontal

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    async function cargarMateriales() {
      try {
        const res = await api.get('/materiales')
        setMateriales(res.data)
      } catch {
        setError(t('escanear.errorModelo'))
      } finally {
        setCargando(false)
      }
    }

    cargarMateriales()
  }, [])

  // Detener stream al desmontar
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const iniciarCamara = async (modo = facingMode) => {
    setError(null)
    try {
      let stream
      try {
        // 'exact' fuerza la cámara pedida — sin esto, 'environment' es solo
        // una preferencia y varios celulares abren la frontal igual.
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: modo },
            width:      { ideal: 1280, max: 1920 },
            height:     { ideal: 1280, max: 1920 },
          },
          audio: false,
        })
      } catch (exactErr) {
        // Algunos dispositivos (webcams de PC, o celulares sin una cámara
        // etiquetada exactamente así) no tienen match para 'exact' — reintentamos
        // sin forzar para no bloquear el acceso a la cámara.
        if (exactErr.name === 'OverconstrainedError' || exactErr.name === 'ConstraintNotSatisfiedError') {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: modo,
              width:      { ideal: 1280, max: 1920 },
              height:     { ideal: 1280, max: 1920 },
            },
            audio: false,
          })
        } else {
          throw exactErr
        }
      }
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current.play()
            setStreamActivo(true)
          } catch (playErr) {
            console.error('Error al reproducir video:', playErr)
            setError(t('camera.errorIniciarVideo'))
          }
        }
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => setUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      )
    } catch (err) {
      console.error('Error al acceder a cámara:', err)
      if (err.name === 'NotAllowedError') {
        setError(t('camera.errorPermisoDenegado'))
      } else if (err.name === 'NotFoundError') {
        setError(t('camera.errorNoCamara'))
      } else {
        setError(t('camera.errorAcceso', { mensaje: err.message }))
      }
    }
  }

  function rotarCamara() {
    const nuevoModo = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nuevoModo)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    iniciarCamara(nuevoModo)
  }

  function detenerCamara() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setStreamActivo(false)
  }

  async function capturarYDetectar() {
    if (!videoRef.current || !canvasRef.current) return
    setCapturando(true)
    setError(null)

    try {
      const video  = videoRef.current
      const canvas = canvasRef.current

      if (!video.videoWidth || !video.videoHeight) {
        throw new Error(t('escanear.errorVideoNoListo'))
      }

      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d').drawImage(video, 0, 0)
      const fotoBase64 = canvas.toDataURL('image/jpeg', 0.85)

      detenerCamara()

      const { data } = await api.post('/escanear', { foto_base64: fotoBase64 })

      const materialInfo = data.materialId
        ? (materiales.find((m) => Number(m.id) === data.materialId) ?? null)
        : null

      // Buscar puntos cercanos con geolocalización fresca
      let puntosCercanos = []
      if (materialInfo) {
        try {
          const posicion = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              reject,
              { timeout: 10000 }
            )
          })
          setUbicacion(posicion)
          const resp = await api.get('/puntos/cercanos', {
            params: { material_id: materialInfo.id, lat: posicion.lat, lng: posicion.lng },
          })
          puntosCercanos = resp.data
        } catch (geoErr) {
          console.warn('No se pudo obtener ubicación:', geoErr)
        }
      }

      setResultado({
        fotoBase64,
        material:        materialInfo,
        materialId:      materialInfo ? materialInfo.id : null,
        objetoDetectado: data.objetoDetectado,
        confianza:       data.confianza,
        puntosCercanos,
      })
    } catch (err) {
      console.error('Error al detectar:', err)
      const mensaje = err.response?.data?.error || err.message
      setError(t('escanear.errorProcesarImagen', { mensaje }))
    } finally {
      setCapturando(false)
    }
  }

  function reiniciar() {
    setResultado(null)
    setError(null)
    iniciarCamara()
  }

  // ── Pantalla de carga inicial ──
  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] bg-app p-6">
        <div className="text-center max-w-sm animate-fade-in">
          <Bot size={64} className="mx-auto mb-6 text-brand-500 animate-gentle-pulse" strokeWidth={1.5} />
          <h2 className="font-display text-xl font-bold text-main mb-2">
            {t('escanear.cargandoModeloTitulo')}
          </h2>
          <p className="text-muted text-sm leading-relaxed mb-6">
            {t('escanear.cargandoModeloDescripcion')}
          </p>
          <div className="rm-progress-bar max-w-xs mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] bg-app pb-12">
      <div className="max-w-xl mx-auto px-4 pt-8">
        <h1 className="font-display text-2xl font-bold text-main mb-1">{t('escanear.titulo')}</h1>
        <p className="text-muted text-sm mb-7">
          {t('escanear.subtitulo')}
        </p>

        {/* Error */}
        {error && (
          <div className="feedback-error flex items-start gap-3 px-4 py-3.5 mb-5">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{error}</p>
              <button
                onClick={() => { setError(null); iniciarCamara() }}
                className="text-xs font-semibold underline opacity-80 hover:opacity-100 mt-1.5 transition-opacity"
              >
                {t('escanear.reintentar')}
              </button>
            </div>
          </div>
        )}

        {/* Sin resultado — cámara */}
        {!resultado && (
          <div className="flex flex-col items-center gap-4">
            <canvas ref={canvasRef} className="hidden" />

            {capturando ? (
              /* ── Analizando con IA (foto ya capturada, esperando al backend) ── */
              <div className="w-full flex flex-col items-center justify-center gap-4 py-16 animate-fade-in">
                <Bot size={56} className="text-brand-500 animate-gentle-pulse" strokeWidth={1.5} />
                <p className="font-display text-lg font-bold text-main">{t('escanear.analizando')}</p>
                <div className="rm-progress-bar max-w-xs mx-auto" />
              </div>
            ) : (
              <>
                <div className={`relative w-full rounded-2xl overflow-hidden shadow-lg border-2 border-brand-800/30 bg-brand-900 ${streamActivo ? 'block animate-fade-in' : 'hidden'}`}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full rounded-lg bg-brand-900"
                    style={{ minHeight: '300px', objectFit: 'cover' }}
                  />
                  {streamActivo && (
                    <button
                      onClick={rotarCamara}
                      aria-label={t('escanear.rotarCamara')}
                      title={t('escanear.rotarCamara')}
                      className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                    >
                      <SwitchCamera size={18} />
                    </button>
                  )}
                </div>

                {streamActivo ? (
                  <>
                    <button
                      onClick={capturarYDetectar}
                      className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-bold py-4 rounded-2xl text-base shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                    >
                      <Camera size={18} />
                      {t('escanear.capturarImagen')}
                    </button>
                    <button
                      onClick={detenerCamara}
                      className="text-sm text-muted hover:text-soft transition-colors"
                    >
                      {t('escanear.cancelar')}
                    </button>
                  </>
                ) : (
                  !error && (
                    <button
                      onClick={() => iniciarCamara()}
                      className="w-full flex items-center justify-center gap-3 bg-brand-500 hover:bg-brand-400 text-white font-bold py-8 rounded-2xl text-lg shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                    >
                      <Camera size={24} />
                      {t('escanear.abrirCamara')}
                    </button>
                  )
                )}
              </>
            )}
          </div>
        )}

        {/* Con resultado */}
        {resultado && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <img
              src={resultado.fotoBase64}
              alt="Foto capturada"
              className="w-full rounded-2xl shadow-lg border border-brand-100"
            />

            {resultado.material ? (
              /* ── CASO 1: material identificado ── */
              <div className="bg-surface rounded-2xl shadow-md border border-theme p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      backgroundColor: `${colorContenedor(resultado.material.color_contenedor)}26`,
                      color: colorContenedor(resultado.material.color_contenedor),
                    }}
                  >
                    <IconoMaterial material={resultado.material} size={26} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display text-xl font-bold text-main leading-tight">
                      {traducirMaterial(t, resultado.material)}
                    </h2>
                    <p className="text-xs text-muted mt-0.5">
                      {t('escanear.objetoDetectado')}{' '}
                      <span className="font-semibold text-soft">
                        {resultado.objetoDetectado}
                      </span>
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-sm text-muted">{t('escanear.vaAlContenedor')}</span>
                      <span
                        className="inline-block w-4 h-4 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: colorContenedor(resultado.material.color_contenedor) }}
                        title={resultado.material.color_contenedor}
                      />
                    </div>
                    <p className="text-xs text-brand-600 font-semibold mt-1 inline-flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      {t('escanear.deConfianza', { nivel: t(`escanear.confianza${resultado.confianza.charAt(0).toUpperCase()}${resultado.confianza.slice(1)}`) })}
                    </p>
                  </div>
                </div>

                {resultado.confianza === 'baja' && (
                  <p className="feedback-warning flex items-start gap-2 text-xs px-3 py-2.5 mb-3">
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>{t('escanear.deteccionImprecisa')}</span>
                  </p>
                )}

                {traducirInstrucciones(t, resultado.materialId) && (
                  <p className="text-sm text-soft bg-surface-alt border border-theme rounded-xl p-3 mb-4 leading-relaxed flex items-start gap-2">
                    <Lightbulb size={15} className="flex-shrink-0 mt-0.5 text-brand-600" />
                    <span>{traducirInstrucciones(t, resultado.materialId)}</span>
                  </p>
                )}

                {resultado.puntosCercanos.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2.5">
                      {t('escanear.puntosCercanos')}
                    </h3>
                    <div className="flex flex-col gap-2">
                      {resultado.puntosCercanos.map((punto) => (
                        <div
                          key={punto.id}
                          className="bg-surface-alt border border-theme rounded-xl p-3 flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-main text-sm truncate">{punto.nombre}</p>
                            {punto.direccion && (
                              <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                                <MapPin size={11} className="flex-shrink-0" />
                                {punto.direccion}
                              </p>
                            )}
                            <p className="text-xs text-brand-600 font-semibold mt-0.5 flex items-center gap-1">
                              <Navigation size={11} className="flex-shrink-0" />
                              {t('escanear.kmDistancia', { km: punto.distancia_km })}
                            </p>
                          </div>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${punto.latitud},${punto.longitud}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-brand-500 hover:bg-brand-400 text-white font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex-shrink-0"
                          >
                            {t('escanear.comoLlegar')}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {resultado.puntosCercanos.length === 0 && ubicacion && (
                  <p className="text-sm text-muted text-center mt-3">
                    {t('escanear.sinPuntosCercanos')}
                  </p>
                )}

                {!ubicacion && (
                  <p className="feedback-warning flex items-start gap-2 text-sm p-3 mt-3">
                    <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                    <span>{t('escanear.activarUbicacion')}</span>
                  </p>
                )}
              </div>

            ) : (
              /* ── CASO 2: no es ninguno de los materiales reciclables conocidos ── */
              <div className="bg-surface rounded-2xl shadow-md border border-theme p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-surface-alt text-brand-600 flex items-center justify-center flex-shrink-0">
                    <Recycle size={26} strokeWidth={1.8} />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-main">
                      {t('escanear.noReciclableTitulo')}
                    </h2>
                    <p className="text-sm text-muted mt-0.5">
                      {t('escanear.noReciclableDescripcion')}
                    </p>
                    {resultado.objetoDetectado && (
                      <p className="text-xs text-muted mt-1.5">
                        {t('escanear.detectamos', { objeto: resultado.objetoDetectado })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={reiniciar}
              className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-bold py-4 rounded-2xl text-base shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              <RotateCcw size={18} />
              {t('escanear.escanearOtra')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
