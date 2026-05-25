import OpenAI from 'openai'
import { IMAGE_RATES, type RouteDebugPayload } from '@/lib/ai-costs'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(req: Request) {
  try {
    const { plantaPrompt }: { plantaPrompt: string } = await req.json()

    const client = new OpenAI()
    const t0 = Date.now()
    const image = await client.images.generate({
      model: 'gpt-image-1',
      prompt: plantaPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'medium',
    })
    const durationMs = Date.now() - t0

    const b64 = image.data?.[0]?.b64_json
    if (!b64) return Response.json({ error: 'Sem imagem na resposta' }, { status: 500 })

    const cost = IMAGE_RATES['gpt-image-1:medium:1024x1024'] ?? 0
    const _debug: RouteDebugPayload = {
      endpoint: '/api/planta',
      calls: [{ label: 'Geração de planta', model: 'gpt-image-1', estimatedCostUsd: cost, durationMs }],
      totalCostUsd: cost,
      totalDurationMs: durationMs,
    }

    return Response.json({ url: `data:image/png;base64,${b64}`, _debug })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Erro /api/planta:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
