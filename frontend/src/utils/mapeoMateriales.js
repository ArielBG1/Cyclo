// Mapeo de clases COCO-SSD → Materiales reciclables de nuestra DB
// IDs de materiales:
// 1 = Plástico PET, 2 = Vidrio, 3 = Papel, 4 = Cartón,
// 5 = Metal, 6 = Pilas y baterías, 7 = Orgánico, 8 = Electrónicos

const MAPEO = {
  1: {
    clases: ['bottle'],
    nombre: 'Plástico PET',
  },
  3: {
    clases: ['book'],
    nombre: 'Papel',
  },
  5: {
    clases: ['scissors', 'fork', 'knife', 'spoon'],
    nombre: 'Metal',
  },
  7: {
    clases: ['banana', 'apple', 'orange', 'sandwich', 'broccoli',
             'carrot', 'hot dog', 'pizza', 'donut', 'cake'],
    nombre: 'Orgánico',
  },
  8: {
    clases: ['cell phone', 'laptop', 'mouse', 'remote', 'keyboard',
             'tv', 'microwave', 'oven', 'toaster', 'refrigerator',
             'hair drier'],
    nombre: 'Electrónicos',
  },
}

const TRADUCCIONES = {
  'bottle':          'Botella',
  'cup':             'Taza/Vaso',
  'bowl':            'Tazón',
  'wine glass':      'Copa de vino',
  'book':            'Libro',
  'scissors':        'Tijeras',
  'fork':            'Tenedor',
  'knife':           'Cuchillo',
  'spoon':           'Cuchara',
  'banana':          'Banana',
  'apple':           'Manzana',
  'orange':          'Naranja',
  'sandwich':        'Sándwich',
  'broccoli':        'Brócoli',
  'carrot':          'Zanahoria',
  'hot dog':         'Pancho',
  'pizza':           'Pizza',
  'donut':           'Donut',
  'cake':            'Torta',
  'cell phone':      'Celular',
  'laptop':          'Notebook',
  'mouse':           'Mouse',
  'remote':          'Control remoto',
  'keyboard':        'Teclado',
  'tv':              'Televisor',
  'microwave':       'Microondas',
  'oven':            'Horno',
  'toaster':         'Tostadora',
  'refrigerator':    'Heladera',
  'hair drier':      'Secador de pelo',
  'person':          'Persona',
  'chair':           'Silla',
  'couch':           'Sofá',
  'bed':             'Cama',
  'dining table':    'Mesa',
  'toilet':          'Inodoro',
  'backpack':        'Mochila',
  'handbag':         'Cartera',
  'tie':             'Corbata',
  'suitcase':        'Valija',
  'umbrella':        'Paraguas',
  'sports ball':     'Pelota',
  'kite':            'Cometa',
  'baseball bat':    'Bate',
  'baseball glove':  'Guante de béisbol',
  'skateboard':      'Skate',
  'surfboard':       'Tabla de surf',
  'tennis racket':   'Raqueta',
  'cat':             'Gato',
  'dog':             'Perro',
  'bird':            'Pájaro',
  'horse':           'Caballo',
  'sheep':           'Oveja',
  'cow':             'Vaca',
  'elephant':        'Elefante',
  'bear':            'Oso',
  'zebra':           'Cebra',
  'giraffe':         'Jirafa',
  'bicycle':         'Bicicleta',
  'car':             'Auto',
  'motorcycle':      'Moto',
  'airplane':        'Avión',
  'bus':             'Colectivo',
  'train':           'Tren',
  'truck':           'Camión',
  'boat':            'Bote',
  'traffic light':   'Semáforo',
  'fire hydrant':    'Hidrante',
  'stop sign':       'Señal de pare',
  'parking meter':   'Parquímetro',
  'bench':           'Banco',
  'clock':           'Reloj',
  'vase':            'Florero',
  'teddy bear':      'Oso de peluche',
  'frisbee':         'Frisbee',
  'skis':            'Esquíes',
  'snowboard':       'Snowboard',
  'potted plant':    'Maceta',
  'sink':            'Pileta',
}

const UMBRAL_CONFIANZA = 0.20

export function traducirClase(clase) {
  if (!clase) return ''
  const claseLimpia = clase.toLowerCase().trim()
  if (TRADUCCIONES[claseLimpia]) return TRADUCCIONES[claseLimpia]
  return clase.charAt(0).toUpperCase() + clase.slice(1)
}

/**
 * Detecta el material reciclable a partir de las detecciones de COCO-SSD.
 *
 * COCO-SSD devuelve: [{ class: 'bottle', score: 0.92, bbox: [x, y, w, h] }, ...]
 *
 * @returns {{ materialId, confianza, confianza_baja, claseDetectada, claseTraducida, nombreMaterial, bbox }} | null
 */
export function detectarMaterial(detecciones) {
  if (!detecciones || detecciones.length === 0) return null

  const detLimpias = detecciones.filter((d) => d.score >= UMBRAL_CONFIANZA)
  if (detLimpias.length === 0) return null

  detLimpias.sort((a, b) => b.score - a.score)

  for (const det of detLimpias) {
    const claseDetectada = det.class.toLowerCase().trim()

    for (const [materialId, info] of Object.entries(MAPEO)) {
      if (info.clases.includes(claseDetectada)) {
        return {
          materialId:     parseInt(materialId),
          confianza:      det.score,
          confianza_baja: det.score < 0.5,
          claseDetectada: det.class,
          claseTraducida: traducirClase(det.class),
          nombreMaterial: info.nombre,
          bbox:           det.bbox,
        }
      }
    }
  }

  return null
}

/**
 * Devuelve las primeras `max` detecciones con confianza suficiente y su traducción.
 * Útil para mostrar qué detectó la IA cuando no mapea a ningún material.
 */
export function formatearDetecciones(detecciones, max = 3) {
  if (!detecciones) return []
  return detecciones
    .filter((d) => d.score >= UMBRAL_CONFIANZA)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((d) => ({
      original:  d.class,
      traducida: traducirClase(d.class),
      confianza: d.score,
      bbox:      d.bbox,
    }))
}
