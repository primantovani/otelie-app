export type SpaceType = 'cafe' | 'loja' | 'bar' | 'restaurante' | 'studio'
export type Budget = 'ate50k' | '50k-150k' | '150k-300k' | 'acima300k'
export type Location = 'terreo-urbano' | 'shopping' | 'rua-bairro' | 'outro'
export type EstadoAtual = 'obra-bruta' | 'ja-funciona' | 'precisa-refresh'
export type LuzNatural = 'muita' | 'moderada' | 'pouca'
export type PeDireito = 'baixo' | 'medio' | 'alto'
export type PublicoAlvo = 'jovem-casual' | 'corporativo' | 'familia' | 'turista'
export type Prioridade = 'completa' | 'moveis-decor' | 'iluminacao'

export interface BriefFormData {
  tipo: SpaceType
  area: number
  orcamento: Budget
  vibe: string
  localizacao: Location
  estadoAtual: EstadoAtual
  luzNatural: LuzNatural
  peDireito: PeDireito
  publicoAlvo: PublicoAlvo
  prioridade: Prioridade
  capacidade: number
  comprimento?: number
  largura?: number
  alturaPeDireito?: number
  observacoes?: string
}

export interface BriefResult {
  vibe: string[]
  palette: string[]
  lighting: string
  materials: string
  acoustics: string
  layout: string
  spaceAnalysis?: string
}

export const SPACE_LABELS: Record<SpaceType, string> = {
  cafe: 'Café',
  loja: 'Loja',
  bar: 'Bar',
  restaurante: 'Restaurante',
  studio: 'Studio',
}

export const BUDGET_LABELS: Record<Budget, string> = {
  'ate50k': 'Até R$ 50k',
  '50k-150k': 'R$ 50k – 150k',
  '150k-300k': 'R$ 150k – 300k',
  'acima300k': 'Acima de R$ 300k',
}

export const LOCATION_LABELS: Record<Location, string> = {
  'terreo-urbano': 'Térreo urbano',
  'shopping': 'Shopping',
  'rua-bairro': 'Rua de bairro',
  'outro': 'Outro',
}

export const ESTADO_LABELS: Record<EstadoAtual, string> = {
  'obra-bruta': 'Obra bruta',
  'ja-funciona': 'Já funciona',
  'precisa-refresh': 'Precisa de refresh',
}

export const LUZ_LABELS: Record<LuzNatural, string> = {
  'muita': '☀️ Muita luz natural',
  'moderada': '🌤 Moderada',
  'pouca': '🌑 Pouca ou nenhuma',
}

export const PE_LABELS: Record<PeDireito, string> = {
  'baixo': 'Baixo — até 2,5m',
  'medio': 'Médio — 2,5 a 3,5m',
  'alto': 'Alto — acima de 3,5m',
}

export const PUBLICO_LABELS: Record<PublicoAlvo, string> = {
  'jovem-casual': '😎 Jovem / casual',
  'corporativo': '💼 Corporativo',
  'familia': '👨‍👩‍👧 Família',
  'turista': '🌍 Turista',
}

export const PRIORIDADE_LABELS: Record<Prioridade, string> = {
  'completa': 'Reforma completa',
  'moveis-decor': 'Móveis e decor',
  'iluminacao': 'Foco em iluminação',
}
