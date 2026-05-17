import OpenAI from 'openai'
import type { BriefResult, BriefFormData } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { result, form, spaceAnalysis }: {
    result: BriefResult
    form: BriefFormData
    spaceAnalysis?: string
  } = await req.json()

  const client = new OpenAI()

  const prompt = result.scenePrompt
    + (spaceAnalysis ? ` Existing space structure: ${spaceAnalysis}` : '')

  try {
    const image = await client.images.generate({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1536x1024',
      quality: 'high',
    })

    const b64 = image.data?.[0]?.b64_json
    if (!b64) return Response.json({ error: 'Sem imagem na resposta' }, { status: 500 })

    return Response.json({ url: `data:image/png;base64,${b64}` })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Erro /api/imagem:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
