import type { BriefFormData } from './types'

// ─── material colors ───────────────────────────────────────────────────────────

const FLOOR_RGB: Record<string, [number, number, number]> = {
  'cimento-queimado': [120, 120, 120],
  'ceramica':         [220, 210, 190],
  'madeira':          [160, 110, 60],
  'vinilico':         [150, 140, 130],
  'pedra':            [140, 140, 140],
  'outro':            [160, 160, 160],
}

const WALL_RGB: Record<string, [number, number, number]> = {
  'reboco-pintado': [245, 242, 235],
  'tijolo-aparente': [160, 80, 50],
  'azulejo':         [220, 235, 245],
  'drywall':         [252, 252, 252],
  'outro':           [240, 240, 240],
}

const CEIL_RGB: Record<string, [number, number, number]> = {
  'laje-aparente': [160, 160, 160],
  'forro-gesso':   [252, 252, 252],
  'forro-madeira': [200, 155, 90],
  'steel-deck':    [135, 150, 165],
  'outro':         [245, 245, 245],
}

// ─── dimensions ───────────────────────────────────────────────────────────────

export function getRoomInches(data: BriefFormData): { w: number; l: number; h: number } {
  let w: number, l: number

  if (data.comprimento && data.largura) {
    w = Math.round(data.largura * 12)
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

// ─── ruby builder ─────────────────────────────────────────────────────────────

export function buildRoomRuby(
  data: BriefFormData,
  paths: { perspective: string; topDown: string }
): string {
  const { w, l, h } = getRoomInches(data)

  const [fr, fg, fb] = FLOOR_RGB[data.pisoTipo  ?? 'cimento-queimado']
  const [wr, wg, wb] = WALL_RGB [data.paredeTipo ?? 'reboco-pintado']
  const [cr, cg, cb] = CEIL_RGB [data.tetoTipo   ?? 'laje-aparente']

  const winW = Math.round(w * 0.40)
  const winH = Math.round(h * 0.35)
  const winZ = Math.round(h * 0.40)
  const eps  = 2   // offset to avoid coplanar overlap

  const ep   = data.entradaPos  ?? 'frente'
  const jp   = data.janelasPos  ?? 'so-frente'
  const fixo = data.elementosFixos ?? []

  const doorW = 36
  const doorH = Math.round(h * 0.80)

  // Window quads per wall
  const southWin = ['so-frente', 'frente-lateral'].includes(jp)
  const eastWin  = ['frente-lateral', 'so-lateral'].includes(jp)

  // Door position quads
  const door = {
    frente: `[[${Math.round((w-doorW)/2)},${eps},0],[${Math.round((w+doorW)/2)},${eps},0],[${Math.round((w+doorW)/2)},${eps},${doorH}],[${Math.round((w-doorW)/2)},${eps},${doorH}]]`,
    fundo:  `[[${Math.round((w-doorW)/2)},${l-eps},0],[${Math.round((w+doorW)/2)},${l-eps},0],[${Math.round((w+doorW)/2)},${l-eps},${doorH}],[${Math.round((w-doorW)/2)},${l-eps},${doorH}]]`,
    'lateral-dir': `[[${w-eps},${Math.round((l-doorW)/2)},0],[${w-eps},${Math.round((l+doorW)/2)},0],[${w-eps},${Math.round((l+doorW)/2)},${doorH}],[${w-eps},${Math.round((l-doorW)/2)},${doorH}]]`,
    'lateral-esq': `[[${eps},${Math.round((l-doorW)/2)},0],[${eps},${Math.round((l+doorW)/2)},0],[${eps},${Math.round((l+doorW)/2)},${doorH}],[${eps},${Math.round((l-doorW)/2)},${doorH}]]`,
  }[ep] ?? ''

  const columnCode = fixo.includes('pilares') ? `
# Columns
mcol = mats.add('Columns'); mcol.color = [200, 195, 188]
[[${Math.round(w*0.30)},${Math.round(l*0.30)}],[${Math.round(w*0.70)},${Math.round(l*0.30)}],[${Math.round(w*0.30)},${Math.round(l*0.70)}],[${Math.round(w*0.70)},${Math.round(l*0.70)}]].each do |cx,cy|
  begin
    circ = ents.add_circle([cx,cy,0],[0,0,1],6,12)
    cf = ents.add_face(circ); cf.pushpull(${h}); cf.material = mcol
  rescue; end
end` : ''

  const mezCode = fixo.includes('mezanino') ? `
# Mezzanine
mmez = mats.add('Mez'); mmez.color = [${fr},${fg},${fb}]
begin
  mf = ents.add_face([[${Math.round(w*0.55)},0,${Math.round(h*0.55)}],[${w},0,${Math.round(h*0.55)}],[${w},${Math.round(l*0.45)},${Math.round(h*0.55)}],[${Math.round(w*0.55)},${Math.round(l*0.45)},${Math.round(h*0.55)}]])
  mf.material = mmez
rescue; end` : ''

  // Camera positions
  const camEye    = `Geom::Point3d.new(${Math.round(w*1.3)}, ${Math.round(-l*0.4)}, ${Math.round(h*0.9)})`
  const camTarget = `Geom::Point3d.new(${Math.round(w/2)}, ${Math.round(l/2)}, ${Math.round(h/3)})`
  const topEye    = `Geom::Point3d.new(${Math.round(w/2)}, ${Math.round(l/2)}, ${Math.round(h*4)})`
  const topTarget = `Geom::Point3d.new(${Math.round(w/2)}, ${Math.round(l/2)}, 0)`

  return `
model = Sketchup.active_model
model.start_operation('Otelie Room', true)
ents = model.active_entities
ents.clear!

# Materials
mats = model.materials
mf = mats.add('Floor');   mf.color   = [${fr}, ${fg}, ${fb}]
mw = mats.add('Walls');   mw.color   = [${wr}, ${wg}, ${wb}]
mc = mats.add('Ceiling'); mc.color   = [${cr}, ${cg}, ${cb}]
mwin  = mats.add('Windows'); mwin.color = [160, 210, 235]; mwin.alpha = 0.55
mdoor = mats.add('Door');    mdoor.color = [100, 75, 50]

w = ${w}; l = ${l}; h = ${h}

# Floor
floor = ents.add_face([[0,0,0],[w,0,0],[w,l,0],[0,l,0]])
floor.reverse! if floor.normal.z < 0
floor.material = mf; floor.back_material = mf

# Ceiling
ceil = ents.add_face([[0,0,h],[0,l,h],[w,l,h],[w,0,h]])
ceil.reverse! if ceil.normal.z > 0
ceil.material = mc; ceil.back_material = mc

# Walls
[
  [[0,l,0],[w,l,0],[w,l,h],[0,l,h]],
  [[0,0,0],[0,0,h],[w,0,h],[w,0,0]],
  [[w,0,0],[w,l,0],[w,l,h],[w,0,h]],
  [[0,0,0],[0,0,h],[0,l,h],[0,l,0]],
].each do |pts|
  begin
    face = ents.add_face(pts)
    face.material = mw; face.back_material = mw
  rescue; end
end

${southWin ? `
# Window — south wall
begin
  ws = ents.add_face([[${Math.round((w-winW)/2)},${eps},${winZ}],[${Math.round((w+winW)/2)},${eps},${winZ}],[${Math.round((w+winW)/2)},${eps},${winZ+winH}],[${Math.round((w-winW)/2)},${eps},${winZ+winH}]])
  ws.material = mwin if ws
rescue; end` : ''}

${eastWin ? `
# Window — east wall
begin
  we = ents.add_face([[${w-eps},${Math.round((l-winW)/2)},${winZ}],[${w-eps},${Math.round((l+winW)/2)},${winZ}],[${w-eps},${Math.round((l+winW)/2)},${winZ+winH}],[${w-eps},${Math.round((l-winW)/2)},${winZ+winH}]])
  we.material = mwin if we
rescue; end` : ''}

# Door
${door ? `
begin
  dr = ents.add_face(${door})
  dr.material = mdoor if dr
rescue; end` : ''}

${columnCode}
${mezCode}

model.commit_operation

# Screenshots
view = model.active_view
view.zoom_extents

cam1 = Sketchup::Camera.new(${camEye}, ${camTarget}, Geom::Vector3d.new(0,0,1))
view.camera = cam1
view.write_image({ filename: '${paths.perspective}', width: 1920, height: 1080, antialias: true })

cam2 = Sketchup::Camera.new(${topEye}, ${topTarget}, Geom::Vector3d.new(0,1,0))
view.camera = cam2
view.write_image({ filename: '${paths.topDown}', width: 1024, height: 1024, antialias: true })

view.camera = cam1
"ok"
`.trim()
}
