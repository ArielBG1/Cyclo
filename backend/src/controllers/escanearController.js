import Anthropic from '@anthropic-ai/sdk'
import pool from '../config/db.js'

const client = new Anthropic()

// POST /api/escanear
// Recibe una foto (base64) y le pide a Claude que identifique el material
// reciclable, devolviendo el material_id de nuestra tabla `materiales` (o 0
// si no reconoce ningún material reciclable en la foto). Reemplazó a
// CycloScan basado en COCO-SSD (TensorFlow.js) porque el modelo genérico
// daba resultados muy inconsistentes en cámaras de celular.
export async function detectarMaterial(req, res) {
  const { foto_base64 } = req.body

  if (!foto_base64) {
    return res.status(400).json({ error: 'foto_base64 es requerido' })
  }

  try {
    const materialesRes = await pool.query('SELECT id, nombre FROM materiales ORDER BY id')
    const materiales = materialesRes.rows

    const listaMateriales = materiales
      .map((m) => `${m.id} = ${m.nombre}`)
      .join(', ')

    const match       = foto_base64.match(/^data:(image\/\w+);base64,/)
    const mediaType   = match ? match[1] : 'image/jpeg'
    const base64Data  = foto_base64.replace(/^data:image\/\w+;base64,/, '')

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Data },
            },
            {
              type: 'text',
              text:
                `Esta foto fue tomada por un usuario de una app de reciclaje para identificar ` +
                `qué material reciclable está mostrando. Los materiales posibles son: ${listaMateriales}.\n\n` +
                `Identificá el objeto principal de la foto y, si corresponde claramente a uno de esos ` +
                `materiales, devolvé su ID. Si la foto no muestra ningún objeto reciclable identificable ` +
                `de esa lista (por ejemplo: personas, mascotas, paredes, comida no envasada, o el material ` +
                `no está claro), devolvé material_id 0.`,
            },
          ],
        },
      ],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              objeto_detectado: {
                type: 'string',
                description: 'Descripción breve en español de lo que se ve en la foto (ej: "botella de plástico", "caja de cartón")',
              },
              material_id: {
                type: 'integer',
                enum: [0, ...materiales.map((m) => m.id)],
                description: 'ID del material según la lista, o 0 si no coincide con ninguno',
              },
              confianza: {
                type: 'string',
                enum: ['alta', 'media', 'baja'],
              },
            },
            required: ['objeto_detectado', 'material_id', 'confianza'],
            additionalProperties: false,
          },
        },
      },
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const resultado = JSON.parse(textBlock.text)

    const material = resultado.material_id
      ? materiales.find((m) => m.id === resultado.material_id) ?? null
      : null

    res.json({
      objetoDetectado: resultado.objeto_detectado,
      materialId: material ? material.id : null,
      confianza: resultado.confianza,
    })
  } catch (err) {
    console.error('Error en detectarMaterial (CycloScan):', err)
    res.status(500).json({ error: 'No se pudo analizar la imagen. Intentá de nuevo.' })
  }
}
