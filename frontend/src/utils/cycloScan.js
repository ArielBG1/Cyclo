// CycloScan: detección de objetos 100% en el navegador con COCO-SSD
// (TensorFlow.js). Gratis, sin API keys ni backend: el modelo se descarga
// una vez y corre en el dispositivo del usuario.
//
// Lo usan Escanear.jsx y CheckinModal.jsx. El modelo se carga una sola vez
// por sesión y queda compartido entre los dos.
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import '@tensorflow/tfjs'

// Tamaño máximo del lado más largo de la imagen que recibe el modelo.
// Más grande no mejora la detección y la hace mucho más lenta en celular.
export const TAMANO_MAX_IA = 640

let promesaModelo = null

/**
 * Devuelve el modelo COCO-SSD, cargándolo solo la primera vez.
 * Si la carga falla se resetea para poder reintentar.
 */
export function cargarModelo() {
  if (!promesaModelo) {
    promesaModelo = cocoSsd.load({ base: 'mobilenet_v2' }).catch((err) => {
      promesaModelo = null
      throw err
    })
  }
  return promesaModelo
}

/**
 * Dibuja `fuente` (video, img o canvas) en un canvas nuevo reducido a
 * TAMANO_MAX_IA px como máximo, manteniendo la proporción.
 */
export function redimensionarParaIA(fuente, anchoOriginal, altoOriginal) {
  const ratio  = Math.min(TAMANO_MAX_IA / anchoOriginal, TAMANO_MAX_IA / altoOriginal, 1)
  const canvas = document.createElement('canvas')
  canvas.width  = Math.round(anchoOriginal * ratio)
  canvas.height = Math.round(altoOriginal * ratio)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(fuente, 0, 0, canvas.width, canvas.height)
  return canvas
}

/**
 * Corre COCO-SSD sobre un canvas. Si con el umbral por defecto no detecta
 * nada, reintenta con un umbral más bajo (0.1) para no quedarnos sin
 * resultado con objetos poco nítidos.
 */
export async function detectarObjetos(modelo, canvas) {
  let detecciones = await modelo.detect(canvas)
  if (!detecciones || detecciones.length === 0) {
    detecciones = await modelo.detect(canvas, 20, 0.1)
  }
  return detecciones ?? []
}

/** Carga una imagen base64 en un elemento <img> listo para dibujar. */
export function cargarImagen(base64) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload  = () => resolve(img)
    img.onerror = reject
    img.src = base64
  })
}
