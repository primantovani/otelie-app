export interface FloorPlanData {
  largura: number       // room width (left → right), meters
  comprimento: number   // room depth (front → back), meters
  entradaPos: 'frente' | 'fundo' | 'lateral-dir' | 'lateral-esq'
  portaLargura?: number
  janelasPos?: 'so-frente' | 'frente-lateral' | 'so-lateral' | 'sem-janelas'
  ambientesInternos?: Array<{
    nome: string
    posicao: string
    largura?: number | null
    profundidade?: number | null
  }>
}

const SCALE  = 64   // px per meter
const MARGIN = 72   // px around room
const WALL   = 10   // wall thickness px
const DOOR_COLOR   = '#4b5563'
const WALL_COLOR   = '#1f2937'
const FLOOR_COLOR  = '#fafaf8'
const BG_COLOR     = '#e5e0d8'
const LABEL_COLOR  = '#6b7280'
const DIM_COLOR    = '#9ca3af'

function px(m: number) { return m * SCALE }

export function generateFloorPlanSVG(data: FloorPlanData): string {
  const W  = px(data.largura)
  const L  = px(data.comprimento)
  const SW = W + MARGIN * 2
  const SH = L + MARGIN * 2
  const rx = MARGIN   // room inner left
  const ry = MARGIN   // room inner top

  const doorW   = px(data.portaLargura ?? 1.0)
  const doorHalf = doorW / 2

  // ── wall segments ─────────────────────────────────────────────────────────
  // Each wall is drawn as thick stroke lines with gaps for door and windows.
  // Convention: fundo=top, frente=bottom, dir=right, esq=left

  type WallDef = { x1: number; y1: number; x2: number; y2: number }

  // Full wall coordinates (centerline of wall)
  const walls: Record<string, WallDef> = {
    fundo:  { x1: rx,   y1: ry,   x2: rx+W, y2: ry   },
    frente: { x1: rx,   y1: ry+L, x2: rx+W, y2: ry+L },
    esq:    { x1: rx,   y1: ry,   x2: rx,   y2: ry+L },
    dir:    { x1: rx+W, y1: ry,   x2: rx+W, y2: ry+L },
  }

  // Door wall: find center and build gap
  const doorWall = data.entradaPos === 'lateral-dir' ? 'dir'
                 : data.entradaPos === 'lateral-esq' ? 'esq'
                 : data.entradaPos === 'fundo'       ? 'fundo'
                 : 'frente'

  function wallLines(name: string): string {
    const w = walls[name]
    const isHoriz = w.y1 === w.y2
    const isDoor = name === doorWall

    // Window indicator for this wall
    const hasWindow = (
      (data.janelasPos === 'so-frente'     && name === 'frente') ||
      (data.janelasPos === 'frente-lateral' && (name === 'frente' || name === 'esq')) ||
      (data.janelasPos === 'so-lateral'    && (name === 'esq' || name === 'dir'))
    )

    const lines: string[] = []

    if (!isDoor && !hasWindow) {
      // Plain solid wall
      lines.push(`<line x1="${w.x1}" y1="${w.y1}" x2="${w.x2}" y2="${w.y2}"
        stroke="${WALL_COLOR}" stroke-width="${WALL}" stroke-linecap="square"/>`)
      return lines.join('\n')
    }

    // Door wall: gap in center
    if (isDoor) {
      const len = isHoriz ? w.x2 - w.x1 : w.y2 - w.y1
      const mid = len / 2
      const gStart = mid - doorHalf
      const gEnd   = mid + doorHalf

      if (isHoriz) {
        const base = w.y1
        // left segment
        lines.push(`<line x1="${w.x1}" y1="${base}" x2="${w.x1+gStart}" y2="${base}"
          stroke="${WALL_COLOR}" stroke-width="${WALL}" stroke-linecap="square"/>`)
        // right segment
        lines.push(`<line x1="${w.x1+gEnd}" y1="${base}" x2="${w.x2}" y2="${base}"
          stroke="${WALL_COLOR}" stroke-width="${WALL}" stroke-linecap="square"/>`)
        // door arc — swings inward
        const arcDir = name === 'frente' ? -1 : 1   // frente: arc goes up (into room)
        const ax = w.x1 + gStart
        const ay = base
        const sweep = name === 'frente' ? 0 : 1
        lines.push(`<path d="M ${ax} ${ay} A ${doorW} ${doorW} 0 0 ${sweep} ${ax+doorW} ${ay}"
          stroke="${DOOR_COLOR}" stroke-width="1.5" fill="none" stroke-dasharray="4 2"/>`)
        lines.push(`<line x1="${ax}" y1="${ay}" x2="${ax}" y2="${ay + arcDir*doorW}"
          stroke="${DOOR_COLOR}" stroke-width="1.5"/>`)
        lines.push(`<line x1="${ax+doorW}" y1="${ay}" x2="${ax+doorW}" y2="${ay + arcDir*doorW}"
          stroke="${DOOR_COLOR}" stroke-width="1.5"/>`)
      } else {
        const base = w.x1
        lines.push(`<line x1="${base}" y1="${w.y1}" x2="${base}" y2="${w.y1+gStart}"
          stroke="${WALL_COLOR}" stroke-width="${WALL}" stroke-linecap="square"/>`)
        lines.push(`<line x1="${base}" y1="${w.y1+gEnd}" x2="${base}" y2="${w.y2}"
          stroke="${WALL_COLOR}" stroke-width="${WALL}" stroke-linecap="square"/>`)
        const sweep = name === 'esq' ? 1 : 0
        const ay = w.y1 + gStart
        lines.push(`<path d="M ${base} ${ay} A ${doorW} ${doorW} 0 0 ${sweep} ${base} ${ay+doorW}"
          stroke="${DOOR_COLOR}" stroke-width="1.5" fill="none" stroke-dasharray="4 2"/>`)
      }
      return lines.join('\n')
    }

    // Window wall: gap with double-line symbol in center
    if (hasWindow) {
      const len = isHoriz ? w.x2 - w.x1 : w.y2 - w.y1
      const winW = len * 0.4
      const winStart = (len - winW) / 2
      const winEnd   = winStart + winW

      if (isHoriz) {
        const base = w.y1
        lines.push(`<line x1="${w.x1}" y1="${base}" x2="${w.x1+winStart}" y2="${base}"
          stroke="${WALL_COLOR}" stroke-width="${WALL}" stroke-linecap="square"/>`)
        lines.push(`<line x1="${w.x1+winEnd}" y1="${base}" x2="${w.x2}" y2="${base}"
          stroke="${WALL_COLOR}" stroke-width="${WALL}" stroke-linecap="square"/>`)
        // window symbol (two thin parallel lines)
        lines.push(`<line x1="${w.x1+winStart}" y1="${base-4}" x2="${w.x1+winEnd}" y2="${base-4}"
          stroke="${WALL_COLOR}" stroke-width="2"/>`)
        lines.push(`<line x1="${w.x1+winStart}" y1="${base+4}" x2="${w.x1+winEnd}" y2="${base+4}"
          stroke="${WALL_COLOR}" stroke-width="2"/>`)
      } else {
        const base = w.x1
        lines.push(`<line x1="${base}" y1="${w.y1}" x2="${base}" y2="${w.y1+winStart}"
          stroke="${WALL_COLOR}" stroke-width="${WALL}" stroke-linecap="square"/>`)
        lines.push(`<line x1="${base}" y1="${w.y1+winEnd}" x2="${base}" y2="${w.y2}"
          stroke="${WALL_COLOR}" stroke-width="${WALL}" stroke-linecap="square"/>`)
        lines.push(`<line x1="${base-4}" y1="${w.y1+winStart}" x2="${base-4}" y2="${w.y1+winEnd}"
          stroke="${WALL_COLOR}" stroke-width="2"/>`)
        lines.push(`<line x1="${base+4}" y1="${w.y1+winStart}" x2="${base+4}" y2="${w.y1+winEnd}"
          stroke="${WALL_COLOR}" stroke-width="2"/>`)
      }
    }

    return lines.join('\n')
  }

  // ── dimension annotations ─────────────────────────────────────────────────
  const dimOffset = 28
  const dims = `
    <!-- width dimension -->
    <line x1="${rx}" y1="${ry - dimOffset}" x2="${rx+W}" y2="${ry - dimOffset}"
      stroke="${DIM_COLOR}" stroke-width="1" marker-start="url(#arr)" marker-end="url(#arr)"/>
    <text x="${rx + W/2}" y="${ry - dimOffset - 6}" text-anchor="middle"
      font-size="11" fill="${DIM_COLOR}" font-family="monospace">${data.largura.toFixed(1)}m</text>

    <!-- depth dimension -->
    <line x1="${rx - dimOffset}" y1="${ry}" x2="${rx - dimOffset}" y2="${ry+L}"
      stroke="${DIM_COLOR}" stroke-width="1" marker-start="url(#arr)" marker-end="url(#arr)"/>
    <text x="${rx - dimOffset - 6}" y="${ry + L/2}" text-anchor="middle"
      font-size="11" fill="${DIM_COLOR}" font-family="monospace"
      transform="rotate(-90 ${rx - dimOffset - 6} ${ry + L/2})">${data.comprimento.toFixed(1)}m</text>
  `

  // ── compass labels ─────────────────────────────────────────────────────────
  const labels = `
    <text x="${rx + W/2}" y="${ry - 46}" text-anchor="middle"
      font-size="10" fill="${LABEL_COLOR}" font-family="monospace" font-weight="bold">FUNDO ↑</text>
    <text x="${rx + W/2}" y="${ry + L + 52}" text-anchor="middle"
      font-size="10" fill="${LABEL_COLOR}" font-family="monospace" font-weight="bold">↓ FRENTE${data.entradaPos === 'frente' ? ' (ENTRADA)' : ''}</text>
    <text x="${rx - 52}" y="${ry + L/2}" text-anchor="middle"
      font-size="10" fill="${LABEL_COLOR}" font-family="monospace" font-weight="bold"
      transform="rotate(-90 ${rx - 52} ${ry + L/2})">ESQ${data.entradaPos === 'lateral-esq' ? ' (ENT.)' : ''}</text>
    <text x="${rx + W + 52}" y="${ry + L/2}" text-anchor="middle"
      font-size="10" fill="${LABEL_COLOR}" font-family="monospace" font-weight="bold"
      transform="rotate(90 ${rx + W + 52} ${ry + L/2})">DIR${data.entradaPos === 'lateral-dir' ? ' (ENT.)' : ''}</text>
  `

  // ── internal rooms ─────────────────────────────────────────────────────────
  const internalRooms = (data.ambientesInternos ?? []).map(room => {
    const rw = px(room.largura  ?? 2)
    const rl = px(room.profundidade ?? 2)
    let rrx = rx + 4, rry = ry + 4
    if (room.posicao.includes('se') || room.posicao.includes('ne')) rrx = rx + W - rw - 4
    if (room.posicao.includes('ne') || room.posicao.includes('nw') || room.posicao === 'fundo-centro') rry = ry + 4
    if (room.posicao.includes('sw') || room.posicao.includes('se')) rry = ry + L - rl - 4
    return `
      <rect x="${rrx}" y="${rry}" width="${rw}" height="${rl}"
        fill="none" stroke="${WALL_COLOR}" stroke-width="${WALL * 0.6}" stroke-dasharray="6 3"/>
      <text x="${rrx + rw/2}" y="${rry + rl/2 + 4}" text-anchor="middle"
        font-size="9" fill="${LABEL_COLOR}" font-family="monospace">${room.nome}</text>
    `
  }).join('\n')

  return `<svg width="${SW}" height="${SH}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" fill="${DIM_COLOR}"/>
    </marker>
  </defs>

  <!-- background -->
  <rect width="${SW}" height="${SH}" fill="${BG_COLOR}"/>

  <!-- floor -->
  <rect x="${rx}" y="${ry}" width="${W}" height="${L}" fill="${FLOOR_COLOR}"/>

  <!-- internal rooms -->
  ${internalRooms}

  <!-- walls -->
  ${wallLines('fundo')}
  ${wallLines('frente')}
  ${wallLines('esq')}
  ${wallLines('dir')}

  <!-- corners (fill gaps) -->
  <rect x="${rx - WALL/2}" y="${ry - WALL/2}" width="${WALL}" height="${WALL}" fill="${WALL_COLOR}"/>
  <rect x="${rx + W - WALL/2}" y="${ry - WALL/2}" width="${WALL}" height="${WALL}" fill="${WALL_COLOR}"/>
  <rect x="${rx - WALL/2}" y="${ry + L - WALL/2}" width="${WALL}" height="${WALL}" fill="${WALL_COLOR}"/>
  <rect x="${rx + W - WALL/2}" y="${ry + L - WALL/2}" width="${WALL}" height="${WALL}" fill="${WALL_COLOR}"/>

  <!-- dimensions -->
  ${dims}

  <!-- labels -->
  ${labels}
</svg>`
}

// Converts SVG string to base64 JPEG via canvas (browser only)
export async function svgToBase64(svgString: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    const url  = URL.createObjectURL(blob)
    const img  = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = img.naturalWidth  || 600
      canvas.height = img.naturalHeight || 600
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#e5e0d8'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.95).split(',')[1])
    }
    img.onerror = reject
    img.src = url
  })
}
