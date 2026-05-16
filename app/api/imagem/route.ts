import OpenAI, { toFile } from 'openai'
import type { BriefResult, BriefFormData } from '@/lib/types'
import { SPACE_LABELS, LOCATION_LABELS } from '@/lib/types'

export async function POST(req: Request) {
  const client = new OpenAI()
  try {
    const { result, form, photoBase64, spaceAnalysis }: {
      result: BriefResult
      form: BriefFormData
      photoBase64?: string
      spaceAnalysis?: string
    } = await req.json()

    const vibeStr = result.vibe.join(', ')
    const paletteStr = result.palette.join(', ')
    const spaceLabel = SPACE_LABELS[form.tipo]
    const locationLabel = LOCATION_LABELS[form.localizacao]

    const prompt = `Redesign this ${spaceLabel} space maintaining its exact architectural structure, room proportions, window positions, and permanent elements. Apply this design concept: style ${vibeStr}, color palette ${paletteStr}, ${result.lighting} ${result.materials} Keep the same camera angle and perspective. Cozy, welcoming atmosphere. Architectural interior photography, high quality.`

    const promptNoPhoto = `Interior design render of a ${spaceLabel} in ${locationLabel}, ${form.area}m². Style: ${vibeStr}. Color palette: ${paletteStr}. ${result.lighting} ${result.materials}${spaceAnalysis ? ` Space characteristics: ${spaceAnalysis}` : ''} Cozy, welcoming atmosphere with no visual clutter. Architectural photography, natural light, high quality.`

    if (photoBase64) {
      // Strip the data URL prefix to get raw base64
      const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '')
      const imageBuffer = Buffer.from(base64Data, 'base64')
      const imageFile = await toFile(imageBuffer, 'space.png', { type: 'image/png' })

      const response = await client.images.edit({
        model: 'gpt-image-1',
        image: imageFile,
        prompt,
        n: 1,
        size: '1536x1024',
      })

      const item = response.data?.[0]
      const url = item?.url ?? (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null)
      return Response.json({ url })
    }

    // No photo — generate from scratch
    const response = await client.images.generate({
      model: 'gpt-image-1',
      prompt: promptNoPhoto,
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
