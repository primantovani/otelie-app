import OpenAI from 'openai'
import type { BriefResult, BriefFormData } from '@/lib/types'
import { SPACE_LABELS, LOCATION_LABELS } from '@/lib/types'

export async function POST(req: Request) {
  const client = new OpenAI()
  try {
    const { result, form }: { result: BriefResult; form: BriefFormData } = await req.json()

    const vibeStr = result.vibe.join(', ')
    const paletteStr = result.palette.join(', ')
    const spaceLabel = SPACE_LABELS[form.tipo]
    const locationLabel = LOCATION_LABELS[form.localizacao]

    const prompt = `Interior design render of a ${spaceLabel} in ${locationLabel}, ${form.area}m². Style: ${vibeStr}. Color palette: ${paletteStr}. ${result.lighting} ${result.materials} Cozy, welcoming atmosphere with no visual clutter. Architectural photography, natural light, high quality.`

    const response = await client.images.generate({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1536x1024',
      quality: 'medium',
    })

    const item = response.data?.[0]
    const url = item?.url ?? (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null)
    return Response.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Erro /api/imagem:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
