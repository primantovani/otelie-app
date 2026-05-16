import type { BriefFormData } from './types'
import {
  SPACE_LABELS, BUDGET_LABELS, LOCATION_LABELS,
  ESTADO_LABELS, LUZ_LABELS, PE_LABELS, PUBLICO_LABELS, PRIORIDADE_LABELS,
} from './types'

export function buildPrompt(data: BriefFormData, spaceAnalysis?: string): string {
  return `Você é um designer de interiores especializado em pequenos negócios.
Gere um conceito de design acolhedor e com identidade própria para o seguinte espaço:

INFORMAÇÕES DO ESPAÇO:
- Tipo: ${SPACE_LABELS[data.tipo]}
- Área: ${data.area}m²${data.comprimento && data.largura ? ` (${data.comprimento}m × ${data.largura}m)` : ''}
- Pé-direito: ${PE_LABELS[data.peDireito]}${data.alturaPeDireito ? ` — ${data.alturaPeDireito}m` : ''}
- Luz natural: ${LUZ_LABELS[data.luzNatural]}
- Estado atual: ${ESTADO_LABELS[data.estadoAtual]}
- Capacidade desejada: ${data.capacidade} lugares

REFORMA:
- Orçamento: ${BUDGET_LABELS[data.orcamento]}
- Prioridade: ${PRIORIDADE_LABELS[data.prioridade]}

IDENTIDADE:
- Estilo desejado: ${data.vibe}
- Público-alvo: ${PUBLICO_LABELS[data.publicoAlvo]}
- Localização: ${LOCATION_LABELS[data.localizacao]}
${data.observacoes ? `- Observações: ${data.observacoes}` : ''}
${spaceAnalysis ? `\nAnálise do espaço real (foto enviada pelo cliente):\n${spaceAnalysis}` : ''}

IMPORTANTE:
- Use linguagem simples, sem jargão técnico
- Foco em ambientes acolhedores, sem grandes estímulos visuais
- Alinhado ao orçamento e à prioridade de reforma informados
- Respostas curtas e diretas (2-3 frases por seção)
- Paleta: retorne 3-4 cores hex complementares ao estilo e ao público-alvo
- Vibe: 3-4 palavras que descrevem a atmosfera
- Leve em conta o pé-direito e a luz natural nas recomendações de iluminação e layout
- Considere a capacidade desejada de ${data.capacidade} lugares no layout
${data.comprimento && data.largura ? `- Use as medidas exatas ${data.comprimento}m × ${data.largura}m para calcular a distribuição de mesas e circulação` : ''}${data.alturaPeDireito ? `- O pé-direito de ${data.alturaPeDireito}m deve influenciar as recomendações de iluminação e sensação de amplitude` : ''}
${spaceAnalysis ? '- Leve em conta as características físicas reais do espaço na análise acima' : ''}
`
}
