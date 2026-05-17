import { generateObject, generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { buildPrompt } from '@/lib/prompts'
import type { BriefFormData } from '@/lib/types'

function buildSchema(olharOtelie?: string) {
  return z.object({
    vibe: z.array(z.string()).describe('3-4 words describing the atmosphere'),
    palette: z.array(z.string()).describe('3-4 complementary hex colors'),
    lighting: z.string().describe('Simple description of the ideal lighting setup'),
    materials: z.string().describe('Recommended materials for floor, walls and counters'),
    acoustics: z.string().describe('How to make the space acoustically comfortable'),
    layout: z.string().describe('How to organize the space for good flow'),
    plantaPrompt: z.string().describe(`
      Prompt in English for generating a schematic 2D architectural floor plan (strictly top-down view).

      MANDATORY RULES:
      - Strictly top-down (plan) view — never perspective, never 3D elements
      - Black lines on white background, clean technical architectural diagram style
      - Walls as thick lines; door openings with swing arc; windows as thin double lines on walls
      - Furniture as simple labeled shapes: counter, table, chair, display case, etc.
      - Proportions must match room shape (corridor=elongated, square=equal sides, L=two connected rectangles)
      - Furniture arrangement must match the layout description
      - Main entrance door at the correct position
      - No shading, no colors, no perspective shadows, no people
      - No watermarks, no text beyond minimal furniture labels

      Include: room outline, entrance position, windows, furniture layout.
      Max 80 words.
    `),
    scenePrompt: z.string().describe(`
      Prompt em inglês para geração de imagem arquitetônica realista do espaço.
      Deve descrever a cena com precisão para evitar erros comuns de IA.

      MANDATORY RULES — never violate these:
      - Include ONLY furniture and elements typical of the stated space type (shop≠restaurant, studio≠café)
      - No table without seating; no seat without a table or surface nearby
      - Lighting fixtures in proportion: max 1 per 40 sq ft of visible ceiling
      - Furniture at realistic scale — neither oversized nor tiny
      - Respect ceiling height: low=compact/cozy, high=vertical/spacious
      - Visible circulation paths between furniture
      - If a real space is described: preserve walls, windows and columns — change only finishes and furniture
      - Natural light consistent with window positions
      - Coherent perspective and scale — no floating or impossible elements
      - Doors and openings only where explicitly described — never invent doors, windows or passages
      ${olharOtelie ? `
      CLIENT INSTRUCTIONS — highest priority, must appear explicitly in the scene:
      ${olharOtelie}
      ` : ''}
      Include: space type, visual style, color palette, floor/wall materials, lighting type, furniture with quantity and arrangement, photographic quality.
      Do not include: people, text, brands, watermarks.
      Max 150 words.
    `),
  })
}

export async function POST(req: Request) {
  try {
    const { photoBase64, preSpaceAnalysis, ...formData }: BriefFormData & {
      photoBase64?: string
      preSpaceAnalysis?: string
    } = await req.json()

    let spaceAnalysis = preSpaceAnalysis ?? ''

    if (photoBase64 && !preSpaceAnalysis) {
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
      schema: buildSchema(formData.olharOtelie),
      prompt: buildPrompt(formData, spaceAnalysis),
    })

    return Response.json({ ...object, spaceAnalysis })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Erro /api/gerar:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
