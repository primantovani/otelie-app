import OpenAI from 'openai'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { buildLevantamentoPrompt } from '@/lib/prompts'
import type { BriefFormData } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { photoBase64, correcao, ...formData }: BriefFormData & {
      photoBase64?: string
      correcao?: string
    } = await req.json()

    let spaceAnalysis = ''

    if (photoBase64) {
      const { text } = await generateText({
        model: openai('gpt-4o'),
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
    }

    const prompt = buildLevantamentoPrompt(formData, spaceAnalysis, correcao)

    const client = new OpenAI()
    const image = await client.images.generate({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1536x1024',
      quality: 'high',
    })

    const b64 = image.data?.[0]?.b64_json
    if (!b64) return Response.json({ error: 'Sem imagem na resposta' }, { status: 500 })

    return Response.json({
      imageUrl: `data:image/png;base64,${b64}`,
      spaceAnalysis,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Erro /api/levantamento:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
