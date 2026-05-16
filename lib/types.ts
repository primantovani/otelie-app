export type SpaceType = 'cafe' | 'loja' | 'bar' | 'restaurante' | 'studio'
export type Budget = 'ate50k' | '50k-150k' | '150k-300k' | 'acima300k'
export type Location = 'terreo-urbano' | 'shopping' | 'rua-bairro' | 'outro'

export interface BriefFormData {
  tipo: SpaceType
  area: number
  orcamento: Budget
  vibe: string
  localizacao: Location
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
