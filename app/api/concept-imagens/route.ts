import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { fal } from '@fal-ai/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Flux Canny via fal.ai — control image enforces exact geometry
const FAL_CANNY_MODEL = 'fal-ai/flux-canny'

function buildConceptSummary(concept: Record<string, unknown>): string {
  const lines: string[] = []
  const atm = concept.atmosfera as Record<string, unknown> | undefined
  const sens = concept.sensoryConcept as Record<string, unknown> | undefined
  const pres = concept.presencaEmocional as Record<string, unknown> | undefined
  if (atm) {
    if (Array.isArray(atm.paleta))    lines.push(`Color palette (hex): ${(atm.paleta as string[]).join(', ')}`)
    if (atm.temperaturaLuz)           lines.push(`Lighting: ${atm.temperaturaLuz}`)
    if (Array.isArray(atm.materiais)) lines.push(`Materials: ${(atm.materiais as string[]).join(', ')}`)
    if (atm.descricao)                lines.push(`Atmosphere: ${atm.descricao}`)
  }
  if (sens) {
    if (Array.isArray(sens.texturas)) lines.push(`Textures: ${(sens.texturas as string[]).join(', ')}`)
  }
  if (pres) {
    if (pres.conceito)                lines.push(`Concept DNA: ${pres.conceito}`)
    if (Array.isArray(pres.palavrasChave)) lines.push(`Keywords: ${(pres.palavrasChave as string[]).join(', ')}`)
  }
  return lines.join('\n')
}

// Run Flux Canny via fal.ai — control image enforces exact geometry
async function fluxCanny(
  controlImageBase64: string,
  controlMime: string,
  prompt: string,
): Promise<string> {
  fal.config({ credentials: process.env.FAL_KEY })

  const result = await fal.subscribe(FAL_CANNY_MODEL, {
    input: {
      prompt,
      image_url: `data:${controlMime};base64,${controlImageBase64}`,
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
    },
  }) as unknown as { images: Array<{ url: string }> }

  const imageUrl = result.images?.[0]?.url
  if (!imageUrl) throw new Error('No image returned from fal.ai')

  const res = await fetch(imageUrl)
  const buf = await res.arrayBuffer()
  return Buffer.from(buf).toString('base64')
}

// Phase 0: spatial brief (Claude reads both inputs)
async function buildSpatialBrief(plantaB64: string, fundoB64: string, spaceData: string): Promise<string> {
  const { text } = await generateText({
    model: anthropic('claude-opus-4-5'),
    messages: [{
      role: 'user',
      content: [
        { type: 'image', image: plantaB64, mediaType: 'image/jpeg' },
        { type: 'image', image: fundoB64,  mediaType: 'image/jpeg' },
        {
          type: 'text',
          text: `Image 1: exact SVG floor plan of a commercial space (programmatically generated — precise geometry).
Image 2: 3D render, camera inside room facing the back wall (fundo).
Space data: ${spaceData}

Write a concise SPATIAL BRIEF:
- Room dimensions (width × depth × height)
- Entrance: which wall, door width
- Windows: which walls
- Fixed elements
- Camera height and distance for the fundo perspective

100–130 words. This is the geometric ground truth.`,
        },
      ],
    }],
  })
  return text.trim()
}

// Phase 1: Claude writes the planta concept prompt
async function buildPlantaPrompt(
  plantaB64: string,
  spatialBrief: string,
  conceptSummary: string,
): Promise<string> {
  const { text } = await generateText({
    model: anthropic('claude-opus-4-5'),
    messages: [{
      role: 'user',
      content: [
        { type: 'image', image: plantaB64, mediaType: 'image/jpeg' },
        {
          type: 'text',
          text: `This is a precise architectural floor plan of a commercial space (SVG-generated, exact geometry).

Spatial reference: ${spatialBrief}

Design concept: ${conceptSummary}

Write a Flux image generation prompt for a TOP-DOWN bird's-eye view of this space fully furnished.

Rules:
- Must specify: "top-down bird's eye view, directly overhead camera, architectural visualization"
- Describe furniture as seen from above (circles for tables, rectangles for counters/benches)
- Apply concept materials on visible floor surface
- Include ceiling fixtures as seen from above
- Do NOT describe perspective, vanishing points, or interior shots

Write ONLY the prompt. 120–160 words.`,
        },
      ],
    }],
  })
  return text.trim()
}

// Phase 2a: extract furniture layout from concept planta
async function extractLayout(conceptPlantaB64: string, spatialBrief: string): Promise<string> {
  const { text } = await generateText({
    model: anthropic('claude-opus-4-5'),
    messages: [{
      role: 'user',
      content: [
        { type: 'image', image: conceptPlantaB64, mediaType: 'image/png' },
        {
          type: 'text',
          text: `This is a furnished top-down floor plan. Spatial reference: ${spatialBrief}

List every furniture piece with its wall-relative position (fundo=back, frente=front, esq=left, dir=right):

Format:
COUNTER: [wall], [approx length]
TABLES: [count], [shape], [positions]
SEATING: [type], [positions]
LIGHTING: [fixtures overhead]
OTHER: [plants, displays, etc.]

Be precise and brief.`,
        },
      ],
    }],
  })
  return text.trim()
}

// Phase 2b: Claude writes the fundo concept prompt using layout as reference
async function buildFundoPrompt(
  fundoB64: string,
  conceptPlantaB64: string,
  furnitureLayout: string,
  spatialBrief: string,
  conceptSummary: string,
): Promise<string> {
  const { text } = await generateText({
    model: anthropic('claude-opus-4-5'),
    messages: [{
      role: 'user',
      content: [
        { type: 'image', image: fundoB64,        mediaType: 'image/jpeg' },
        { type: 'image', image: conceptPlantaB64, mediaType: 'image/png' },
        {
          type: 'text',
          text: `Image 1: 3D render of empty room, camera inside facing the BACK WALL (fundo perspective).
Image 2: completed floor plan of the SAME room.

Spatial reference: ${spatialBrief}
Furniture layout: ${furnitureLayout}
Design concept: ${conceptSummary}

Write a Flux image generation prompt for a photorealistic interior design render from the fundo perspective.

Rules:
- Must specify: "interior perspective view, camera facing back wall, eye-level perspective"
- Translate the floor plan layout to 3D perspective:
  * furniture near front wall = foreground
  * furniture near back wall = background/deep
  * left wall items appear on left, right wall items on right
- Apply concept materials, lighting, atmosphere
- Keep exact room proportions from Image 1

Write ONLY the prompt. 160–200 words.`,
        },
      ],
    }],
  })
  return text.trim()
}

export async function POST(req: NextRequest) {
  try {
    const { views, concept, existente, necessidades } = await req.json() as {
      views: Record<string, string>
      concept: Record<string, unknown>
      existente?: Record<string, unknown>
      necessidades?: Record<string, unknown>
    }

    if (!views?.planta || !views?.fundo) {
      return NextResponse.json({ error: 'Vistas planta e fundo são obrigatórias' }, { status: 400 })
    }

    const conceptSummary = buildConceptSummary(concept)

    const spaceLines: string[] = []
    if (existente) {
      if (existente.area)            spaceLines.push(`Area: ${existente.area}m²`)
      if (existente.alturaPeDireito) spaceLines.push(`Ceiling height: ${existente.alturaPeDireito}m`)
      if (existente.pisoTipo)        spaceLines.push(`Floor: ${existente.pisoTipo}`)
      if (existente.paredeTipo)      spaceLines.push(`Walls: ${existente.paredeTipo}`)
    }
    if (necessidades) {
      if (necessidades.tipoUso) spaceLines.push(`Use: ${necessidades.tipoUso}`)
      if (Array.isArray(necessidades.palavrasChave)) spaceLines.push(`Style: ${(necessidades.palavrasChave as string[]).join(', ')}`)
    }
    const spaceData = spaceLines.join('\n')

    // Phase 0: spatial brief
    const spatialBrief = await buildSpatialBrief(views.planta, views.fundo, spaceData)

    // Phase 1: planta concept prompt → Flux Canny with SVG floor plan as control
    const plantaPrompt = await buildPlantaPrompt(views.planta, spatialBrief, conceptSummary)
    const conceptPlantaB64 = await fluxCanny(views.planta, 'image/jpeg', plantaPrompt)

    // Phase 2a: extract layout from concept planta
    const furnitureLayout = await extractLayout(conceptPlantaB64, spatialBrief)

    // Phase 2b: fundo concept prompt → Flux Canny with 3D render as control
    const fundoPrompt = await buildFundoPrompt(
      views.fundo, conceptPlantaB64, furnitureLayout, spatialBrief, conceptSummary
    )
    const conceptFundoB64 = await fluxCanny(views.fundo, 'image/jpeg', fundoPrompt)

    return NextResponse.json({
      images: {
        planta: `data:image/png;base64,${conceptPlantaB64}`,
        fundo:  `data:image/png;base64,${conceptFundoB64}`,
      },
      enhancedImages: {
        planta: `data:image/jpeg;base64,${views.planta}`,
        fundo:  `data:image/jpeg;base64,${views.fundo}`,
      },
      spatialBrief,
      furnitureLayout,
      prompts: { planta: plantaPrompt, fundo: fundoPrompt },
    })
  } catch (err) {
    console.error('[concept-imagens]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao gerar imagens' },
      { status: 500 },
    )
  }
}
