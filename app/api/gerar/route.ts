import { generateObject, generateText } from 'ai'
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
    const { photoBase64, ...formData }: BriefFormData & { photoBase64?: string } = await req.json()

    let spaceAnalysis = ''

    if (photoBase64) {
      const { text } = await generateText({
        model: openai('gpt-4o'),
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              image: photoBase64,
            },
            {
              type: 'text',
              text: `Você é um arquiteto de interiores. Analise esta foto com máxima precisão arquitetônica e descreva:
1. Formato da planta baixa (retangular, irregular, L-shape, etc.) e proporções aproximadas
2. Pé-direito (baixo <2.5m / médio 2.5-3.5m / alto >3.5m) e características do teto
3. Janelas: quantidade, posição nas paredes (frente/lateral/fundo), tamanho e altura do chão
4. Portas: posição e quantidade
5. Elementos estruturais fixos: colunas, pilares, vigas, escadas, mezanino
6. Direção e qualidade da luz natural
7. Ângulo e perspectiva da foto (frontal, diagonal, de canto, etc.)

Seja preciso e técnico — esta descrição será usada para recriar o espaço fielmente em uma proposta de design.`,
            },
          ],
        }],
      })
      spaceAnalysis = text
    }

    const { object } = await generateObject({
      model: openai('gpt-4o'),
      schema: BriefSchema,
      prompt: buildPrompt(formData, spaceAnalysis),
    })

    return Response.json({ ...object, spaceAnalysis })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Erro /api/gerar:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
