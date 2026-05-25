import { NextRequest, NextResponse } from 'next/server'
import { generateObject, generateImage } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { calcTokenCost, type RouteDebugPayload } from '@/lib/ai-costs'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const conceptSchema = z.object({
  atmosfera: z.object({
    paleta: z.array(z.string()).length(5).describe('5 códigos hex que formam a paleta de cores do espaço redesenhado'),
    temperaturaLuz: z.string().describe('Temperatura e tipo de iluminação proposta'),
    materiais: z.array(z.string()).min(3).max(6).describe('Materiais propostos para o redesign'),
    descricao: z.string().describe('Parágrafo descrevendo a nova atmosfera'),
  }),
  ritmoVisual: z.object({
    descricao: z.string().describe('Parágrafo sobre ritmo visual e disposição dos elementos'),
    circulacao: z.string().describe('Descrição do fluxo de circulação proposto'),
    pontosFocais: z.array(z.string()).min(2).max(4).describe('Pontos focais do espaço'),
  }),
  presencaEmocional: z.object({
    conceito: z.string().describe('Frase conceitual impactante — o DNA emocional do espaço'),
    palavrasChave: z.array(z.string()).min(4).max(7).describe('Palavras-chave do conceito'),
    storytelling: z.string().describe('Narrativa do espaço — a história que ele conta'),
  }),
  sensoryConcept: z.object({
    materiais: z.array(z.string()).min(3).max(5).describe('Materiais propostos com descrição tátil'),
    texturas: z.array(z.string()).min(3).max(5).describe('Texturas previstas no projeto'),
    trilhaSonora: z.string().describe('Sugestão de estilo/gênero musical para o ambiente'),
    fragrancia: z.string().describe('Notas olfativas ou fragrância sugerida para o espaço'),
    descricao: z.string().describe('Parágrafo descrevendo a experiência sensorial completa'),
  }),
  imagePrompt: z.string().describe('Detailed English prompt for image generation: photorealistic interior design render, architectural visualization, professional photography style, describe the specific space with all materials, lighting, atmosphere and style proposed'),
})

function buildContext(existente: Record<string, unknown>, necessidades: Record<string, unknown>, fotoAnalise: Record<string, unknown> | null): string {
  const parts: string[] = []

  if (existente) {
    const e = existente
    const lines = []
    if (e.area)           lines.push(`Área: ${e.area}m²`)
    if (e.comprimento && e.largura) lines.push(`Dimensões: ${e.comprimento}×${e.largura}m`)
    if (e.alturaPeDireito) lines.push(`Pé-direito: ${e.alturaPeDireito}m`)
    if (e.plantaForma)    lines.push(`Forma da planta: ${e.plantaForma}`)
    if (e.pisoTipo)       lines.push(`Piso atual: ${e.pisoTipo}`)
    if (e.paredeTipo)     lines.push(`Paredes atuais: ${e.paredeTipo}`)
    if (e.tetoTipo)       lines.push(`Teto atual: ${e.tetoTipo}`)
    if (e.entradaPos)     lines.push(`Entrada: ${e.entradaPos}`)
    if (e.janelasPos)     lines.push(`Janelas: ${e.janelasPos}`)
    if (Array.isArray(e.elementosFixos) && e.elementosFixos.length) lines.push(`Elementos fixos: ${(e.elementosFixos as string[]).join(', ')}`)
    if (lines.length) parts.push(`ESPAÇO EXISTENTE:\n${lines.join('\n')}`)
  }

  if (fotoAnalise) {
    const f = fotoAnalise
    const lines = []
    if (f.estiloAtual)  lines.push(`Estilo atual: ${f.estiloAtual}`)
    if (f.condicao)     lines.push(`Condição: ${f.condicao}`)
    if (Array.isArray(f.palavrasChave) && f.palavrasChave.length) lines.push(`Características: ${(f.palavrasChave as string[]).join(', ')}`)
    if (f.observacoes)  lines.push(`Observações: ${f.observacoes}`)
    if (lines.length) parts.push(`ANÁLISE DAS FOTOS DO ESPAÇO:\n${lines.join('\n')}`)
  }

  if (necessidades) {
    const n = necessidades
    const lines = []
    if (n.tipoUso)      lines.push(`Tipo de uso: ${n.tipoUso}`)
    if (Array.isArray(n.perfilPublico) && n.perfilPublico.length) lines.push(`Público-alvo: ${(n.perfilPublico as string[]).join(', ')}`)
    if (n.capacidade)   lines.push(`Capacidade desejada: ${n.capacidade}`)
    if (Array.isArray(n.palavrasChave) && n.palavrasChave.length) lines.push(`Palavras-chave desejadas: ${(n.palavrasChave as string[]).join(', ')}`)
    if (n.restricoes)   lines.push(`Restrições: ${n.restricoes}`)
    if (n.orcamento)    lines.push(`Orçamento estimado: ${n.orcamento}`)
    if (n.prazo)        lines.push(`Prazo: ${n.prazo}`)
    if (lines.length) parts.push(`LEVANTAMENTO DAS NECESSIDADES:\n${lines.join('\n')}`)
  }

  return parts.join('\n\n')
}

const IMAGE_MODEL = 'gemini-2.5-flash-image'

export async function POST(req: NextRequest) {
  try {
    const { existente, necessidades, fotoAnalise } = await req.json()

    const context = buildContext(existente ?? {}, necessidades ?? {}, fotoAnalise)

    const TEXT_MODEL = 'claude-opus-4-5'
    const t0 = Date.now()

    const { object: conceptData, usage } = await generateObject({
      model: anthropic(TEXT_MODEL),
      schema: conceptSchema,
      system: `Você é OTELIE, consultoria premium de design de interiores comerciais.
Crie propostas de Concept Redesign™ — transformações que criam nova atmosfera, ritmo visual e presença emocional.
Seja criativo, específico e profissional. Responda sempre em português brasileiro.
Para o imagePrompt, escreva em inglês com o máximo de detalhes visuais.`,
      messages: [{
        role: 'user',
        content: `Com base nos dados abaixo, crie um Concept Redesign™ completo para este espaço comercial:\n\n${context}`,
      }],
    })

    const textDuration = Date.now() - t0
    const textCost = calcTokenCost(TEXT_MODEL, usage.inputTokens, usage.outputTokens)

    // Generate image — optional: concept text is returned even if image fails
    let b64 = ''
    let imgDuration = 0
    let imgCost = 0
    try {
      const t1 = Date.now()
      const imgResult = await generateImage({
        model: google.image(IMAGE_MODEL),
        prompt: conceptData.imagePrompt,
        aspectRatio: '1:1',
      })
      imgDuration = Date.now() - t1
      imgCost = 0.04
      b64 = imgResult.image.base64
    } catch (imgErr) {
      console.warn('[concept] image generation failed, returning text-only concept:', imgErr)
    }

    const concept = {
      atmosfera: conceptData.atmosfera,
      ritmoVisual: conceptData.ritmoVisual,
      presencaEmocional: conceptData.presencaEmocional,
      redesignIA: {
        prompt: conceptData.imagePrompt,
        imagemUrl: b64 ? `data:image/png;base64,${b64}` : '',
      },
      sensoryConcept: conceptData.sensoryConcept,
    }

    const _debug: RouteDebugPayload = {
      endpoint: '/api/concept',
      calls: [
        { label: 'Concept text (Claude)', model: TEXT_MODEL, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, estimatedCostUsd: textCost, durationMs: textDuration },
        ...(imgDuration ? [{ label: `Concept image (${IMAGE_MODEL})`, model: IMAGE_MODEL, estimatedCostUsd: imgCost, durationMs: imgDuration }] : []),
      ],
      totalCostUsd: textCost + imgCost,
      totalDurationMs: Date.now() - t0,
    }

    return NextResponse.json({ concept, _debug })
  } catch (err) {
    console.error('[concept]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro ao gerar concept' }, { status: 500 })
  }
}
