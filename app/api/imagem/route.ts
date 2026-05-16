import OpenAI from 'openai'
import type { BriefResult, BriefFormData } from '@/lib/types'
import { SPACE_LABELS, LOCATION_LABELS } from '@/lib/types'

export async function POST(req: Request) {
  const client = new OpenAI()
  try {
    const { result, form, spaceAnalysis }: {
      result: BriefResult
      form: BriefFormData
      photoBase64?: string
      spaceAnalysis?: string
    } = await req.json()

    const vibeStr = result.vibe.join(', ')
    const paletteStr = result.palette.join(', ')
    const spaceLabel = SPACE_LABELS[form.tipo]
    const locationLabel = LOCATION_LABELS[form.localizacao]

    const spaceDescription = spaceAnalysis
      ? `Space layout (based on real photo): ${spaceAnalysis}`
      : `${spaceLabel} in ${locationLabel}, approximately ${form.area}m²`

    const prompt = `Architectural interior render of a ${spaceLabel}.
${spaceDescription}
Design concept: style ${vibeStr}, color palette ${paletteStr}.
${result.lighting} ${result.materials}
Reproduce the exact room proportions, window positions, ceiling height, structural columns, and camera perspective described above. Only change the finishes, materials, furniture and decor to match the design concept.
Photorealistic architectural photography, natural light, no people, high quality.`

    const response = await client.images.generate({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1536x1024',
      quality: 'high',
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
