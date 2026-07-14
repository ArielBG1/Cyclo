import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, X as IconX, AlertTriangle } from 'lucide-react'

export default function CameraCapture({ onCapture, onClose, facingMode = 'environment' }) {
  const { t } = useTranslation()
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [listo, setListo]   = useState(false)
  const [error, setError]   = useState(null)

  useEffect(() => {
    async function iniciar() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width:  { ideal: 1280, max: 1920 },
            height: { ideal: 1280, max: 1920 },
          },
          audio: false,
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = async () => {
            try {
              await videoRef.current.play()
              setListo(true)
            } catch {
              setError(t('camera.errorIniciarVideo'))
            }
          }
        }
      } catch (err) {
        if (err.name === 'NotAllowedError') {
          setError(t('camera.errorPermisoDenegado'))
        } else if (err.name === 'NotFoundError') {
          setError(t('camera.errorNoCamara'))
        } else {
          setError(t('camera.errorAcceso', { mensaje: err.message }))
        }
      }
    }

    iniciar()

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [facingMode, t])

  function capturar() {
    if (!videoRef.current || !canvasRef.current || !listo) return
    const video  = videoRef.current
    const canvas = canvasRef.current
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    onCapture(canvas.toDataURL('image/jpeg', 0.85))
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: '#000',
      zIndex: 1500,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Botón X */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: '16px', right: '16px',
          width: '40px', height: '40px', borderRadius: '50%',
          backgroundColor: 'rgba(0,0,0,0.6)',
          border: '2px solid rgba(255,255,255,0.5)',
          color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10,
        }}
        aria-label={t('camera.cerrar')}
      >
        <IconX size={18} />
      </button>

      {error ? (
        <div style={{ color: '#fff', textAlign: 'center', padding: '32px', maxWidth: '320px' }}>
          <AlertTriangle size={44} style={{ margin: '0 auto 16px', color: '#FCD34D' }} />
          <p style={{ fontSize: '15px', lineHeight: '1.5', marginBottom: '20px' }}>{error}</p>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#1FAA59', color: '#fff',
              border: 'none', padding: '10px 28px',
              borderRadius: '10px', fontSize: '14px',
              fontWeight: '600', cursor: 'pointer',
            }}
          >
            {t('camera.cerrar')}
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay playsInline muted
            style={{
              width: '100%',
              maxWidth: '500px',
              maxHeight: 'calc(100vh - 140px)',
              objectFit: 'cover',
              borderRadius: '12px',
            }}
          />

          {/* Botón circular de captura */}
          <button
            onClick={capturar}
            disabled={!listo}
            style={{
              position: 'absolute', bottom: '40px',
              width: '72px', height: '72px', borderRadius: '50%',
              backgroundColor: listo ? '#1FAA59' : '#444',
              border: '4px solid #fff',
              color: '#fff',
              cursor: listo ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              transition: 'background-color 0.2s',
            }}
            aria-label={t('escanear.capturarImagen')}
          >
            <Camera size={28} />
          </button>
        </>
      )}
    </div>
  )
}
