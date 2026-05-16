import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { buildPrompt } from '@/lib/prompts'
import type { BriefFormData } from '@/lib/types'

const BriefSchema = z.object({
  vibe: z.array(z.string()).describe('3-4 palavras que descrevem a atmosfera'),
  palette: z.array(z.string()).describe('3-4 cores hex complementares'),
  lighting: z.string().describe('Descrição simples da iluminação ideal'),
  materials: z.string().describe('Materiais recomendados para piso, parede e bancada'),
  acoustics: z.string().describe('Como tornar o ambiente acusticamente confortável'),
  layout: z.string().describe('Como organizar o espaço para que flua bem'),
})

export async function POST(req: Request) {
  try {
    const data: BriefFormData = await req.json()

    const { object } = await generateObject({
      model: openai('gpt-4o'),
      schema: BriefSchema,
      prompt: buildPrompt(data),
    })

    return Response.json(object)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Erro /api/gerar:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
