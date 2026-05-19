import type { BriefFormData } from './types'

// ─── material colors ───────────────────────────────────────────────────────────

const FLOOR_RGB: Record<string, [number, number, number]> = {
  'cimento-queimado': [120, 120, 120],
  'ceramica':         [220, 210, 190],
  'madeira':          [160, 110,  60],
  'vinilico':         [150, 140, 130],
  'pedra':            [140, 140, 140],
  'outro':            [160, 160, 160],
}

const WALL_RGB: Record<string, [number, number, number]> = {
  'reboco-pintado':  [245, 242, 235],
  'tijolo-aparente': [160,  80,  50],
  'azulejo':         [220, 235, 245],
  'drywall':         [252, 252, 252],
  'outro':           [240, 240, 240],
}

const CEIL_RGB: Record<string, [number, number, number]> = {
  'laje-aparente': [160, 160, 160],
  'forro-gesso':   [252, 252, 252],
  'forro-madeira': [200, 155,  90],
  'steel-deck':    [135, 150, 165],
  'outro':         [245, 245, 245],
}

// ─── dimensions ───────────────────────────────────────────────────────────────

export function getRoomInches(data: BriefFormData): { w: number; l: number; h: number } {
  let w: number, l: number

  if (data.comprimento && data.largura) {
    w = Math.round(data.largura   * 12)
    l = Math.round(data.comprimento * 12)
  } else {
    const ratios: Record<string, number> = {
      corredor: 0.30, quadrado: 1.00, retangular: 0.65,
      'formato-l': 0.65, irregular: 0.72,
    }
    const r = ratios[data.plantaForma || 'retangular'] ?? 0.65
    const areaSqIn = data.area * 144
    l = Math.round(Math.sqrt(areaSqIn / r))
    w = Math.round(areaSqIn / l)
  }

  const h = data.alturaPeDireito
    ? Math.round(data.alturaPeDireito * 12)
    : data.peDireito === 'alto' ? 156 : data.peDireito === 'baixo' ? 90 : 114

  return { w, l, h }
}

// ─── texture config ───────────────────────────────────────────────────────────
// Maps material types to SketchUp built-in .skm files and texture scale (inches).
// null → flat color only (no texture candidate worth trying).

type TexCfg = { candidates: Array<[string, string]>; scale: number }

const TEXTURE_CONFIG: Record<string, TexCfg | null> = {
  // Floors
  'madeira':          { candidates: [['WoodFine.skm','Materials/Wood and Plastic'],['WoodMedium.skm','Materials/Wood and Plastic'],['WoodFine.skm','Materials/Wood'],['WoodMedium.skm','Materials/Wood']], scale: 48 },
  'ceramica':         { candidates: [['Tile_Floor_Brick.skm','Materials/Tile and Carpeting'],['Tile_Ceramic.skm','Materials/Tile and Carpeting'],['Tile.skm','Materials/Tile and Carpeting']], scale: 24 },
  'pedra':            { candidates: [['Granite_Gray.skm','Materials/Stone'],['Stone_Granite.skm','Materials/Stone'],['Granite.skm','Materials/Stone']], scale: 36 },
  'vinilico':         null,
  'cimento-queimado': null,
  // Walls
  'tijolo-aparente':  { candidates: [['Brick_Antique.skm','Materials/Brick and Cladding'],['Brick.skm','Materials/Brick and Cladding'],['Brick_Antique.skm','Materials/Brick']], scale: 18 },
  'azulejo':          { candidates: [['Tile_Ceramic.skm','Materials/Tile and Carpeting'],['Tile_Mosaic.skm','Materials/Tile and Carpeting']], scale: 12 },
  'reboco-pintado':   null,
  'drywall':          null,
  // Ceilings
  'forro-madeira':    { candidates: [['WoodFine.skm','Materials/Wood and Plastic'],['WoodMedium.skm','Materials/Wood and Plastic'],['WoodFine.skm','Materials/Wood']], scale: 48 },
  'laje-aparente':    null,
  'forro-gesso':      null,
  'steel-deck':       null,
  'outro':            null,
}

// Generates Ruby code that loads a textured .skm material with color fallback.
function materialRuby(
  varName: string,
  matLabel: string,
  tipo: string,
  rgbFallback: [number, number, number]
): string {
  const cfg = TEXTURE_CONFIG[tipo] ?? null
  const [r, g, b] = rgbFallback

  if (!cfg) {
    return `${varName} = mats.add('${matLabel}'); ${varName}.color = Sketchup::Color.new(${r}, ${g}, ${b})`
  }

  const tries = cfg.candidates
    .map(([file, dir]) => `Sketchup.find_support_file('${file}', '${dir}')`)
    .join(' ||\n       ')

  return `${varName} = nil
begin
  _tp = ${tries}
  if _tp
    ${varName} = model.materials.load(_tp)
    ${varName}.texture.size = [${cfg.scale}, ${cfg.scale}] if ${varName} && ${varName}.texture
  end
rescue; end
unless ${varName}
  ${varName} = mats.add('${matLabel}')
  ${varName}.color = Sketchup::Color.new(${r}, ${g}, ${b})
end`
}

// ─── ruby builder ─────────────────────────────────────────────────────────────

export function buildRoomRuby(
  data: BriefFormData,
  paths: { perspective: string; topDown: string; planta: string }
): string {
  const { w, l, h } = getRoomInches(data)

  const pisoKey  = data.pisoTipo   || 'cimento-queimado'
  const paredeKey= data.paredeTipo || 'reboco-pintado'
  const tetoKey  = data.tetoTipo   || 'laje-aparente'

  const [fr, fg, fb] = FLOOR_RGB[pisoKey]
  const [wr, wg, wb] = WALL_RGB [paredeKey]
  const [cr, cg, cb] = CEIL_RGB [tetoKey]

  const mfCode = materialRuby('mf', 'Piso',    pisoKey,   [fr, fg, fb])
  const mwCode = materialRuby('mw', 'Paredes', paredeKey, [wr, wg, wb])
  const mcCode = materialRuby('mc', 'Teto',    tetoKey,   [cr, cg, cb])

  const wallT  = 6
  const floorT = 4
  const ceilT  = 4

  const ep   = data.entradaPos  ?? 'frente'
  const jp   = data.janelasPos  ?? 'so-frente'
  const fixo = data.elementosFixos ?? []

  const doorW = data.portaLargura ? Math.round(data.portaLargura * 39.37) : 36
  const doorH = Math.round(h * 0.82)

  // Window sizing
  const winW = Math.round(w * 0.42)
  const winH = Math.round(h * 0.35)
  const winZ = Math.round(h * 0.30)   // sill height

  // Don't add window to the same wall as the door to avoid overlap
  const southWin = ['so-frente', 'frente-lateral'].includes(jp) && ep !== 'frente'
  const eastWin  = ['frente-lateral', 'so-lateral'].includes(jp) && ep !== 'lateral-dir'

  // ── Opening coordinates (inches) ──────────────────────────────────────────
  // Door — centred on its wall
  const dX1 = Math.round((w - doorW) / 2)
  const dX2 = Math.round((w + doorW) / 2)
  const dL1 = Math.round((l - doorW) / 2)
  const dL2 = Math.round((l + doorW) / 2)

  // Window — centred on its wall
  const wX1 = Math.round((w - winW) / 2)
  const wX2 = Math.round((w + winW) / 2)
  const wL1 = Math.round((l - winW) / 2)
  const wL2 = Math.round((l + winW) / 2)

  // ── Door: real hole cut in the correct wall group ─────────────────────────
  //
  // Each wall group interior face (back-face after pushpull) has these normals:
  //   Sul  (y=0) → normal +Y   →  pushpull(-wall_t) cuts in -Y through wall
  //   Norte(y=l) → normal -Y   →  pushpull(-wall_t) cuts in +Y through wall
  //   Leste(x=w) → normal -X   →  pushpull(-wall_t) cuts in +X through wall
  //   Oeste(x=0) → normal +X   →  pushpull(-wall_t) cuts in -X through wall
  //
  // add_face on the interior surface splits the back-face automatically;
  // pushpull(-wall_t) punches through to the exterior face → real opening.

  const doorCode = ({
    frente: `
# Porta — Parede Sul (y=0)
begin
  df = g_s.entities.add_face([${dX1},0,0],[${dX2},0,0],[${dX2},0,${doorH}],[${dX1},0,${doorH}])
  if df; df.reverse! if df.normal.y < 0; df.pushpull(-wall_t); end
rescue; end`,

    fundo: `
# Porta — Parede Norte (y=l)
begin
  df = g_n.entities.add_face([${dX1},${l},0],[${dX2},${l},0],[${dX2},${l},${doorH}],[${dX1},${l},${doorH}])
  if df; df.reverse! if df.normal.y > 0; df.pushpull(-wall_t); end
rescue; end`,

    'lateral-dir': `
# Porta — Parede Leste (x=w)
begin
  df = g_e.entities.add_face([${w},${dL1},0],[${w},${dL2},0],[${w},${dL2},${doorH}],[${w},${dL1},${doorH}])
  if df; df.reverse! if df.normal.x > 0; df.pushpull(-wall_t); end
rescue; end`,

    'lateral-esq': `
# Porta — Parede Oeste (x=0)
begin
  df = g_o.entities.add_face([0,${dL1},0],[0,${dL2},0],[0,${dL2},${doorH}],[0,${dL1},${doorH}])
  if df; df.reverse! if df.normal.x < 0; df.pushpull(-wall_t); end
rescue; end`,
  } as Record<string, string>)[ep] ?? ''

  // ── Windows: real holes cut in wall groups ────────────────────────────────

  const southWinCode = southWin ? `
# Janela — Parede Sul (y=0)
begin
  wf = g_s.entities.add_face([${wX1},0,${winZ}],[${wX2},0,${winZ}],[${wX2},0,${winZ + winH}],[${wX1},0,${winZ + winH}])
  if wf; wf.reverse! if wf.normal.y < 0; wf.pushpull(-wall_t); end
rescue; end` : ''

  const eastWinCode = eastWin ? `
# Janela — Parede Leste (x=w)
begin
  wf = g_e.entities.add_face([${w},${wL1},${winZ}],[${w},${wL2},${winZ}],[${w},${wL2},${winZ + winH}],[${w},${wL1},${winZ + winH}])
  if wf; wf.reverse! if wf.normal.x > 0; wf.pushpull(-wall_t); end
rescue; end` : ''

  // ── Interior rooms ────────────────────────────────────────────────────────
  const partT = 4   // partition thickness (inches)
  const intDoorW = 30
  const intDoorH = Math.round(h * 0.82)

  // Build one partition segment: face pts as individual args, door cut optional.
  // normalAxis/outDir define which way the solid extrudes (outward from the room).
  // Door face has OPPOSITE normal to extrude direction → pushpull(-partT) cuts through.
  function makePartition(
    gVar: string, label: string,
    x1: number, y1: number, x2: number, y2: number,   // bottom corners of face
    axis: 'x' | 'y', outDir: 1 | -1,
    door: { x1: number; y1: number; x2: number; y2: number } | null
  ): string {
    const reverseWall = outDir > 0
      ? `wf.reverse! if wf.normal.${axis} < 0`
      : `wf.reverse! if wf.normal.${axis} > 0`
    const reverseDoor = outDir > 0
      ? `df.reverse! if df.normal.${axis} > 0`
      : `df.reverse! if df.normal.${axis} < 0`
    const doorCode = door ? `
begin
  df = ${gVar}.entities.add_face([${door.x1},${door.y1},0],[${door.x2},${door.y2},0],[${door.x2},${door.y2},${intDoorH}],[${door.x1},${door.y1},${intDoorH}])
  if df; ${reverseDoor}; df.pushpull(-part_t); end
rescue; end` : ''
    return `
${gVar} = g_int.entities.add_group; ${gVar}.name = '${label}'; ${gVar}.material = mw
begin
  wf = ${gVar}.entities.add_face([${x1},${y1},0],[${x2},${y2},0],[${x2},${y2},h],[${x1},${y1},h])
  ${reverseWall}
  wf.pushpull(part_t)
rescue; end${doorCode}`
  }

  const interiorRoomsCode = (data.ambientesInternos ?? []).map((room, idx) => {
    const bw = room.largura      ? Math.round(room.largura      * 39.37) : Math.round(w * 0.25)
    const bd = room.profundidade ? Math.round(room.profundidade * 39.37) : Math.round(l * 0.20)
    const nm = (room.nome ?? 'Ambiente').replace(/'/g, "\\'")
    const pos = room.posicao ?? 'canto-sw'

    // For each position: two partition segments forming an L inside the room corner.
    // Door is cut in the segment that faces the main circulation space.
    // Door centered on that segment.
    const dHalf = Math.round(intDoorW / 2)

    // pt = partition thickness, used to extend lateral walls so corners close
    const pt = partT

    const variants: Record<string, string> = {
      'canto-sw': [
        // Lateral wall extends past the back wall by pt to close corner
        makePartition(`gi${idx}a`, `${nm} L`, bw, 0, bw, bd + pt, 'x', 1,
          { x1: bw, y1: Math.round(bd/2) - dHalf, x2: bw, y2: Math.round(bd/2) + dHalf }),
        makePartition(`gi${idx}b`, `${nm} N`, 0, bd, bw, bd, 'y', 1, null),
      ].join('\n'),

      'canto-se': [
        makePartition(`gi${idx}a`, `${nm} L`, w-bw, 0, w-bw, bd + pt, 'x', -1,
          { x1: w-bw, y1: Math.round(bd/2) - dHalf, x2: w-bw, y2: Math.round(bd/2) + dHalf }),
        makePartition(`gi${idx}b`, `${nm} N`, w-bw, bd, w, bd, 'y', 1, null),
      ].join('\n'),

      'canto-ne': [
        makePartition(`gi${idx}a`, `${nm} L`, w-bw, l-bd - pt, w-bw, l, 'x', -1,
          { x1: w-bw, y1: l - Math.round(bd/2) - dHalf, x2: w-bw, y2: l - Math.round(bd/2) + dHalf }),
        makePartition(`gi${idx}b`, `${nm} S`, w-bw, l-bd, w, l-bd, 'y', -1, null),
      ].join('\n'),

      'canto-nw': [
        makePartition(`gi${idx}a`, `${nm} L`, bw, l-bd - pt, bw, l, 'x', 1,
          { x1: bw, y1: l - Math.round(bd/2) - dHalf, x2: bw, y2: l - Math.round(bd/2) + dHalf }),
        makePartition(`gi${idx}b`, `${nm} S`, 0, l-bd, bw, l-bd, 'y', -1, null),
      ].join('\n'),

      'fundo-centro': (() => {
        const cx1 = Math.round((w-bw)/2), cx2 = Math.round((w+bw)/2)
        return [
          makePartition(`gi${idx}a`, `${nm} S`, cx1, l-bd, cx2, l-bd, 'y', -1,
            { x1: Math.round((cx1+cx2)/2) - dHalf, y1: l-bd, x2: Math.round((cx1+cx2)/2) + dHalf, y2: l-bd }),
          makePartition(`gi${idx}b`, `${nm} L`, cx1, l-bd - pt, cx1, l, 'x', 1, null),
        ].join('\n')
      })(),

      'lateral': (() => {
        const ly1 = Math.round((l-bd)/2), ly2 = Math.round((l+bd)/2)
        return [
          makePartition(`gi${idx}a`, `${nm} L`, w-bw, ly1 - pt, w-bw, ly2 + pt, 'x', -1,
            { x1: w-bw, y1: Math.round((ly1+ly2)/2) - dHalf, x2: w-bw, y2: Math.round((ly1+ly2)/2) + dHalf }),
          makePartition(`gi${idx}b`, `${nm} S`, w-bw, ly1, w, ly1, 'y', -1, null),
        ].join('\n')
      })(),
    }

    return `\n# ── ${nm} ──${variants[pos] ?? variants['canto-sw']}`
  }).join('\n')

  // ── Custom openings helper ────────────────────────────────────────────────
  // Cuts a rectangular hole in a wall group face.
  // parede determines which group and which coordinate is fixed.
  // posH positions the opening along the wall: esq/centro/dir.
  function makeCustomOpening(
    varName: string,
    parede: string, posH: string,
    openW: number, z1: number, z2: number
  ): string {
    const margin = 24
    const isX = parede === 'frente' || parede === 'fundo'
    const wallLen = isX ? w : l
    let h1: number, h2: number
    if (posH === 'esq') { h1 = margin; h2 = h1 + openW }
    else if (posH === 'dir') { h2 = wallLen - margin; h1 = h2 - openW }
    else { h1 = Math.round((wallLen - openW) / 2); h2 = h1 + openW }

    let gVar: string, pts: string, revCond: string
    if (parede === 'frente') {
      gVar = 'g_s'
      pts = `[${h1},0,${z1}],[${h2},0,${z1}],[${h2},0,${z2}],[${h1},0,${z2}]`
      revCond = `${varName}.normal.y < 0`
    } else if (parede === 'fundo') {
      gVar = 'g_n'
      pts = `[${h1},${l},${z1}],[${h2},${l},${z1}],[${h2},${l},${z2}],[${h1},${l},${z2}]`
      revCond = `${varName}.normal.y > 0`
    } else if (parede === 'lateral-esq') {
      gVar = 'g_o'
      pts = `[0,${h1},${z1}],[0,${h2},${z1}],[0,${h2},${z2}],[0,${h1},${z2}]`
      revCond = `${varName}.normal.x < 0`
    } else {
      gVar = 'g_e'
      pts = `[${w},${h1},${z1}],[${w},${h2},${z1}],[${w},${h2},${z2}],[${w},${h1},${z2}]`
      revCond = `${varName}.normal.x > 0`
    }
    return `
begin
  ${varName} = ${gVar}.entities.add_face(${pts})
  if ${varName}; ${varName}.reverse! if ${revCond}; ${varName}.pushpull(-wall_t); end
rescue; end`
  }

  // ── Custom janelas ────────────────────────────────────────────────────────
  const customWindowsCode = (data.janelasCustom ?? []).map((j, i) => {
    const jW = Math.round(j.largura * 39.37)
    const jH = Math.round(j.altura * 39.37)
    const jZ = Math.round((j.peitoril ?? 0.9) * 39.37)
    return `# Janela custom ${i + 1} — ${j.parede}` +
      makeCustomOpening(`cw${i}`, j.parede, j.posicaoH, jW, jZ, jZ + jH)
  }).join('\n')

  // ── Custom portas internas ────────────────────────────────────────────────
  const customDoorsCode = (data.portasInternas ?? []).map((p, i) => {
    const pW = Math.round(p.largura * 39.37)
    return `# Porta interna ${i + 1} — ${p.parede}` +
      makeCustomOpening(`cd${i}`, p.parede, p.posicaoH, pW, 0, doorH)
  }).join('\n')

  // ── Custom pilares ────────────────────────────────────────────────────────
  const pilaresCustomCode = (data.pilaresCustom ?? []).map((p, i) => {
    const cx = Math.round(p.posX * 39.37)
    const cy = Math.round(p.posY * 39.37)
    const r  = Math.round((p.diametro / 2) * 39.37)
    return `
begin
  pc${i}_circ = g_el.entities.add_circle([${cx},${cy},0],[0,0,1],${r},12)
  pc${i}_f = g_el.entities.add_face(pc${i}_circ)
  if pc${i}_f; pc${i}_f.reverse! if pc${i}_f.normal.z < 0; pc${i}_f.pushpull(${h}); pc${i}_f.material = mcol; end
rescue; end`
  }).join('\n')

  // ── Móveis fixos ──────────────────────────────────────────────────────────
  const MOVEL_RGB: Record<string, [number, number, number]> = {
    bancada:   [190, 180, 165],
    balcao:    [160, 145, 130],
    prateleira:[140, 120, 100],
    ilha:      [200, 185, 165],
  }
  const moveisCode = (data.moveisFixos ?? []).map((m, i) => {
    const mW  = Math.round(m.largura      * 39.37)
    const mP  = Math.round(m.profundidade * 39.37)
    const mH  = Math.round(m.altura       * 39.37)
    const pH  = m.posicaoH ?? 'centro'
    const mar = 24
    const isX = m.parede === 'frente' || m.parede === 'fundo' || m.parede === 'centro'
    const wallLen = isX ? w : l

    let x1: number, x2: number, y1: number, y2: number
    // horizontal span (along wall)
    let span1: number, span2: number
    if (pH === 'esq') { span1 = wallT + mar; span2 = span1 + mW }
    else if (pH === 'dir') { span2 = wallLen - wallT - mar; span1 = span2 - mW }
    else { span1 = Math.round((wallLen - mW) / 2); span2 = span1 + mW }

    if (m.parede === 'frente') {
      x1 = span1; x2 = span2; y1 = wallT; y2 = wallT + mP
    } else if (m.parede === 'fundo') {
      x1 = span1; x2 = span2; y2 = l - wallT; y1 = y2 - mP
    } else if (m.parede === 'lateral-esq') {
      y1 = span1; y2 = span2; x1 = wallT; x2 = wallT + mP
    } else if (m.parede === 'lateral-dir') {
      y1 = span1; y2 = span2; x2 = w - wallT; x1 = x2 - mP
    } else { // centro / ilha
      x1 = Math.round((w - mW) / 2); x2 = x1 + mW
      y1 = Math.round((l - mP) / 2); y2 = y1 + mP
    }

    const [mr2, mg2, mb2] = MOVEL_RGB[m.tipo] ?? [180, 165, 150]
    const label = `${m.tipo.charAt(0).toUpperCase()}${m.tipo.slice(1)} ${i + 1}`
    return `
mmob${i} = mats.add('Movel${i}'); mmob${i}.color = [${mr2},${mg2},${mb2}]
begin
  gmob${i} = g_el.entities.add_group; gmob${i}.name = '${label}'
  mf${i} = gmob${i}.entities.add_face([${x1!},${y1!},0],[${x2!},${y1!},0],[${x2!},${y2!},0],[${x1!},${y2!},0])
  if mf${i}; mf${i}.reverse! if mf${i}.normal.z < 0; mf${i}.pushpull(${mH}); mf${i}.material = mmob${i}; end
rescue; end`
  }).join('\n')

  // ── Fixed elements ────────────────────────────────────────────────────────

  const needsColMat = fixo.includes('pilares') || (data.pilaresCustom ?? []).length > 0
  const colCode = needsColMat ? `mcol = mats.add('Colunas'); mcol.color = [200, 195, 188]` : ''

  const colGridCode = fixo.includes('pilares') ? `
[[${Math.round(w*0.30)},${Math.round(l*0.30)}],[${Math.round(w*0.70)},${Math.round(l*0.30)}],[${Math.round(w*0.30)},${Math.round(l*0.70)}],[${Math.round(w*0.70)},${Math.round(l*0.70)}]].each do |cx,cy|
  begin
    circ = g_el.entities.add_circle([cx,cy,0],[0,0,1],6,12)
    cf = g_el.entities.add_face(circ); cf.pushpull(${h}); cf.material = mcol
  rescue; end
end` : ''

  const mezCode = fixo.includes('mezanino') ? `
mmez = mats.add('Mezanino'); mmez.color = [${fr},${fg},${fb}]
begin
  mez_f = g_el.entities.add_face([[${Math.round(w*0.55)},0,${Math.round(h*0.55)}],[${w},0,${Math.round(h*0.55)}],[${w},${Math.round(l*0.45)},${Math.round(h*0.55)}],[${Math.round(w*0.55)},${Math.round(l*0.45)},${Math.round(h*0.55)}]])
  mez_f.material = mmez
rescue; end` : ''

  const stairRiser = 7   // inches (~18cm)
  const stairTread = 11  // inches (~28cm)
  const stairTopH  = Math.round(h * 0.55)
  const stairSteps = Math.max(1, Math.round(stairTopH / stairRiser))
  const stairDepth = stairSteps * stairTread

  const escadasCode = (data.escadasCustom ?? []).map((esc, escIdx) => {
    const sw = Math.round(esc.largura * 39.37)
    const parede = esc.parede ?? 'fundo'
    const posH   = esc.posicaoH ?? 'esq'

    // Span of stair along the wall (either x or y direction)
    const isX = parede === 'frente' || parede === 'fundo'
    const wallLen = isX ? w : l
    let span1: number
    if (posH === 'esq')    { span1 = wallT + 12 }
    else if (posH === 'dir') { span1 = wallLen - wallT - 12 - sw }
    else                   { span1 = Math.round((wallLen - sw) / 2) }
    const span2 = span1 + sw

    // Generate steps — each step is a box: tread face then pushpull(riser)
    // Steps start at the wall and descend toward room interior
    const steps = Array.from({ length: stairSteps }, (_, i) => {
      const z0 = i * stairRiser
      const gn  = `gesc${escIdx}_${i}`
      const fn_ = `fesc${escIdx}_${i}`
      let pts: string
      if (parede === 'fundo') {
        // Steps go from back wall toward interior (decreasing y)
        const y0 = l - wallT - (i + 1) * stairTread
        const y1 = y0 + stairTread
        pts = `[${span1},${y0},${z0}],[${span2},${y0},${z0}],[${span2},${y1},${z0}],[${span1},${y1},${z0}]`
      } else if (parede === 'frente') {
        const y0 = wallT + i * stairTread
        const y1 = y0 + stairTread
        pts = `[${span1},${y0},${z0}],[${span2},${y0},${z0}],[${span2},${y1},${z0}],[${span1},${y1},${z0}]`
      } else if (parede === 'lateral-dir') {
        const x0 = w - wallT - (i + 1) * stairTread
        const x1 = x0 + stairTread
        pts = `[${x0},${span1},${z0}],[${x1},${span1},${z0}],[${x1},${span2},${z0}],[${x0},${span2},${z0}]`
      } else { // lateral-esq
        const x0 = wallT + i * stairTread
        const x1 = x0 + stairTread
        pts = `[${x0},${span1},${z0}],[${x1},${span1},${z0}],[${x1},${span2},${z0}],[${x0},${span2},${z0}]`
      }
      return `begin
  ${gn} = g_el.entities.add_group; ${gn}.material = mesc
  ${fn_} = ${gn}.entities.add_face(${pts})
  if ${fn_}; ${fn_}.reverse! if ${fn_}.normal.z < 0; ${fn_}.pushpull(${stairRiser}); end
rescue; end`
    }).join('\n')

    return `
# ── Escada ${escIdx + 1} (${parede}) ─────────────────────────────────────────
mesc = mats.add('Escada${escIdx}'); mesc.color = [${wr}, ${wg}, ${wb}]
${steps}`
  }).join('\n')

  const desnivelCode = fixo.includes('desnivel') ? `
# ── Desnível ─────────────────────────────────────────────────────────────────
mdes = mats.add('Desnivel'); mdes.color = [${fr}, ${fg}, ${fb}]
begin
  gdes = g_el.entities.add_group; gdes.material = mdes
  df2 = gdes.entities.add_face([${Math.round(w*0.55)},0,0],[${w},0,0],[${w},${Math.round(l*0.40)},0],[${Math.round(w*0.55)},${Math.round(l*0.40)},0])
  if df2; df2.reverse! if df2.normal.z < 0; df2.pushpull(8); end
rescue; end` : ''

  // ── Cameras ───────────────────────────────────────────────────────────────
  // Editorial rules:
  //   1. Two-point perspective (cam.two_point_perspective = true) — keeps verticals straight
  //   2. FOV 38° — tighter than 65°, avoids ultra-wide distortion, feels like a real lens
  //   3. Eye height 63" (1.60m) — matches real interior photography
  //   4. Corner shot: camera placed in the interior corner, looking diagonally — shows depth + light
  //
  // Cam 1 = corner shot from the NEAR side of entrance wall, slightly off-center
  // Cam 2 = corner shot from the FAR/OPPOSITE side, slightly elevated — second editorial angle

  const eyeH = 63  // 1.60m in inches
  const inset = wallT + 20  // offset from walls to avoid clipping

  // Each entrance has two opposing interior corners for the two cameras.
  // c1: corner closest to entrance (shows depth into space)
  // c2: corner on the opposite side (shows entrance wall + circulation)
  type Pt = { eye: string; tgt: string }

  const cornerCams: Record<string, [Pt, Pt]> = {
    // frente = entrance at y=0 (south wall)
    // c1: SW interior corner → looking toward NE
    // c2: NE interior corner → looking toward SW
    frente: [
      {
        eye: `Geom::Point3d.new(${inset}, ${inset}, ${eyeH})`,
        tgt: `Geom::Point3d.new(${Math.round(w*0.78)}, ${Math.round(l*0.82)}, ${Math.round(eyeH*0.60)})`,
      },
      {
        eye: `Geom::Point3d.new(${w - inset}, ${l - inset}, ${eyeH})`,
        tgt: `Geom::Point3d.new(${Math.round(w*0.22)}, ${Math.round(l*0.18)}, ${Math.round(eyeH*0.60)})`,
      },
    ],
    // fundo = entrance at y=l (north wall)
    // c1: NW interior → looking toward SE
    // c2: SE interior → looking toward NW
    fundo: [
      {
        eye: `Geom::Point3d.new(${inset}, ${l - inset}, ${eyeH})`,
        tgt: `Geom::Point3d.new(${Math.round(w*0.78)}, ${Math.round(l*0.18)}, ${Math.round(eyeH*0.60)})`,
      },
      {
        eye: `Geom::Point3d.new(${w - inset}, ${inset}, ${eyeH})`,
        tgt: `Geom::Point3d.new(${Math.round(w*0.22)}, ${Math.round(l*0.82)}, ${Math.round(eyeH*0.60)})`,
      },
    ],
    // lateral-esq = entrance at x=0 (west wall)
    // c1: SW interior → looking toward NE
    // c2: NE interior → looking toward SW
    'lateral-esq': [
      {
        eye: `Geom::Point3d.new(${inset}, ${inset}, ${eyeH})`,
        tgt: `Geom::Point3d.new(${Math.round(w*0.82)}, ${Math.round(l*0.78)}, ${Math.round(eyeH*0.60)})`,
      },
      {
        eye: `Geom::Point3d.new(${w - inset}, ${l - inset}, ${eyeH})`,
        tgt: `Geom::Point3d.new(${Math.round(w*0.18)}, ${Math.round(l*0.22)}, ${Math.round(eyeH*0.60)})`,
      },
    ],
    // lateral-dir = entrance at x=w (east wall)
    // c1: SE interior → looking toward NW
    // c2: NW interior → looking toward SE
    'lateral-dir': [
      {
        eye: `Geom::Point3d.new(${w - inset}, ${inset}, ${eyeH})`,
        tgt: `Geom::Point3d.new(${Math.round(w*0.18)}, ${Math.round(l*0.78)}, ${Math.round(eyeH*0.60)})`,
      },
      {
        eye: `Geom::Point3d.new(${inset}, ${l - inset}, ${eyeH})`,
        tgt: `Geom::Point3d.new(${Math.round(w*0.82)}, ${Math.round(l*0.22)}, ${Math.round(eyeH*0.60)})`,
      },
    ],
  }

  const [cam1Pt, cam2Pt] = cornerCams[ep] ?? cornerCams['frente']
  const c1Eye    = cam1Pt.eye;  const c1Target = cam1Pt.tgt
  const c2Eye    = cam2Pt.eye;  const c2Target = cam2Pt.tgt

  // Plan: very high, narrow FOV → nearly orthographic
  const cPlanEye    = `Geom::Point3d.new(${Math.round(w/2)}, ${Math.round(l/2)}, ${h * 9})`
  const cPlanTarget = `Geom::Point3d.new(${Math.round(w/2)}, ${Math.round(l/2)}, 0)`

  // Section cut: straight-on front view aligned to the cut plane
  const cCorteEye    = `Geom::Point3d.new(${Math.round(w/2)}, ${-Math.round(l*0.80)}, ${Math.round(h*0.40)})`
  const cCorteTarget = `Geom::Point3d.new(${Math.round(w/2)}, ${Math.round(l*0.10)}, ${Math.round(h*0.38)})`

  return `
begin; Sketchup.file_new if Sketchup.active_model.nil?; rescue; end
model = Sketchup.active_model
if model.nil?
  begin; Sketchup.file_new; rescue; end
  model = Sketchup.active_model
end
raise 'Abra o SketchUp, vá em File → New e tente novamente.' if model.nil?
begin; model.start_operation('Otelie Room', true); rescue; end
ents = model.active_entities
ents.clear!
mats = model.materials
mats.purge_unused rescue nil

# Materiais
${mfCode}
${mwCode}
${mcCode}

w = ${w}; l = ${l}; h = ${h}
wall_t = ${wallT}; floor_t = ${floorT}; ceil_t = ${ceilT}; part_t = ${partT}

# ── Piso ──────────────────────────────────────────────────────────────────────
# Face superior (z=0) com normal +Z (face branca virada p/ cima = aparente)
# pushpull(-floor_t) desce criando a laje; face inferior fica azul (não visível)
g_piso = ents.add_group; g_piso.name = 'Piso'; g_piso.material = mf
begin
  pf = g_piso.entities.add_face([[0,0,0],[w,0,0],[w,l,0],[0,l,0]])
  pf.reverse! if pf.normal.z < 0  # garante normal +Z (face branca p/ cima)
  pf.pushpull(-floor_t)
rescue; end

# ── Teto ──────────────────────────────────────────────────────────────────────
# Face inferior da laje (z=h) com normal -Z (face branca virada p/ baixo = aparente)
# pushpull(ceil_t) sobe; face branca fica visível de dentro da sala
g_teto = ents.add_group; g_teto.name = 'Teto'; g_teto.material = mc
begin
  tf = g_teto.entities.add_face([[0,0,h],[0,l,h],[w,l,h],[w,0,h]])
  tf.reverse! if tf.normal.z > 0  # garante normal -Z (face branca p/ baixo)
  tf.pushpull(ceil_t)
rescue; end

# ── Paredes ───────────────────────────────────────────────────────────────────
# Normals e pushpull:
#   Sul  (y=0): winding→normal -Y → pushpull(wall_t) vai para -Y (exterior)
#   Norte(y=l): winding→normal +Y → pushpull(wall_t) vai para +Y
#   Leste(x=w): winding→normal +X → pushpull(wall_t) vai para +X
#   Oeste(x=0): winding→normal -X → pushpull(wall_t) vai para -X
g_par = ents.add_group; g_par.name = 'Paredes'; g_par.material = mw

# Paredes: cada face é desenhada com normal apontando para FORA da sala,
# então pushpull(wall_t) expande para fora. A face branca (front face) fica
# do lado de fora; a face interior criada pelo pushpull (back face da original)
# tem normal para dentro — SketchUp a renderiza como face branca quando vista
# de dentro, que é o comportamento correto.
g_s = g_par.entities.add_group; g_s.name = 'Parede Sul';   g_s.material = mw
begin
  wf = g_s.entities.add_face([[-wall_t,0,-floor_t],[w+wall_t,0,-floor_t],[w+wall_t,0,h],[-wall_t,0,h]])
  wf.reverse! if wf.normal.y > 0
  wf.pushpull(wall_t)
rescue; end

g_n = g_par.entities.add_group; g_n.name = 'Parede Norte'; g_n.material = mw
begin
  wf = g_n.entities.add_face([-wall_t,l,-floor_t],[-wall_t,l,h],[w+wall_t,l,h],[w+wall_t,l,-floor_t])
  wf.reverse! if wf.normal.y < 0
  wf.pushpull(wall_t)
rescue; end

g_e = g_par.entities.add_group; g_e.name = 'Parede Leste'; g_e.material = mw
begin
  wf = g_e.entities.add_face([[w,0,-floor_t],[w,l,-floor_t],[w,l,h],[w,0,h]])
  wf.reverse! if wf.normal.x < 0
  wf.pushpull(wall_t)
rescue; end

g_o = g_par.entities.add_group; g_o.name = 'Parede Oeste'; g_o.material = mw
begin
  wf = g_o.entities.add_face([[0,0,-floor_t],[0,0,h],[0,l,h],[0,l,-floor_t]])
  wf.reverse! if wf.normal.x > 0
  wf.pushpull(wall_t)
rescue; end

# ── Ambientes Internos (paredes de divisória) ────────────────────────────────
g_int = ents.add_group; g_int.name = 'Ambientes Internos'
${interiorRoomsCode}

# ── Aberturas (furos reais nas paredes) ───────────────────────────────────────
# Técnica: add_face na face interior do grupo da parede → split automático da face
# existente → pushpull(-wall_t) atravessa a espessura e cria o vão.
${doorCode}
${southWinCode}
${eastWinCode}
${customWindowsCode}
${customDoorsCode}

# ── Elementos Fixos ───────────────────────────────────────────────────────────
g_el = ents.add_group; g_el.name = 'Elementos Fixos'
${colCode}
${colGridCode}
${pilaresCustomCode}
${moveisCode}
${mezCode}
${escadasCode}
${desnivelCode}

begin; model.commit_operation; rescue; end

# ── Cotas ─────────────────────────────────────────────────────────────────────
begin
  w_m = (w / 39.37).round(2)
  l_m = (l / 39.37).round(2)
  doff = 36
  dw = ents.add_dimension_linear([0,0,0], [w,0,0], Geom::Vector3d.new(0,-doff,0))
  dw.text = "#{w_m}m" if dw
  dl = ents.add_dimension_linear([w,0,0], [w,l,0], Geom::Vector3d.new(doff,0,0))
  dl.text = "#{l_m}m" if dl
rescue; end

# ── Estilo visual ─────────────────────────────────────────────────────────────
begin
  ro = model.rendering_options
  ro['DrawGround']      = true
  ro['DrawSky']         = true
  ro['BackgroundColor'] = Sketchup::Color.new(205, 213, 228)
  ro['SkyColor']        = Sketchup::Color.new(175, 205, 240)
  ro['GroundColor']     = Sketchup::Color.new(168, 162, 150)
  ro['DrawSilhouettes'] = true
  ro['SilhouetteWidth'] = 2
rescue; end

begin
  si = model.shadow_info
  si['DisplayShadows']      = true
  si['Light']               = 80
  si['Dark']                = 48
  si['ShadowTime']          = Time.gm(2024, 9, 21, 14, 30, 0)
  si['UseSunForAllShading'] = true
rescue; end

# ── Câmeras ───────────────────────────────────────────────────────────────────
view = model.active_view
view.zoom_extents

# Câmera 1 — corner shot, canto próximo à entrada, eye-level 1.60m
# Two-point perspective: verticais retas, sem convergência (estilo editorial)
cam1 = Sketchup::Camera.new(${c1Eye}, ${c1Target}, Geom::Vector3d.new(0,0,1))
cam1.fov = 38
begin; cam1.two_point_perspective = true; rescue; end

# Câmera 2 — corner shot, canto oposto, mesmo padrão
cam2 = Sketchup::Camera.new(${c2Eye}, ${c2Target}, Geom::Vector3d.new(0,0,1))
cam2.fov = 38
begin; cam2.two_point_perspective = true; rescue; end

view.camera = cam1
view.write_image({ filename: '${paths.perspective}', width: 1920, height: 1080, antialias: true, compression: 0.92 })
model.pages.add('Vista 1') rescue nil

view.camera = cam2
view.write_image({ filename: '${paths.topDown}', width: 1920, height: 1080, antialias: true, compression: 0.92 })
model.pages.add('Vista 2') rescue nil

# Câmera 3 — planta baixa, projeção ORTOGRÁFICA + corte 1.50m
sp_planta = nil
begin
  g_teto.hidden = true

  # Section plane at z=59" (1.50m).
  # Plane eq [a,b,c,d]: normal [a,b,c] points to the OPEN (visible) side.
  # Normal -Z means "open below z=59" → shows floor plan below 1.5m.
  sp_planta = ents.add_section_plane([0, 0, -1, 59]) rescue nil
  if sp_planta
    sp_planta.activate
  end

  # Orthographic top-down camera — set directly, no send_action
  # (send_action may overwrite rendering options set after it)
  cam_plan = Sketchup::Camera.new(
    Geom::Point3d.new(w / 2.0, l / 2.0, 10000),
    Geom::Point3d.new(w / 2.0, l / 2.0, 0),
    Geom::Vector3d.new(0, 1, 0)
  )
  cam_plan.perspective = false
  view.camera = cam_plan
  view.zoom_extents

  # Rendering options set AFTER camera — Hidden Line: faces white, edges black
  ro_p = model.rendering_options
  ro_p['RenderMode']         = 1
  ro_p['DrawGround']         = false
  ro_p['DrawSky']            = false
  ro_p['BackgroundColor']    = Sketchup::Color.new(255, 255, 255)
  ro_p['DrawSilhouettes']    = true
  ro_p['SilhouetteWidth']    = 2
  ro_p['DisplaySectionCuts'] = true
  ro_p['SectionCutFilled']   = true
  ro_p['SectionCutWidth']    = 2
  model.shadow_info['DisplayShadows'] = false rescue nil

  view.write_image({ filename: '${paths.planta}', width: 1200, height: 1200, antialias: true, compression: 0.92 })
  model.pages.add('Planta') rescue nil
rescue
  nil
ensure
  begin; sp_planta.erase! if sp_planta; rescue; end
  begin; g_teto.hidden = false; rescue; end
  begin
    ro_r = model.rendering_options
    ro_r['RenderMode']      = 3
    ro_r['DrawGround']      = true
    ro_r['DrawSky']         = true
    ro_r['BackgroundColor'] = Sketchup::Color.new(205, 213, 228)
    ro_r['DrawSilhouettes'] = true
    ro_r['SilhouetteWidth'] = 2
    model.shadow_info['DisplayShadows'] = true rescue nil
  rescue; end
  view.camera = cam1
end

# Câmera 4 — corte longitudinal frontal, two-point
begin
  # Vertical plane at y=l*0.45, normal [0,1,0]: 0x+1y+0z-(l*0.45)=0
  sp_corte = ents.add_section_plane([0, 1, 0, -(l*0.45)])
  if sp_corte
    sp_corte.activate
    ro3 = model.rendering_options
    ro3['DisplaySectionCuts'] = true
    ro3['SectionCutFilled']   = true
    cam_c = Sketchup::Camera.new(${cCorteEye}, ${cCorteTarget}, Geom::Vector3d.new(0,0,1))
    cam_c.fov = 45
    begin; cam_c.two_point_perspective = true; rescue; end
    view.camera = cam_c
    model.pages.add('Corte') rescue nil
    sp_corte.erase! rescue nil
  end
rescue; end

view.camera = cam1
"ok"
`.trim()
}
