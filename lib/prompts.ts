import type { BriefFormData } from './types'
import { SPACE_LABELS, BUDGET_LABELS, LOCATION_LABELS } from './types'

export function buildPrompt(data: BriefFormData): string {
  return `Você é um designer de interiores especializado em pequenos negócios.
Gere um conceito de design acolhedor e com identidade própria para o seguinte espaço:

- Tipo: ${SPACE_LABELS[data.tipo]}
- Área: ${data.area}m²
- Orçamento: ${BUDGET_LABELS[data.orcamento]}
- Estilo desejado: ${data.vibe}
- Localização: ${LOCATION_LABELS[data.localizacao]}
${data.observacoes ? `- Observações: ${data.observacoes}` : ''}

IMPORTANTE:
- Use linguagem simples, sem jargão técnico
- Foco em ambientes acolhedores, sem grandes estímulos visuais
- Alinhado ao orçamento informado
- Respostas curtas e diretas (2-3 frases por seção)
- Paleta: retorne 3-4 cores hex complementares ao estilo
- Vibe: 3-4 palavras que descrevem a atmosfera
`
}
