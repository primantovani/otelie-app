import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { calcTokenCost, type RouteDebugPayload } from '@/lib/ai-costs'

export const maxDuration = 30

const schema = z.object({
  plantaForma: z.enum(['corredor', 'retangular', 'quadrado', 'formato-l', 'irregular'])
    .describe('Overall shape of the floor plan'),
  comprimento: z.number().nullable()
    .describe('Total depth of the space in meters — distance from the FRONT WALL (entrance) to the BACK WALL. Null if no scale reference visible.'),
  largura: z.number().nullable()
    .describe('Total width of the FRONT WALL in meters — left to right as seen from the entrance. Null if no scale reference visible.'),
  area: z.number()
    .describe('Estimated floor area in m². Use dimensions if available, else estimate from proportions assuming typical small commercial space 30-150m².'),
  peDireito: z.enum(['baixo', 'medio', 'alto']).nullable()
    .describe('Ceiling height category only if a section/elevation view is visible. baixo<2.4m, medio 2.4-3.35m, alto>3.35m. Null for plan-only images.'),
  alturaPeDireito: z.number().nullable()
    .describe('Numeric ceiling height in meters if explicitly labeled. Null otherwise.'),
  entradaPos: z.enum(['frente', 'fundo', 'lateral-esq', 'lateral-dir'])
    .describe('Main entrance position. The door is the gap in the wall WITH a quarter-circle arc (swing arc). frente=bottom/south wall, fundo=top/north, lateral-esq=left/west, lateral-dir=right/east. If multiple doors, use the widest or most prominent one facing the street.'),
  portaLargura: z.number().nullable()
    .describe('Width of the main entrance door in meters, measured from the arc radius or dimension annotation. Typical range 0.80–2.40m. Null if not measurable.'),
  janelasPos: z.enum(['so-frente', 'frente-lateral', 'so-lateral', 'sem-janelas'])
    .describe('Window positions. Windows = thin parallel lines interrupting wall WITHOUT swing arc. so-frente=front only, frente-lateral=front+one side, so-lateral=side only, sem-janelas=none visible.'),
  fachada: z.enum(['aberta', 'semi-aberta', 'fechada', 'interior']).nullable()
    .describe('Storefront type if identifiable from the drawing. Null if unclear.'),
  elementosFixos: z.array(z.enum(['pilares', 'desnivel', 'mezanino', 'escadas']))
    .describe('Fixed structural elements visible: pilares=column circles/dots, desnivel=floor level change lines, mezanino=dashed mezzanine outline, escadas=stair symbol.'),
  ambientesInternos: z.array(z.object({
    nome: z.string().describe('Room name/type: Banheiro, Copa, Depósito, Escritório, etc.'),
    posicao: z.enum(['canto-sw','canto-se','canto-nw','canto-ne','fundo-centro','lateral'])
      .describe('Location inside the main perimeter. sw=front-left, se=front-right, nw=back-left, ne=back-right.'),
    largura: z.number().nullable().describe('Room width in meters parallel to front/back wall. Null if not measurable.'),
    profundidade: z.number().nullable().describe('Room depth in meters parallel to side walls. Null if not measurable.'),
  })).describe('Internal rooms defined by partition walls inside the main perimeter. Empty array if no internal subdivisions visible.'),
  confidence: z.enum(['high', 'medium', 'low'])
    .describe('Overall confidence in the extraction.'),
  notes: z.string()
    .describe('One sentence in Portuguese describing what was identified in the sketch.'),
})

const PROMPT = `Você é um arquiteto experiente analisando um croqui de planta baixa de um espaço comercial (café, bistrô ou sorveteria).

PASSO 1 — Identifique as paredes externas (perímetro) e as paredes internas (divisórias).
PASSO 2 — Localize as PORTAS: uma porta é representada por um vão na parede + um arco de quarto de círculo (o traço da folha girando). O raio do arco = largura da porta. Se houver cota de dimensão sobre o vão, use esse valor.
PASSO 3 — Localize as JANELAS: interrupção fina na parede SEM arco, geralmente com duas linhas paralelas.
PASSO 4 — Determine a posição da entrada principal (porta voltada para a rua/fachada).
PASSO 5 — Leia as cotas: extraia comprimento (profundidade frente→fundo) e largura (largura da parede de entrada, esquerda→direita). Se as cotas estiverem anotadas como "8,00 × 6,00m", a primeira medida horizontal (paralela à entrada) é a largura; a vertical (da entrada ao fundo) é o comprimento.
PASSO 6 — Identifique ambientes internos: áreas delimitadas por paredes internas dentro do perímetro. Para cada ambiente, determine: nome (Banheiro, Copa, Depósito…), posição no espaço (canto-sw/se/nw/ne, fundo-centro, lateral) e dimensões se legíveis.

Convenções brasileiras de planta baixa:
- Orientação padrão: Sul = parte inferior, Norte = parte superior
- Porta = vão + arco de giro (¼ de círculo)
- Janela = interrupção com duas linhas finas paralelas, sem arco
- Pilar = círculo preenchido ou quadrado pequeno
- Escada = linhas paralelas com seta indicando subida
- Mezanino = retângulo tracejado em nível elevado
- Cotas = linhas com setas nas extremidades e número no meio (em metros ou cm)

Se houver cotas em centímetros (ex: 90, 120), converta para metros (0.90, 1.20).
Se não houver escala, estime considerando que um café típico tem 30-120m² e portas comerciais têm 0.90-1.20m.

REGRAS DE CONSERVADORISMO:
- janelasPos: use 'sem-janelas' a menos que você veja CLARAMENTE duas linhas paralelas interrompendo a parede (sem arco). Na dúvida, sem-janelas.
- elementosFixos: inclua somente elementos que você vê explicitamente desenhados. Array vazio [] se nenhum.
- Prefira null a um valor incorreto em qualquer campo numérico.`

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = await req.json()
    if (!imageBase64) return NextResponse.json({ error: 'Imagem obrigatória' }, { status: 400 })

    const t0 = Date.now()
    const MODEL = 'claude-opus-4-5'
    const { object, usage } = await generateObject({
      model: anthropic(MODEL),
      schema,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            image: imageBase64,
            mediaType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
          },
          { type: 'text', text: PROMPT },
        ],
      }],
    })
    const durationMs = Date.now() - t0

    const cost = calcTokenCost(MODEL, usage.inputTokens, usage.outputTokens)
    const _debug: RouteDebugPayload = {
      endpoint: '/api/analisar-croqui',
      calls: [{
        label: 'Analisar croqui',
        model: MODEL,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        estimatedCostUsd: cost,
        durationMs,
      }],
      totalCostUsd: cost,
      totalDurationMs: durationMs,
    }

    return NextResponse.json({ ...object, _debug })
  } catch (err) {
    console.error('[analisar-croqui]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao analisar croqui' },
      { status: 500 }
    )
  }
}
