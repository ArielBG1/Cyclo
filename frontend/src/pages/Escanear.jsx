import { useState, useEffect, useRef } from 'react'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import * as tf from '@tensorflow/tfjs'
import {
  Camera, RotateCcw, AlertCircle, MapPin, Navigation, Bot,
  Recycle, HelpCircle, Wrench, Lightbulb, CheckCircle2, AlertTriangle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { detectarMaterial, traducirClase, formatearDetecciones } from '../utils/mapeoMateriales'
import { traducirMaterial, traducirInstrucciones } from '../utils/materialKey'
import { colorContenedor } from '../utils/colorContenedor'
import { IconoMaterial } from '../utils/iconoMaterial'
import api from '../services/api'

// Cambiar a true solo para diagnosticar problemas de detección de CycloScan.
// Cuando está activado se muestra el bloque debug con la imagen procesada,
// dimensiones y cantidad de objetos detectados.
const DEBUG_IA = false

export default function Escanear() {
  const { t } = useTranslation()
  const [cargandoModelo, setCargandoModelo] = useState(true)
  const [modelo, setModelo] = useState(null)
  const [materiales, setMateriales] = useState([])
  const [streamActivo, setStreamActivo] = useState(false)
  const [capturando, setCapturando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState(null)
  const [ubicacion, setUbicacion] = useState(null)
  const [imagenIA, setImagenIA] = useState(null)  // debug: imagen limpia que vio el modelo

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    async function cargarModelo() {
      try {
        const m = await cocoSsd.load({ base: 'mobilenet_v2' })
        setModelo(m)
      } catch {
        setError(t('escanear.errorModelo'))
      } finally {
        setCargandoModelo(false)
      }
    }

    async function cargarMateriales() {
      try {
        const res = await api.get('/materiales')
        setMateriales(res.data)
      } catch {
        // Sin info de materiales no es crítico
      }
    }

    cargarModelo()
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

  const iniciarCamara = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width:      { ideal: 1280, max: 1920 },
          height:     { ideal: 1280, max: 1920 },
        },
        audio: false,
      })
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
    if (!modelo || !videoRef.current || !canvasRef.current) return
    setCapturando(true)
    setError(null)

    try {
      const video  = videoRef.current
      const canvas = canvasRef.current

      if (!video.videoWidth || !video.videoHeight) {
        throw new Error(t('escanear.errorVideoNoListo'))
      }

      // Tamaño reducido para la IA (max 640px)
      const TARGET_MAX = 640
      const ratio = Math.min(TARGET_MAX / video.videoWidth, TARGET_MAX / video.videoHeight, 1)
      const wDet  = Math.round(video.videoWidth  * ratio)
      const hDet  = Math.round(video.videoHeight * ratio)

      // Ráfaga de varios frames en vez de uno solo: en celular sostenido a mano
      // es común que el instante exacto del tap tenga desenfoque de movimiento
      // o el autoenfoque todavía esté ajustando. Probamos unos frames espaciados
      // y nos quedamos con el de mejor detección. En webcam de PC (imagen fija)
      // esto no cambia el resultado, solo suma medio segundo.
      const FRAMES       = 3
      const INTERVALO_MS = 150
      const candidatos   = []

      for (let i = 0; i < FRAMES; i++) {
        if (i > 0) await new Promise((r) => setTimeout(r, INTERVALO_MS))

        const full = document.createElement('canvas')
        full.width  = video.videoWidth
        full.height = video.videoHeight
        full.getContext('2d').drawImage(video, 0, 0)

        const canvasDet = document.createElement('canvas')
        canvasDet.width  = wDet
        canvasDet.height = hDet
        const ctxDet = canvasDet.getContext('2d')
        ctxDet.imageSmoothingEnabled = true
        ctxDet.imageSmoothingQuality = 'high'
        ctxDet.drawImage(video, 0, 0, wDet, hDet)

        const tensor = tf.browser.fromPixels(canvasDet)
        let detecciones = await modelo.detect(tensor)
        tensor.dispose()

        if (!detecciones || detecciones.length === 0) {
          const tensor2 = tf.browser.fromPixels(canvasDet)
          detecciones = await modelo.detect(tensor2, 20, 0.1)
          tensor2.dispose()
        }

        candidatos.push({ full, canvasDet, detecciones, score: detecciones?.[0]?.score ?? 0 })
      }

      candidatos.sort((a, b) => b.score - a.score)
      const mejor = candidatos[0]
      const deteccionesFinales = mejor.detecciones

      console.log('=== DEBUG DETECCIÓN (ráfaga) ===')
      console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight)
      console.log('Scores por frame:', candidatos.map((c) => c.score))
      console.log('Mejor detección:', deteccionesFinales)
      console.log('=== FIN DEBUG ===')

      setImagenIA(mejor.canvasDet.toDataURL('image/jpeg', 0.85))

      const match = detectarMaterial(deteccionesFinales)

      // Dibujar el frame elegido + bbox en el canvas visible
      canvas.width  = mejor.full.width
      canvas.height = mejor.full.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(mejor.full, 0, 0)

      if (match?.bbox) {
        const escala           = video.videoWidth / wDet
        const [bx, by, bw, bh] = match.bbox.map((v) => v * escala)
        const grosor           = Math.max(3, Math.round(video.videoWidth / 400))
        const fontSize         = Math.max(14, Math.round(video.videoWidth / 55))
        const label            = `${match.claseTraducida} ${Math.round(match.confianza * 100)}%`

        ctx.font     = `bold ${fontSize}px Inter, system-ui, sans-serif`
        const textW  = ctx.measureText(label).width
        const padH   = 6
        const labelH = fontSize + padH * 2
        const labelX = Math.max(0, Math.min(bx, video.videoWidth - textW - 12))
        const labelY = by > labelH + grosor + 2 ? by - grosor - 2 : by + bh + grosor + 2

        ctx.strokeStyle = '#1FAA59'
        ctx.lineWidth   = grosor
        ctx.lineJoin    = 'round'
        ctx.strokeRect(bx, by, bw, bh)

        ctx.fillStyle = '#1FAA59'
        ctx.fillRect(labelX, labelY - labelH, textW + 12, labelH)
        ctx.fillStyle = '#ffffff'
        ctx.fillText(label, labelX + 6, labelY - padH)
      }

      const fotoBase64 = canvas.toDataURL('image/jpeg', 0.85)

      // Buscar material en DB
      const materialId   = match?.materialId ?? null
      const materialInfo = materialId
        ? (materiales.find((m) => Number(m.id) === materialId) ?? null)
        : null

      // Buscar puntos cercanos con geolocalización fresca
      let puntosCercanos = []
      if (match) {
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
            params: { material_id: match.materialId, lat: posicion.lat, lng: posicion.lng },
          })
          puntosCercanos = resp.data
        } catch (geoErr) {
          console.warn('No se pudo obtener ubicación:', geoErr)
        }
      }

      detenerCamara()
      setResultado({
        fotoBase64,
        match,
        material:     materialInfo,
        detecciones:  formatearDetecciones(deteccionesFinales, 5),
        puntosCercanos,
        materialId,
        _debug: {
          videoSize:           `${video.videoWidth}x${video.videoHeight}`,
          canvasDetSize:       `${wDet}x${hDet}`,
          cantidadDetecciones: deteccionesFinales?.length || 0,
        },
      })
    } catch (err) {
      console.error('Error al detectar:', err)
      setError(t('escanear.errorProcesarImagen', { mensaje: err.message }))
    } finally {
      setCapturando(false)
    }
  }

  function reiniciar() {
    setResultado(null)
    setImagenIA(null)
    setError(null)
    iniciarCamara()
  }

  // ── Pantalla de carga del modelo ──
  if (cargandoModelo) {
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

            <div className={`w-full rounded-2xl overflow-hidden shadow-lg border-2 border-brand-800/30 bg-brand-900 ${streamActivo ? 'block animate-fade-in' : 'hidden'}`}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-lg bg-brand-900"
                style={{ minHeight: '300px', objectFit: 'cover' }}
              />
            </div>

            {streamActivo ? (
              <>
                <button
                  onClick={capturarYDetectar}
                  disabled={capturando}
                  className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 disabled:bg-brand-100 disabled:text-brand-600 text-white font-bold py-4 rounded-2xl text-base shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                >
                  {capturando ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('escanear.analizando')}
                    </>
                  ) : (
                    <>
                      <Camera size={18} />
                      {t('escanear.capturarImagen')}
                    </>
                  )}
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
                  onClick={iniciarCamara}
                  className="w-full flex items-center justify-center gap-3 bg-brand-500 hover:bg-brand-400 text-white font-bold py-8 rounded-2xl text-lg shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                >
                  <Camera size={24} />
                  {t('escanear.abrirCamara')}
                </button>
              )
            )}
          </div>
        )}

        {/* Con resultado */}
        {resultado && (
          <div className="flex flex-col gap-4 animate-fade-in">
            {/* Foto capturada (con bbox dibujado si hay match) */}
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
                    {resultado.match && (
                      <p className="text-xs text-muted mt-0.5">
                        {t('escanear.objetoDetectado')}{' '}
                        <span className="font-semibold text-soft">
                          {traducirClase(resultado.match.claseDetectada)}
                        </span>
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-sm text-muted">{t('escanear.vaAlContenedor')}</span>
                      <span
                        className="inline-block w-4 h-4 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: colorContenedor(resultado.material.color_contenedor) }}
                        title={resultado.material.color_contenedor}
                      />
                    </div>
                    {resultado.match && (
                      <p className="text-xs text-brand-600 font-semibold mt-1 inline-flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        {t('escanear.deConfianza', { porcentaje: (resultado.match.confianza * 100).toFixed(0) })}
                      </p>
                    )}
                  </div>
                </div>

                {resultado.match?.confianza_baja && (
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

            ) : resultado.detecciones.length > 0 ? (
              /* ── CASO 2: detectó objetos pero no son reciclables ── */
              <div className="bg-surface rounded-2xl shadow-md border border-theme p-5">
                <div className="flex items-center gap-3 mb-4">
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
                  </div>
                </div>
                <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">
                  {t('escanear.loQueDetectamos')}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {resultado.detecciones.map((det, i) => (
                    <li
                      key={i}
                      className="flex justify-between items-center bg-surface-alt border border-theme rounded-xl px-3 py-2 text-sm"
                    >
                      <span className="text-soft truncate mr-2">{det.traducida}</span>
                      <span className="text-muted font-medium flex-shrink-0">
                        {(det.confianza * 100).toFixed(1)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

            ) : (
              /* ── CASO 3: no detectó ningún objeto ── */
              <div className="bg-surface rounded-2xl shadow-md border border-theme p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-surface-alt text-muted flex items-center justify-center flex-shrink-0">
                    <HelpCircle size={26} strokeWidth={1.8} />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-main">
                      {t('escanear.noDetectadoTitulo')}
                    </h2>
                    <p className="text-sm text-muted mt-0.5">
                      {t('escanear.noDetectadoDescripcion')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Debug: imagen que vio el modelo (oculto al usuario, ver DEBUG_IA arriba) */}
            {DEBUG_IA && imagenIA && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted hover:text-soft select-none py-1 transition-colors inline-flex items-center gap-1.5">
                  <Wrench size={13} />
                  {t('escanear.debugVerImagen')}
                </summary>
                <div className="mt-2 p-3 bg-surface-alt rounded-xl border border-theme">
                  <p className="text-xs text-muted font-medium mb-0.5">
                    Modelo: COCO-SSD (mobilenet_v2)
                  </p>
                  {resultado?._debug && (
                    <div className="mt-2 text-xs text-soft space-y-1">
                      <p>{t('escanear.debugTamanoVideo', { tamano: resultado._debug.videoSize })}</p>
                      <p>{t('escanear.debugTamanoCanvas', { tamano: resultado._debug.canvasDetSize })}</p>
                      <p>{t('escanear.debugObjetosDetectados', { cantidad: resultado._debug.cantidadDetecciones })}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted mt-2 mb-2 leading-relaxed">
                    {t('escanear.debugExplicacion')}
                  </p>
                  <img
                    src={imagenIA}
                    alt=""
                    className="border border-theme rounded-lg w-full"
                    style={{ maxWidth: '400px' }}
                  />
                </div>
              </details>
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
