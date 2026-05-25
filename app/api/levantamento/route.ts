import OpenAI from 'openai'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { buildLevantamentoPrompt } from '@/lib/prompts'
import type { BriefFormData } from '@/lib/types'
import { calcTokenCost, IMAGE_RATES, type DebugCall, type RouteDebugPayload } from '@/lib/ai-costs'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(req: Request) {
  try {
    const { photoBase64, correcao, ...formData }: BriefFormData & {
      photoBase64?: string
      correcao?: string
    } = await req.json()

    const MODEL = 'gpt-4o'
    const debugCalls: DebugCall[] = []
    let spaceAnalysis = ''

    if (photoBase64) {
      const t0 = Date.now()
      const { text, usage } = await generateText({
        model: openai(MODEL),
        messages: [{
          role: 'user',
          content: [
            { type: 'image', image: photoBase64 },
            {
              type: 'text',
              text: `You are an architectural interior designer. Analyze this photo with maximum architectural precision and describe:
1. Floor plan shape and approximate proportions
2. Estimated ceiling height and ceiling characteristics
3. Windows: position, size and quantity
4. Doors: position and quantity
5. Fixed structural elements: columns, pillars, beams, stairs, mezzanine
6. Visible finishes: floor, walls, ceiling (material and color)
7. Direction and quality of natural light

Be precise and technical — this description will be used to faithfully recreate the space.`,
            },
          ],
        }],
      })
      spaceAnalysis = text
      debugCalls.push({
        label: 'Análise de foto',
        model: MODEL,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        estimatedCostUsd: calcTokenCost(MODEL, usage.inputTokens, usage.outputTokens),
        durationMs: Date.now() - t0,
      })
    }

    const prompt = buildLevantamentoPrompt(formData, spaceAnalysis, correcao)

    const client = new OpenAI()
    const t1 = Date.now()
    const image = await client.images.generate({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1536x1024',
      quality: 'high',
    })
    const imgDuration = Date.now() - t1

    const b64 = image.data?.[0]?.b64_json
    if (!b64) return Response.json({ error: 'Sem imagem na resposta' }, { status: 500 })

    const imgCost = IMAGE_RATES['gpt-image-1:high:1536x1024'] ?? 0
    debugCalls.push({ label: 'Renderização levantamento', model: 'gpt-image-1', estimatedCostUsd: imgCost, durationMs: imgDuration })

    const _debug: RouteDebugPayload = {
      endpoint: '/api/levantamento',
      calls: debugCalls,
      totalCostUsd: debugCalls.reduce((s, c) => s + c.estimatedCostUsd, 0),
      totalDurationMs: debugCalls.reduce((s, c) => s + c.durationMs, 0),
    }

    return Response.json({
      imageUrl: `data:image/png;base64,${b64}`,
      spaceAnalysis,
      _debug,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Erro /api/levantamento:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
