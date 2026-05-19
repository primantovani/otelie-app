export type SpaceType = 'cafe' | 'bistro' | 'sorveteria'
export type EntradaPos = 'frente' | 'lateral-esq' | 'lateral-dir' | 'fundo'
export type PisoTipo = 'cimento-queimado' | 'ceramica' | 'madeira' | 'vinilico' | 'pedra' | 'outro'
export type ParedeTipo = 'reboco-pintado' | 'tijolo-aparente' | 'azulejo' | 'drywall' | 'outro'
export type TetoTipo = 'laje-aparente' | 'forro-gesso' | 'forro-madeira' | 'steel-deck' | 'outro'
export type PlantaForma = 'corredor' | 'retangular' | 'quadrado' | 'formato-l' | 'irregular'
export type JanelasPos = 'so-frente' | 'frente-lateral' | 'so-lateral' | 'sem-janelas'
export type Fachada = 'aberta' | 'semi-aberta' | 'fechada' | 'interior'
export type ElementoFixo = 'pilares' | 'desnivel' | 'mezanino'

export type EscadaCustom = {
  parede: EntradaPos
  posicaoH: PosicaoH
  largura: number  // meters
}
export type PosicaoInterna = 'canto-ne' | 'canto-nw' | 'canto-se' | 'canto-sw' | 'fundo-centro' | 'lateral'
export type AmbienteInterno = {
  nome?: string
  posicao: PosicaoInterna
  largura?: number | null
  profundidade?: number | null
}

export type PosicaoH = 'esq' | 'centro' | 'dir'
export type MovelTipo = 'bancada' | 'balcao' | 'prateleira' | 'ilha'

export type JanelaCustom = {
  parede: EntradaPos
  posicaoH: PosicaoH
  largura: number
  altura: number
  peitoril?: number | null
}

export type PortaInterna = {
  parede: EntradaPos
  posicaoH: PosicaoH
  largura: number
}

export type PilarCustom = {
  posX: number
  posY: number
  diametro: number
}

export type MovelFixo = {
  tipo: MovelTipo
  parede: EntradaPos | 'centro'
  posicaoH: PosicaoH
  largura: number
  profundidade: number
  altura: number
}
export type Budget = 'ate50k' | '50k-150k' | '150k-300k' | 'acima300k'
export type Location = 'terreo-urbano' | 'shopping' | 'rua-bairro' | 'outro'
export type EstadoAtual = 'obra-bruta' | 'ja-funciona' | 'precisa-refresh'
export type LuzNatural = 'muita' | 'moderada' | 'pouca'
export type PeDireito = 'baixo' | 'medio' | 'alto'
export type PublicoAlvo = 'jovem-casual' | 'corporativo' | 'familia' | 'turista'
export type Prioridade = 'completa' | 'moveis-decor' | 'iluminacao'

// Café
export type CafeModelo = 'balcao' | 'mesas' | 'hibrido'
export type CafeDestaque = 'maquina' | 'vitrine' | 'ambos'
export type CafeAreaExterna = 'sim' | 'nao'

// Bistro
export type BistroCozinha = 'francesa' | 'italiana' | 'mediterranea' | 'contemporanea'
export type BistroServico = 'almoco' | 'jantar' | 'fullday' | 'brunch'
export type BistroDestaque = 'vinhos' | 'cozinha-aberta' | 'sem-destaque'

// Sorveteria
export type SorveteriaVariante = 'gelato' | 'soft' | 'acai' | 'mix'
export type SorveteriaModelo = 'takeaway' | 'mesas' | 'kids' | 'misto'
export type SorveteriaDestaque = 'vitrine' | 'producao' | 'topping' | 'sem-destaque'

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
  olharOtelie?: string
  // Acabamentos
  pisoTipo?: PisoTipo
  pisoFica?: boolean
  paredeTipo?: ParedeTipo
  paredeFica?: boolean
  tetoTipo?: TetoTipo
  tetoFica?: boolean
  // Ambiente
  entradaPos?: EntradaPos
  portaLargura?: number
  ambientesInternos?: AmbienteInterno[]
  janelasCustom?: JanelaCustom[]
  portasInternas?: PortaInterna[]
  pilaresCustom?: PilarCustom[]
  moveisFixos?: MovelFixo[]
  plantaForma?: PlantaForma
  janelasPos?: JanelasPos
  fachada?: Fachada
  elementosFixos?: ElementoFixo[]
  escadasCustom?: EscadaCustom[]
  // Café
  cafeModelo?: CafeModelo
  cafeDestaque?: CafeDestaque
  cafeAreaExterna?: CafeAreaExterna
  // Bistro
  bistroCozinha?: BistroCozinha
  bistroServico?: BistroServico
  bistroDestaque?: BistroDestaque
  // Sorveteria
  sorveteriaVariante?: SorveteriaVariante
  sorveteriaModelo?: SorveteriaModelo
  sorveteriaDestaque?: SorveteriaDestaque
}

export interface BriefResult {
  vibe: string[]
  palette: string[]
  lighting: string
  materials: string
  acoustics: string
  layout: string
  scenePrompt: string
  plantaPrompt: string
  spaceAnalysis?: string
}

export const SPACE_LABELS: Record<SpaceType, string> = {
  cafe: 'Café',
  bistro: 'Bistro',
  sorveteria: 'Ice Cream Shop',
}

export const BUDGET_LABELS: Record<Budget, string> = {
  'ate50k': 'Under $50k',
  '50k-150k': '$50k – $150k',
  '150k-300k': '$150k – $300k',
  'acima300k': 'Above $300k',
}

export const LOCATION_LABELS: Record<Location, string> = {
  'terreo-urbano': 'Urban storefront',
  'shopping': 'Mall / shopping center',
  'rua-bairro': 'Neighborhood street',
  'outro': 'Other',
}

export const ESTADO_LABELS: Record<EstadoAtual, string> = {
  'obra-bruta': 'Shell / raw space',
  'ja-funciona': 'Currently operating',
  'precisa-refresh': 'Needs a refresh',
}

export const LUZ_LABELS: Record<LuzNatural, string> = {
  'muita': 'Lots of natural light',
  'moderada': 'Moderate',
  'pouca': 'Little or none',
}

export const PE_LABELS: Record<PeDireito, string> = {
  'baixo': 'Low — under 8 ft',
  'medio': 'Medium — 8 to 11 ft',
  'alto': 'High — above 11 ft',
}

export const PUBLICO_LABELS: Record<PublicoAlvo, string> = {
  'jovem-casual': 'Young / casual',
  'corporativo': 'Corporate',
  'familia': 'Family',
  'turista': 'Tourist',
}

export const PRIORIDADE_LABELS: Record<Prioridade, string> = {
  'completa': 'Full renovation',
  'moveis-decor': 'Furniture & decor',
  'iluminacao': 'Lighting focus',
}
