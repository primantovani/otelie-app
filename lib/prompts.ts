import type { BriefFormData, SpaceType, ElementoFixo, PisoTipo, ParedeTipo, TetoTipo, EntradaPos } from './types'
import {
  SPACE_LABELS, BUDGET_LABELS, LOCATION_LABELS,
  ESTADO_LABELS, LUZ_LABELS, PE_LABELS, PUBLICO_LABELS, PRIORIDADE_LABELS,
} from './types'

function buildAmbienteContext(data: BriefFormData): string {
  const parts: string[] = []

  if (data.plantaForma) {
    const map: Record<string, string> = {
      corredor: 'corridor — narrow and long, linear circulation',
      retangular: 'proportional rectangle',
      quadrado: 'square — balanced on all sides',
      'formato-l': 'L-shaped — two connected areas, possible zoning',
      irregular: 'irregular — angled walls, adapted layout required',
    }
    parts.push(`Floor plan: ${map[data.plantaForma]}`)
  }

  if (data.janelasPos) {
    const map: Record<string, string> = {
      'so-frente': 'front only — directional light, darker at the back',
      'frente-lateral': 'front and side — good natural light on two axes',
      'so-lateral': 'side only — indirect, controlled light',
      'sem-janelas': 'no windows — fully enclosed, 100% artificial lighting',
    }
    parts.push(`Windows: ${map[data.janelasPos]}`)
  }

  if (data.fachada) {
    const map: Record<string, string> = {
      aberta: 'open/glass front — high street visibility, interior exposed',
      'semi-aberta': 'semi-open — moderate visibility, some privacy',
      fechada: 'closed — low street exposure, discreet entrance',
      interior: 'no street frontage (inside mall or gallery)',
    }
    parts.push(`Storefront: ${map[data.fachada]}`)
  }

  if (data.entradaPos) {
    const map: Record<EntradaPos, string> = {
      frente: 'front wall',
      'lateral-esq': 'left side wall',
      'lateral-dir': 'right side wall',
      fundo: 'back wall',
    }
    parts.push(`Main entrance: ${map[data.entradaPos]}`)
  }

  if (data.elementosFixos && data.elementosFixos.length > 0) {
    const map: Record<ElementoFixo, string> = {
      pilares: 'structural columns/pillars',
      desnivel: 'floor level change',
      mezanino: 'mezzanine',
      escadas: 'internal stairs',
    }
    parts.push(`Fixed non-removable elements: ${data.elementosFixos.map(e => map[e]).join(', ')}`)
  }

  if (parts.length === 0) return ''
  return `\nARCHITECTURAL READING:\n${parts.map(p => `- ${p}`).join('\n')}\n`
}

function buildSpaceContext(data: BriefFormData): string {
  switch (data.tipo) {

    case 'cafe': {
      const modelo = {
        balcao: 'Counter-focused café for walk-up service and takeaway. No or minimal seating.',
        mesas: 'Seating-forward café. Coffee bar at the back or side, with ample seating as the main experience.',
        hibrido: 'Front counter for takeaway, seating area in the back.',
      }[data.cafeModelo ?? 'hibrido']

      const destaque = {
        maquina: 'Professional espresso machine as the hero piece on the bar — visible, celebrated. Barista front and center.',
        vitrine: 'Refrigerated pastry display case with cakes, pastries and baked goods as the primary visual draw.',
        ambos: 'Espresso machine and pastry display case side by side — specialty coffee meets bakery.',
      }[data.cafeDestaque ?? 'ambos']

      const externa = data.cafeAreaExterna === 'sim'
        ? 'Outdoor patio or sidewalk seating available.'
        : ''

      return `Café: ${modelo} ${destaque} ${externa}`.trim()
    }

    case 'bistro': {
      const cozinha = {
        francesa: 'Classic French bistrot: rattan or wicker chairs, tablecloths, wall mirrors, zinc bar, warm pendant lighting.',
        italiana: 'Italian trattoria: exposed brick or rustic plaster, aged wood, wine bottles on display, warm family atmosphere.',
        mediterranea: 'Mediterranean bistro: light tones (white, sand, terracotta), decorative tiles, plants, open and bright.',
        contemporanea: 'Contemporary California bistro: clean design, natural materials mixed with concrete or metal, local identity.',
      }[data.bistroCozinha ?? 'contemporanea']

      const servico = {
        almoco: 'Lunch service — maximize natural light, animated communal atmosphere, group-friendly table layout.',
        jantar: 'Dinner service — intimate warm lighting, spaced tables, romantic atmosphere.',
        fullday: 'All-day service — versatile lighting and adaptable furniture.',
        brunch: 'Brunch — light bright atmosphere, larger sharing tables, side buffet or credenza.',
      }[data.bistroServico ?? 'fullday']

      const destaque = {
        vinhos: 'Wine bar focus: visible wine cellar or rack, lit bottle shelves, dedicated bar counter.',
        'cozinha-aberta': 'Open kitchen or pass-through visible to guests as a scenic element.',
        'sem-destaque': '',
      }[data.bistroDestaque ?? 'sem-destaque']

      return `Bistro: ${cozinha} ${servico}${destaque ? ` ${destaque}` : ''} Dining tables with chairs, simple table setting.`.trim()
    }

    case 'sorveteria': {
      const variante = {
        gelato: 'Artisan gelato shop: horizontal refrigerated display case with gelato pans, handwritten labels, Italian aesthetic.',
        soft: 'Soft serve shop: soft serve machines as the hero on the service counter, colorful and youthful.',
        acai: 'Açaí bowl shop: build-your-own counter with toppings and add-ons organized and visually displayed.',
        mix: 'Mixed ice cream shop: gelato display, soft serve machine, and topping bar combined.',
      }[data.sorveteriaVariante ?? 'gelato']

      const modelo = {
        takeaway: 'Takeaway model: efficient service counter, no or minimal seating. Speed and product focus.',
        mesas: 'Dine-in seating with chairs, cozy space to enjoy on-site.',
        kids: 'Kids-friendly: vibrant colors, low furniture, play area or kid corner.',
        misto: 'Mixed: takeaway counter at the front, seating area in the back.',
      }[data.sorveteriaModelo ?? 'misto']

      const destaque = {
        vitrine: 'Lit display case as the central visual element of the shop.',
        producao: 'Production area visible to customers, creating curiosity and transparency.',
        topping: 'Open topping bar with ingredients displayed in an organized, appetizing way.',
        'sem-destaque': '',
      }[data.sorveteriaDestaque ?? 'vitrine']

      return `Ice Cream Shop: ${variante} ${modelo}${destaque ? ` ${destaque}` : ''}`.trim()
    }
  }
}

const PISO_LABELS: Record<PisoTipo, string> = {
  'cimento-queimado': 'polished concrete',
  'ceramica': 'ceramic/porcelain tile',
  'madeira': 'hardwood',
  'vinilico': 'vinyl plank (LVT)',
  'pedra': 'natural stone/granite',
  'outro': 'other floor material',
}

const PAREDE_LABELS: Record<ParedeTipo, string> = {
  'reboco-pintado': 'painted plaster',
  'tijolo-aparente': 'exposed brick',
  'azulejo': 'ceramic tile',
  'drywall': 'painted drywall',
  'outro': 'other wall material',
}

const TETO_LABELS: Record<TetoTipo, string> = {
  'laje-aparente': 'exposed concrete slab',
  'forro-gesso': 'drywall/plaster ceiling',
  'forro-madeira': 'wood panel ceiling',
  'steel-deck': 'steel deck ceiling',
  'outro': 'other ceiling material',
}

const PISO_EN: Record<PisoTipo, string> = {
  'cimento-queimado': 'polished concrete floor',
  'ceramica': 'ceramic porcelain tile floor',
  'madeira': 'hardwood floor',
  'vinilico': 'vinyl plank floor',
  'pedra': 'natural stone floor',
  'outro': 'existing floor finish',
}

const PAREDE_EN: Record<ParedeTipo, string> = {
  'reboco-pintado': 'plastered painted walls',
  'tijolo-aparente': 'exposed brick walls',
  'azulejo': 'ceramic tile walls',
  'drywall': 'painted drywall',
  'outro': 'existing wall finish',
}

const TETO_EN: Record<TetoTipo, string> = {
  'laje-aparente': 'exposed concrete slab ceiling',
  'forro-gesso': 'plaster drywall ceiling',
  'forro-madeira': 'wood panel ceiling',
  'steel-deck': 'steel deck ceiling',
  'outro': 'existing ceiling finish',
}

function buildAcabamentosContext(data: BriefFormData): string {
  const parts: string[] = []
  if (data.pisoTipo) {
    const fica = data.pisoFica === true ? ' — keeping as-is' : data.pisoFica === false ? ' — will be replaced' : ''
    parts.push(`Floor: ${PISO_LABELS[data.pisoTipo]}${fica}`)
  }
  if (data.paredeTipo) {
    const fica = data.paredeFica === true ? ' — keeping as-is' : data.paredeFica === false ? ' — will be replaced' : ''
    parts.push(`Walls: ${PAREDE_LABELS[data.paredeTipo]}${fica}`)
  }
  if (data.tetoTipo) {
    const fica = data.tetoFica === true ? ' — keeping as-is' : data.tetoFica === false ? ' — will be replaced' : ''
    parts.push(`Ceiling: ${TETO_LABELS[data.tetoTipo]}${fica}`)
  }
  if (parts.length === 0) return ''
  return `\nEXISTING FINISHES:\n${parts.map(p => `- ${p}`).join('\n')}\n`
}

export function buildLevantamentoPrompt(data: BriefFormData, spaceAnalysis?: string, correcao?: string): string {
  const plantaEN: Record<string, string> = {
    corredor: 'narrow elongated corridor-shaped room',
    retangular: 'proportional rectangular room',
    quadrado: 'square room',
    'formato-l': 'L-shaped room',
    irregular: 'irregular room with angled walls',
  }
  const luzEN: Record<string, string> = {
    muita: 'flooded with natural light',
    moderada: 'moderately lit by natural light',
    pouca: 'dimly lit, mostly relying on artificial lighting',
  }
  const peEN: Record<string, string> = {
    baixo: 'low ceiling under 2.5m',
    medio: 'standard ceiling height 2.5–3.5m',
    alto: 'tall ceiling above 3.5m',
  }
  const janelasEN: Record<string, string> = {
    'so-frente': 'windows only on the front wall',
    'frente-lateral': 'windows on front and side walls',
    'so-lateral': 'windows on side wall only',
    'sem-janelas': 'no windows, fully enclosed',
  }
  const entradaEN: Record<string, string> = {
    frente: 'main entrance door on the front wall',
    'lateral-esq': 'main entrance door on the left side wall',
    'lateral-dir': 'main entrance door on the right side wall',
    fundo: 'main entrance door at the back wall',
  }

  const parts: string[] = [
    'Photorealistic architectural interior photograph of an existing empty commercial space in Brazil before any renovation.',
  ]

  if (data.plantaForma && plantaEN[data.plantaForma]) parts.push(plantaEN[data.plantaForma])
  if (data.peDireito && peEN[data.peDireito]) parts.push(peEN[data.peDireito])
  if (data.luzNatural && luzEN[data.luzNatural]) parts.push(luzEN[data.luzNatural])
  if (data.entradaPos) parts.push(entradaEN[data.entradaPos])
  if (data.janelasPos && janelasEN[data.janelasPos]) parts.push(janelasEN[data.janelasPos])
  if (data.pisoTipo) parts.push(PISO_EN[data.pisoTipo])
  if (data.paredeTipo) parts.push(PAREDE_EN[data.paredeTipo])
  if (data.tetoTipo) parts.push(TETO_EN[data.tetoTipo])

  if (data.elementosFixos && data.elementosFixos.length > 0) {
    const elEN: Record<string, string> = {
      pilares: 'structural columns',
      desnivel: 'floor level change',
      mezanino: 'mezzanine level visible',
      escadas: 'internal staircase',
    }
    parts.push(`Fixed structural elements visible: ${data.elementosFixos.map(e => elEN[e]).join(', ')}`)
  }

  if (spaceAnalysis) parts.push(`Additional space details: ${spaceAnalysis}`)
  if (correcao) parts.push(`CLIENT CORRECTION — apply exactly: ${correcao}`)

  parts.push('Empty space, no furniture, no people, no design intervention.')
  parts.push('Doors only where explicitly stated — no invented doors or openings. Windows only where stated.')
  parts.push('Realistic wear and patina consistent with current condition. Wide-angle professional architectural photography. No text, no watermarks.')

  return parts.join('. ')
}

export function buildPrompt(data: BriefFormData, spaceAnalysis?: string): string {
  return `You are an interior designer specializing in small food & beverage and lifestyle businesses.
Generate a design concept with a distinct identity for the following space:

SPACE TYPE AND PROFILE:
${buildSpaceContext(data)}
${buildAmbienteContext(data)}${buildAcabamentosContext(data)}

GENERAL INFO:
- Area: ${data.area} sq ft${data.comprimento && data.largura ? ` (${data.comprimento} ft × ${data.largura} ft)` : ''}
- Ceiling height: ${PE_LABELS[data.peDireito]}${data.alturaPeDireito ? ` — ${data.alturaPeDireito} ft` : ''}
- Natural light: ${LUZ_LABELS[data.luzNatural]}
- Current state: ${ESTADO_LABELS[data.estadoAtual]}
- Desired capacity: ${data.capacidade} seats
- Location: ${LOCATION_LABELS[data.localizacao]}

RENOVATION:
- Budget: ${BUDGET_LABELS[data.orcamento]}
- Priority: ${PRIORIDADE_LABELS[data.prioridade]}

IDENTITY:
- Desired style: ${data.vibe}
- Target audience: ${PUBLICO_LABELS[data.publicoAlvo]}
${data.observacoes ? `- Notes: ${data.observacoes}` : ''}
${spaceAnalysis ? `\nReal space analysis (photo submitted by client):\n${spaceAnalysis}` : ''}

IMPORTANT:
- Use plain language, no technical jargon
- Short and direct answers (2-3 sentences per section)
- Palette: 3-4 complementary hex colors suited to the style and space type
- Vibe: 3-4 words describing the atmosphere
- Factor in ceiling height and natural light in all recommendations
- Consider the ${data.capacidade}-seat capacity in the layout
${data.comprimento && data.largura ? `- Use the ${data.comprimento} ft × ${data.largura} ft dimensions for furniture distribution` : ''}
${data.alturaPeDireito ? `- ${data.alturaPeDireito} ft ceiling height should influence lighting and spatial feel` : ''}
${spaceAnalysis ? '- Incorporate the real physical characteristics described above' : ''}
${data.olharOtelie ? `
OTELIE EYE — client instructions for the image (highest priority):
${data.olharOtelie}` : ''}
`
}
