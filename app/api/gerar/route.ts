import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
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
  const data: BriefFormData = await req.json()

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    schema: BriefSchema,
    prompt: buildPrompt(data),
  })

  return Response.json(object)
}
