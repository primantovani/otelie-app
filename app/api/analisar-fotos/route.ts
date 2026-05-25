import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { calcTokenCost, type RouteDebugPayload } from '@/lib/ai-costs'

export const maxDuration = 60

const schema = z.object({
  pisoTipo: z.enum(['cimento-queimado', 'ceramica', 'madeira', 'vinilico', 'pedra', 'outro']).nullable()
    .describe('Tipo de piso identificado na foto, null se não visível'),
  paredeTipo: z.enum(['reboco-pintado', 'tijolo-aparente', 'azulejo', 'drywall', 'outro']).nullable()
    .describe('Acabamento das paredes, null se não visível'),
  tetoTipo: z.enum(['laje-aparente', 'forro-gesso', 'forro-madeira', 'steel-deck', 'outro']).nullable()
    .describe('Tipo de teto, null se não visível'),
  estiloAtual: z.string()
    .describe('Uma palavra ou expressão curta: industrial, contemporâneo, rústico, minimalista, clássico, neutro...'),
  condicao: z.string()
    .describe('Estado de conservação: bom estado, precisa de atualização, deteriorado, obra bruta...'),
  palavrasChave: z.array(z.string()).min(3).max(8)
    .describe('Palavras-chave que descrevem o ambiente atual para informar o redesign'),
  observacoes: z.string()
    .describe('Parágrafo curto com observações relevantes para um projeto de redesign: pontos fortes, pontos fracos, oportunidades'),
})

const PROMPT = `Você é OTELIE, uma especialista em design de interiores comerciais, analisando fotos de um espaço existente para subsidiar uma proposta de Concept Redesign™.

Observe atentamente a foto e identifique:
1. Materiais e acabamentos visíveis (piso, paredes, teto)
2. O estilo atual predominante
3. O estado de conservação
4. Características relevantes para um projeto de redesign

Seja específico e técnico. Sua análise alimentará diretamente a proposta criativa da OTELIE.`

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
      endpoint: '/api/analisar-fotos',
      calls: [{ label: 'Análise de fotos', model: MODEL, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, estimatedCostUsd: cost, durationMs }],
      totalCostUsd: cost,
      totalDurationMs: durationMs,
    }

    return NextResponse.json({ analise: object, _debug })
  } catch (err) {
    console.error('[analisar-fotos]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro na análise' }, { status: 500 })
  }
}
