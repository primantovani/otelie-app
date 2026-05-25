'use client'
import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback, useState } from 'react'
import * as THREE from 'three'

export type SpaceViewer3DHandle = {
  capture: () => { perspective: string; topDown: string }
  captureViews: () => Record<string, string>   // { fundo, frente, dir, esq, planta } as jpeg base64
  addFurniture: (type: FurnitureType) => void
}

export type FurnitureType =
  | 'mesa-redonda' | 'mesa-retangular' | 'sofa' | 'poltrona'
  | 'vitrine' | 'prateleira' | 'luminaria' | 'vaso' | 'banco' | 'balcao'

export type WallSide = 'frente' | 'fundo' | 'lateral-dir' | 'lateral-esq'
export type OpeningKind = 'door' | 'window'
export interface PlacedOpening {
  kind: OpeningKind
  wall: WallSide
  offset: number   // metres along wall from center (+ = right when facing from outside)
  width: number    // metres
  style?: 'wood' | 'glass'
  double?: boolean
  fullHeight?: boolean
}

export const FURNITURE_CATALOG: { type: FurnitureType; label: string; icon: string }[] = [
  { type: 'mesa-redonda',    label: 'Mesa redonda',   icon: '◯' },
  { type: 'mesa-retangular', label: 'Mesa rect.',     icon: '▭' },
  { type: 'sofa',            label: 'Sofá',           icon: '🛋' },
  { type: 'poltrona',        label: 'Poltrona',       icon: '🪑' },
  { type: 'vitrine',         label: 'Vitrine',        icon: '🪟' },
  { type: 'prateleira',      label: 'Prateleira',     icon: '📚' },
  { type: 'luminaria',       label: 'Luminária',      icon: '💡' },
  { type: 'vaso',            label: 'Vaso/Planta',    icon: '🌿' },
  { type: 'banco',           label: 'Banco',          icon: '▬' },
  { type: 'balcao',          label: 'Balcão',         icon: '⬛' },
]

export interface SpaceViewer3DProps {
  comprimento?: number
  largura?: number
  area: number
  alturaPeDireito?: number
  peDireito: string
  plantaForma: string
  janelasPos: string
  entradaPos: string
  fachada: string
  elementosFixos: string[]
  pisoTipo: string
  paredeTipo: string
  tetoTipo: string
  ambientesInternos?: { nome?: string; posicao: string; largura?: number | null; profundidade?: number | null }[]
}

// ─── color / PBR maps ─────────────────────────────────────────────────────────

const FLOOR_COLOR: Record<string, number> = {
  'cimento-queimado': 0xb0a898, 'ceramica': 0xd8c8b4, 'madeira': 0xb87840,
  'vinilico': 0xb0a898, 'pedra': 0x989088, 'outro': 0xb0a898,
}
const WALL_COLOR: Record<string, number> = {
  'reboco-pintado': 0xf8f4ee, 'tijolo-aparente': 0xd08070,
  'azulejo': 0xdcecf8, 'drywall': 0xf5f2ee, 'outro': 0xf0ece4,
}
const CEIL_COLOR: Record<string, number> = {
  'laje-aparente': 0xd0c8c0, 'forro-gesso': 0xfaf8f4,
  'forro-madeira': 0xb88048, 'steel-deck': 0x98a0b0, 'outro': 0xf0ece6,
}
const FLOOR_ROUGH: Record<string, number> = {
  'cimento-queimado': 0.92, 'ceramica': 0.22, 'madeira': 0.68,
  'vinilico': 0.52, 'pedra': 0.88, 'outro': 0.82,
}
const WALL_ROUGH: Record<string, number> = {
  'reboco-pintado': 0.90, 'tijolo-aparente': 0.96,
  'azulejo': 0.10, 'drywall': 0.92, 'outro': 0.88,
}
const WALL_METAL: Record<string, number> = { 'azulejo': 0.05 }
const CEIL_ROUGH: Record<string, number> = {
  'laje-aparente': 0.88, 'forro-gesso': 0.92,
  'forro-madeira': 0.72, 'steel-deck': 0.35, 'outro': 0.88,
}
const CEIL_METAL: Record<string, number> = { 'steel-deck': 0.55 }

// ─── dimensions ───────────────────────────────────────────────────────────────

function getDimensions(props: SpaceViewer3DProps) {
  let w: number, l: number
  if (props.comprimento && props.largura) {
    // largura = front wall width (left-right), comprimento = depth (front-to-back)
    // if comprimento > largura it's likely the AI gave longest=comprimento; swap so the
    // wider dimension always goes left-right (more natural for commercial street fronts)
    const a = props.comprimento, b = props.largura
    w = Math.max(a, b) / 2   // wider → left-right
    l = Math.min(a, b) / 2   // narrower → depth
  } else {
    const r = ({ corredor: 0.30, quadrado: 1.00, retangular: 0.65, 'formato-l': 0.65, irregular: 0.72 })[props.plantaForma] ?? 0.65
    l = Math.sqrt(props.area / r) / 2
    w = (props.area / (l * 2)) / 2
  }
  const h = props.alturaPeDireito ?? (props.peDireito === 'alto' ? 6.5 : props.peDireito === 'baixo' ? 3.8 : 4.8)
  return { w, l, h }
}

// ─── furniture helpers ────────────────────────────────────────────────────────

interface FMats {
  tabletop: THREE.MeshStandardMaterial
  leg: THREE.MeshStandardMaterial
  seat: THREE.MeshStandardMaterial
  counter: THREE.MeshStandardMaterial
  counterTop: THREE.MeshStandardMaterial
  shelf: THREE.MeshStandardMaterial
}

function buildFMats(): FMats {
  return {
    tabletop:   new THREE.MeshStandardMaterial({ color: 0xc09060, roughness: 0.65, metalness: 0 }),
    leg:        new THREE.MeshStandardMaterial({ color: 0x706050, roughness: 0.42, metalness: 0.38 }),
    seat:       new THREE.MeshStandardMaterial({ color: 0x607080, roughness: 0.90, metalness: 0 }),
    counter:    new THREE.MeshStandardMaterial({ color: 0x907060, roughness: 0.70, metalness: 0 }),
    counterTop: new THREE.MeshStandardMaterial({ color: 0x302820, roughness: 0.10, metalness: 0.28 }),
    shelf:      new THREE.MeshStandardMaterial({ color: 0xc0a878, roughness: 0.72, metalness: 0 }),
  }
}

function makeTable(mats: FMats): THREE.Group {
  const g = new THREE.Group()
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 20), mats.tabletop)
  top.position.y = 0.76; top.castShadow = true; top.receiveShadow = true
  g.add(top)
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.73, 8), mats.leg)
  ped.position.y = 0.38; g.add(ped)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.22, 0.04, 12), mats.leg)
  base.position.y = 0.02; g.add(base)
  return g
}

function makeChair(ry: number, offsetX: number, offsetZ: number, mats: FMats): THREE.Group {
  const g = new THREE.Group()
  g.rotation.y = ry
  g.position.set(offsetX, 0, offsetZ)
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.04, 0.38), mats.seat)
  seat.position.y = 0.46; seat.castShadow = true; seat.receiveShadow = true
  g.add(seat)
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.38, 0.04), mats.seat)
  back.position.set(0, 0.67, -0.18)
  g.add(back)
  const legGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.44, 6)
  for (const [lx, lz] of [[-0.16, 0.15], [0.16, 0.15], [-0.16, -0.15], [0.16, -0.15]]) {
    const leg = new THREE.Mesh(legGeo, mats.leg)
    leg.position.set(lx, 0.22, lz)
    g.add(leg)
  }
  return g
}

function makeTableSet(sx: number, sz: number, ep: string, mats: FMats): THREE.Group {
  const group = new THREE.Group()
  group.position.set(sx, 0, sz)
  group.userData.draggable = true

  group.add(makeTable(mats))

  const cr = 0.62
  const chairDefs: [number, number, number][] = [
    [0, -cr, 0],
    [0,  cr, Math.PI],
    [-cr, 0,  Math.PI / 2],
    [ cr, 0, -Math.PI / 2],
  ]
  chairDefs.forEach(([ox, oz, ry]) => {
    const nearEntrance =
      (ep === 'frente'      && sz + oz > sz + cr * 0.4) ||
      (ep === 'fundo'       && sz + oz < sz - cr * 0.4) ||
      (ep === 'lateral-dir' && sx + ox > sx + cr * 0.4) ||
      (ep === 'lateral-esq' && sx + ox < sx - cr * 0.4)
    if (!nearEntrance) group.add(makeChair(ry, ox, oz, mats))
  })
  return group
}

function makeCounter(cw: number, mats: FMats): THREE.Group {
  const group = new THREE.Group()
  group.userData.draggable = true
  const cH = 0.92, cD = 0.65
  const body = new THREE.Mesh(new THREE.BoxGeometry(cw, cH, cD), mats.counter)
  body.position.y = cH / 2; body.castShadow = true; body.receiveShadow = true
  group.add(body)
  const ctop = new THREE.Mesh(new THREE.BoxGeometry(cw + 0.04, 0.05, cD + 0.06), mats.counterTop)
  ctop.position.y = cH + 0.025; ctop.castShadow = true
  group.add(ctop)
  const kick = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.10, 0.06), mats.leg)
  kick.position.set(0, 0.05, cD / 2 - 0.03)
  group.add(kick)
  for (const sy of [1.20, 1.60]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(cw * 0.85, 0.03, 0.28), mats.shelf)
    shelf.position.set(0, sy, -cD / 2 + 0.02)
    group.add(shelf)
  }
  return group
}

// ─── extra furniture makers ───────────────────────────────────────────────────

function sketch(color = 0xa09080, roughness = 0.82): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 })
}

const SKETCH_INK    = 0x28231e   // graphite dark
const SKETCH_INK_LT = 0x8a857e   // light graphite for ceiling/bg lines

function pencilEdges(group: THREE.Group, color = SKETCH_INK) {
  group.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return
    if ((child.material as THREE.Material).transparent) return
    const edges = new THREE.EdgesGeometry(child.geometry, 15)
    child.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color })))
  })
}

function makeMesaRetangular(mats: FMats): THREE.Group {
  const g = new THREE.Group(); g.userData.draggable = true
  // tabletop
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.40, 0.04, 0.80), mats.tabletop)
  top.position.y = 0.75; top.castShadow = true; g.add(top)
  // 4 legs
  const legGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.73, 8)
  for (const [lx, lz] of [[-0.62, -0.32],[0.62, -0.32],[-0.62, 0.32],[0.62, 0.32]]) {
    const leg = new THREE.Mesh(legGeo, mats.leg); leg.position.set(lx, 0.365, lz); g.add(leg)
  }
  // chairs on long sides (2 each)
  for (const [ox, oz, ry] of [
    [-0.38, -0.72, 0],  [0.38, -0.72, 0],
    [-0.38,  0.72, Math.PI], [0.38, 0.72, Math.PI],
  ] as [number,number,number][]) {
    g.add(makeChair(ry, ox, oz, mats))
  }
  return g
}

function makeSofa(mats: FMats): THREE.Group {
  const g = new THREE.Group(); g.userData.draggable = true
  const fabricMat = sketch(0x7a6858)  // linho bege-acastanhado
  const W = 1.80, D = 0.82, H = 0.38, armH = 0.55, backH = 0.50
  // seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), fabricMat)
  seat.position.y = H / 2; seat.castShadow = true; seat.receiveShadow = true; g.add(seat)
  // backrest
  const back = new THREE.Mesh(new THREE.BoxGeometry(W, backH, 0.14), fabricMat)
  back.position.set(0, H + backH / 2, -D / 2 + 0.07); g.add(back)
  // armrests
  for (const ax of [-W / 2 + 0.07, W / 2 - 0.07]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, armH, D), fabricMat)
    arm.position.set(ax, armH / 2, 0); g.add(arm)
  }
  // legs (4 small)
  const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.12, 6)
  const legM = sketch(0x4a3e34)  // ferro escuro
  for (const [lx, lz] of [[-0.78,-0.34],[0.78,-0.34],[-0.78,0.34],[0.78,0.34]]) {
    const leg = new THREE.Mesh(legGeo, legM); leg.position.set(lx, 0.06, lz); g.add(leg)
  }
  return g
}

function makePoltrona(mats: FMats): THREE.Group {
  const g = new THREE.Group(); g.userData.draggable = true
  const fabricMat = sketch(0x6a7870)  // veludo verde-acinzentado
  const W = 0.82, D = 0.80, H = 0.40
  const seat = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), fabricMat)
  seat.position.y = H / 2; seat.castShadow = true; seat.receiveShadow = true; g.add(seat)
  const back = new THREE.Mesh(new THREE.BoxGeometry(W, 0.45, 0.12), fabricMat)
  back.position.set(0, H + 0.225, -D / 2 + 0.06); g.add(back)
  for (const ax of [-W / 2 + 0.06, W / 2 - 0.06]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.50, D), fabricMat)
    arm.position.set(ax, 0.25, 0); g.add(arm)
  }
  const legM = sketch(0x4a3e34)
  const lGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.12, 6)
  for (const [lx, lz] of [[-0.32,-0.30],[0.32,-0.30],[-0.32,0.30],[0.32,0.30]]) {
    const leg = new THREE.Mesh(lGeo, legM); leg.position.set(lx, 0.06, lz); g.add(leg)
  }
  return g
}

function makeVitrine(): THREE.Group {
  const g = new THREE.Group(); g.userData.draggable = true
  const frameMat = sketch(0x2e2820)  // ferro forjado
  const glassMat = new THREE.MeshLambertMaterial({ color: 0xeef4f8, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
  const W = 0.90, H = 1.40, D = 0.45
  // frame box (solid edges)
  for (const [bw, bh, bd, px, py, pz] of [
    [W, 0.04, D, 0, 0,    0],     // bottom
    [W, 0.04, D, 0, H,    0],     // top
    [0.04, H, D, -W/2, H/2, 0],   // left
    [0.04, H, D,  W/2, H/2, 0],   // right
  ] as [number,number,number,number,number,number][]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), frameMat)
    b.position.set(px, py, pz); b.castShadow = true; g.add(b)
  }
  // glass sides
  for (const [gw, gh, gd, px, py, pz] of [
    [W, H, 0.01, 0, H/2,  D/2],
    [W, H, 0.01, 0, H/2, -D/2],
    [0.01, H, D, -W/2+0.02, H/2, 0],
    [0.01, H, D,  W/2-0.02, H/2, 0],
  ] as [number,number,number,number,number,number][]) {
    const gp = new THREE.Mesh(new THREE.BoxGeometry(gw, gh, gd), glassMat)
    gp.position.set(px, py, pz); g.add(gp)
  }
  // 2 internal shelves
  for (const sy of [H * 0.35, H * 0.65]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(W - 0.06, 0.02, D - 0.04), sketch(0xc8d8e0))
    s.position.set(0, sy, 0); g.add(s)
  }
  return g
}

function makePrateleira(): THREE.Group {
  const g = new THREE.Group(); g.userData.draggable = true
  const woodMat = sketch(0xb08858)  // pinho natural
  const W = 1.20, H = 1.60, D = 0.30
  // side panels
  for (const px of [-W / 2 + 0.02, W / 2 - 0.02]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.03, H, D), woodMat)
    p.position.set(px, H / 2, 0); p.castShadow = true; g.add(p)
  }
  // shelves (4)
  for (const sy of [0.02, H * 0.28, H * 0.56, H * 0.84]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(W, 0.03, D), woodMat)
    s.position.set(0, sy, 0); s.castShadow = true; s.receiveShadow = true; g.add(s)
  }
  // back panel
  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.02), sketch(0x604830))
  back.position.set(0, H / 2, -D / 2 + 0.01); g.add(back)
  return g
}

function makeLuminaria(): THREE.Group {
  const g = new THREE.Group(); g.userData.draggable = true
  const metalMat = sketch(0x888070)  // latão envelhecido
  const shadeMat = sketch(0xe8d8b0)  // tecido creme
  // base disc
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.04, 14), metalMat)
  base.position.y = 0.02; g.add(base)
  // pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.60, 8), metalMat)
  pole.position.y = 0.82; g.add(pole)
  // shade (cone)
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.32, 16, 1, true), shadeMat)
  shade.position.y = 1.68; shade.rotation.x = Math.PI; g.add(shade)
  // shade top cap
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 8), metalMat)
  cap.position.y = 1.82; g.add(cap)
  return g
}

function makeVaso(): THREE.Group {
  const g = new THREE.Group(); g.userData.draggable = true
  const potMat   = sketch(0x8a6850)   // terracota
  const soilMat  = sketch(0x2a1e14)   // terra escura
  const plantMat = sketch(0x4a7040)   // verde folha
  // pot body (tapered)
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.38, 16), potMat)
  pot.position.y = 0.19; pot.castShadow = true; pot.receiveShadow = true; g.add(pot)
  // soil surface
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.03, 16), soilMat)
  soil.position.y = 0.37; g.add(soil)
  // foliage (3 spheres, offset for natural look)
  for (const [ox, oy, oz, r] of [[0,0.72,0,0.28],[-0.14,0.60,0.08,0.18],[0.12,0.58,-0.10,0.16]] as [number,number,number,number][]) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), plantMat)
    leaf.position.set(ox, oy, oz); leaf.castShadow = true; g.add(leaf)
  }
  // thin stem
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.34, 6), sketch(0x3a5030))
  stem.position.y = 0.55; g.add(stem)
  return g
}

function makeBanco(): THREE.Group {
  const g = new THREE.Group(); g.userData.draggable = true
  const woodMat = sketch(0xb89060)   // madeira mel
  const legMat  = sketch(0x504030)
  // seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.06, 0.38), woodMat)
  seat.position.y = 0.46; seat.castShadow = true; seat.receiveShadow = true; g.add(seat)
  // 4 legs
  const lGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.43, 8)
  for (const [lx, lz] of [[-0.52,-0.14],[0.52,-0.14],[-0.52,0.14],[0.52,0.14]]) {
    const leg = new THREE.Mesh(lGeo, legMat); leg.position.set(lx, 0.215, lz); g.add(leg)
  }
  // stretcher
  const str = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.025, 0.025), legMat)
  str.position.y = 0.22; g.add(str)
  return g
}

function makeFurniture(type: FurnitureType, mats: FMats): THREE.Group {
  let g: THREE.Group
  switch (type) {
    case 'mesa-redonda':    g = makeTableSet(0, 0, '', mats); break
    case 'mesa-retangular': g = makeMesaRetangular(mats); break
    case 'sofa':            g = makeSofa(mats); break
    case 'poltrona':        g = makePoltrona(mats); break
    case 'vitrine':         g = makeVitrine(); break
    case 'prateleira':      g = makePrateleira(); break
    case 'luminaria':       g = makeLuminaria(); break
    case 'vaso':            g = makeVaso(); break
    case 'banco':           g = makeBanco(); break
    case 'balcao':          g = makeCounter(2.4, mats); break
    default:                g = makeVaso(); break
  }
  g.traverse(o => { if (o instanceof THREE.Mesh && !((o.material as THREE.Material).transparent)) o.castShadow = true })
  return g
}

// ─── door ─────────────────────────────────────────────────────────────────────
// Canonical orientation: panel width along +X, height along +Y, opens toward +Z.
// Caller rotates the group by `ry` to face the correct wall.

function makeDoor3D(dW: number, dH: number, style: 'wood' | 'glass' = 'wood', isDouble = false): THREE.Group {
  const g = new THREE.Group()

  const panelMat = style === 'glass'
    ? new THREE.MeshStandardMaterial({ color: 0x88c8e8, transparent: true, opacity: 0.42, roughness: 0.05, metalness: 0.10, side: THREE.DoubleSide })
    : new THREE.MeshStandardMaterial({ color: 0xa87848, roughness: 0.68, metalness: 0, side: THREE.DoubleSide })
  const frmMat   = new THREE.MeshStandardMaterial({ color: 0xc0b090, roughness: 0.58, metalness: 0, side: THREE.DoubleSide })
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x888878, roughness: 0.22, metalness: 0.72 })

  const THICK = 0.044
  const FW    = 0.09
  const FD    = 0.14
  const OPEN  = Math.PI * 0.22
  const SEGS  = 24

  function makeLeaf(leafW: number, pivotX: number, openAngle: number, knobSide: 1 | -1) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(leafW, dH, THICK), panelMat)
    panel.position.set(knobSide * leafW / 2, dH / 2, 0)
    panel.castShadow = true
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 6), metalMat)
    knob.position.set(knobSide * (leafW - 0.13), dH / 2, THICK / 2 + 0.036)
    knob.castShadow = true
    const pivot = new THREE.Group()
    pivot.position.set(pivotX, 0, 0)
    pivot.rotation.y = openAngle
    pivot.add(panel, knob)
    g.add(pivot)
  }

  if (isDouble) {
    const leafW = dW / 2
    makeLeaf(leafW, -dW / 2, +OPEN, +1)
    makeLeaf(leafW,  dW / 2, -OPEN, -1)
  } else {
    makeLeaf(dW, -dW / 2, +OPEN, +1)
  }

  // ── frame: top + two sides ─────────────────────────────────────────────
  const topBar = new THREE.Mesh(new THREE.BoxGeometry(dW + FW * 2, FW, FD), frmMat)
  topBar.position.set(0, dH + FW / 2, 0); topBar.castShadow = true; g.add(topBar)
  for (const sx of [-1, 1] as const) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(FW, dH + FW, FD), frmMat)
    side.position.set(sx * (dW / 2 + FW / 2), dH / 2, 0); side.castShadow = true; g.add(side)
  }
  if (isDouble) {
    const mid = new THREE.Mesh(new THREE.BoxGeometry(FW * 0.7, dH, FD * 0.8), frmMat)
    mid.position.set(0, dH / 2, 0); g.add(mid)
  }

  return g
}

// ─── procedural textures ──────────────────────────────────────────────────────

function makeFloorTexture(key: string): { texture: THREE.CanvasTexture; tileW: number; tileH: number } | null {
  const S = 512
  const canvas = document.createElement('canvas')
  canvas.width = S; canvas.height = S
  const ctx = canvas.getContext('2d')!
  let tileW = 1.0, tileH = 1.0

  if (key === 'cimento-queimado') {
    // burnished concrete: mottled base + trowel marks + aggregate
    ctx.fillStyle = '#a89880'; ctx.fillRect(0, 0, S, S)
    for (let i = 0; i < 90; i++) {
      const x = Math.random()*S, y = Math.random()*S
      const rx = Math.random()*55+15, ry = rx*(0.4+Math.random()*0.7)
      ctx.fillStyle = `rgba(${Math.random()>.5?'255,248,240':'75,62,50'},${(Math.random()*0.05+0.01).toFixed(3)})`
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, Math.random()*Math.PI, 0, Math.PI*2); ctx.fill()
    }
    ctx.save(); ctx.rotate(Math.PI/5)
    for (let i = -S; i < S*2; i += 18) {
      ctx.fillStyle = `rgba(0,0,0,${(Math.random()*0.018+0.003).toFixed(3)})`
      ctx.fillRect(i, -S, 1, S*3)
    }
    ctx.restore()
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = `rgba(210,195,175,${(Math.random()*0.28+0.06).toFixed(3)})`
      ctx.beginPath(); ctx.arc(Math.random()*S, Math.random()*S, Math.random()*1.8+0.3, 0, Math.PI*2); ctx.fill()
    }

  } else if (key === 'ceramica') {
    tileW = tileH = 0.60
    ctx.fillStyle = '#d8c8b4'; ctx.fillRect(0, 0, S, S)
    const gr = ctx.createRadialGradient(S/2, S/2, 0, S/2, S/2, S*0.52)
    gr.addColorStop(0, 'rgba(255,250,240,0.20)'); gr.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = gr; ctx.fillRect(0, 0, S, S)
    const G = 10; ctx.fillStyle = '#b0a090'
    ctx.fillRect(0, 0, S, G); ctx.fillRect(0, S-G, S, G)
    ctx.fillRect(0, 0, G, S); ctx.fillRect(S-G, 0, G, S)
    for (let i = 0; i < 280; i++) {
      ctx.fillStyle = `rgba(${Math.random()>.5?'255,250,242':'172,155,138'},${(Math.random()*0.035).toFixed(3)})`
      ctx.beginPath(); ctx.arc(Math.random()*S, Math.random()*S, Math.random()*2.5+0.5, 0, Math.PI*2); ctx.fill()
    }

  } else if (key === 'madeira') {
    const tones = [0xb07838, 0xb88040, 0xa87030, 0xc08848, 0xb07030, 0xb88038, 0xa86e34]
    const plankPx = Math.round(S * 0.155)
    let yy = 0; let pi = 0
    while (yy < S) {
      const ph = Math.min(plankPx, S - yy)
      const tone = tones[pi % tones.length]
      const r = (tone >> 16) & 0xff, g = (tone >> 8) & 0xff, b = tone & 0xff
      ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fillRect(0, yy, S, ph)
      for (let gi = 0; gi < 14; gi++) {
        const gy = yy + ph * gi / 14 + (Math.random()-.5)*3
        ctx.strokeStyle = `rgba(0,0,0,${(Math.random()*0.055+0.018).toFixed(3)})`
        ctx.lineWidth = Math.random()*1.2+0.2; ctx.beginPath(); ctx.moveTo(0, gy)
        for (let sx = 0; sx <= S; sx += 32) ctx.lineTo(sx, gy + Math.sin(sx*0.008+pi*1.3)*2.5)
        ctx.stroke()
      }
      const eg = ctx.createLinearGradient(0, yy, 0, yy+ph)
      eg.addColorStop(0, 'rgba(255,255,255,0.10)'); eg.addColorStop(0.08, 'rgba(255,255,255,0)')
      eg.addColorStop(0.92, 'rgba(0,0,0,0)');       eg.addColorStop(1, 'rgba(0,0,0,0.12)')
      ctx.fillStyle = eg; ctx.fillRect(0, yy, S, ph)
      if (yy + ph < S) { ctx.fillStyle = 'rgba(45,28,12,0.55)'; ctx.fillRect(0, yy+ph-2, S, 3) }
      yy += ph; pi++
    }

  } else if (key === 'pedra') {
    tileW = tileH = 0.80
    ctx.fillStyle = '#807870'; ctx.fillRect(0, 0, S, S)
    for (let i = 0; i < 70; i++) {
      const x = Math.random()*S, y = Math.random()*S, rx = Math.random()*55+12, ry = rx*(0.4+Math.random()*.8)
      ctx.fillStyle = `rgba(${Math.random()>.5?'148,138,126':'85,75,66'},${(Math.random()*0.10+0.02).toFixed(3)})`
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, Math.random()*Math.PI, 0, Math.PI*2); ctx.fill()
    }
    for (let v = 0; v < 10; v++) {
      ctx.strokeStyle = `rgba(${Math.random()>.5?'175,165,152':'55,46,38'},${(Math.random()*0.12+0.04).toFixed(3)})`
      ctx.lineWidth = Math.random()*1.8+0.4; ctx.beginPath()
      let vx = Math.random()*S, vy = Math.random()*S; ctx.moveTo(vx, vy)
      for (let s = 0; s < 5; s++) { vx += (Math.random()-.4)*110; vy += (Math.random()-.4)*110; ctx.lineTo(vx, vy) }
      ctx.stroke()
    }

  } else if (key === 'vinilico') {
    tileW = tileH = 0.50
    ctx.fillStyle = '#b0a090'; ctx.fillRect(0, 0, S, S)
    const sq = S/4
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
      if ((row+col)%2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(col*sq+3, row*sq+3, sq-6, sq-6) }
    }
    for (let i = 0; i < 180; i++) {
      ctx.fillStyle = `rgba(0,0,0,${(Math.random()*0.018).toFixed(3)})`
      ctx.beginPath(); ctx.arc(Math.random()*S, Math.random()*S, Math.random()*1.5, 0, Math.PI*2); ctx.fill()
    }

  } else {
    return null
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  return { texture, tileW, tileH }
}

function makeWallTexture(key: string): { texture: THREE.CanvasTexture; tileW: number; tileH: number } | null {
  let W = 512, H = 512, tileW = 1.0, tileH = 1.0
  if      (key === 'tijolo-aparente') { W = 512; H = 256; tileW = 0.42; tileH = 0.21 }
  else if (key === 'azulejo')         { tileW = tileH = 0.30 }
  else if (key === 'reboco-pintado' || key === 'drywall') { tileW = tileH = 1.0 }
  else return null

  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!

  if (key === 'tijolo-aparente') {
    const bW = W/2, bH = H/3, m = 8
    ctx.fillStyle = '#b8a898'; ctx.fillRect(0, 0, W, H)
    const brickTones = ['#c07060','#b86858','#c87868','#b06050','#be7262','#c27060','#b56050']
    for (let row = 0; row < 3; row++) {
      const off = (row % 2) * (bW / 2)
      for (let col = -1; col <= 2; col++) {
        const bx = col * bW + off, by = row * bH
        if (bx + bW - m <= 0 || bx >= W) continue
        ctx.fillStyle = brickTones[(row * 3 + col + 10) % brickTones.length]
        ctx.fillRect(bx + m/2, by + m/2, bW - m, bH - m)
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(bx+m/2, by+m/2, bW-m, Math.round(bH*0.14))
        ctx.fillStyle = 'rgba(0,0,0,0.09)';       ctx.fillRect(bx+m/2, by+bH-m-Math.round(bH*0.16), bW-m, Math.round(bH*0.16))
        for (let n = 0; n < 12; n++) {
          const nx = bx+m/2+Math.random()*(bW-m), ny = by+m/2+Math.random()*(bH-m)
          ctx.fillStyle = `rgba(${Math.random()>.5?'255,245,235':'80,55,45'},${(Math.random()*0.06).toFixed(3)})`
          ctx.beginPath(); ctx.arc(nx, ny, Math.random()*4+1, 0, Math.PI*2); ctx.fill()
        }
      }
    }

  } else if (key === 'azulejo') {
    ctx.fillStyle = '#b8d0e0'; ctx.fillRect(0, 0, W, H)
    const gr = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W*0.55)
    gr.addColorStop(0, 'rgba(255,255,255,0.24)'); gr.addColorStop(0.65, 'rgba(255,255,255,0.06)'); gr.addColorStop(1, 'rgba(0,0,0,0.05)')
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H)
    const G = 8; ctx.fillStyle = '#7888a0'
    ctx.fillRect(0, 0, W, G); ctx.fillRect(0, H-G, W, G)
    ctx.fillRect(0, 0, G, H); ctx.fillRect(W-G, 0, G, H)

  } else if (key === 'reboco-pintado') {
    // Very light warm plaster — near-white with barely-there texture
    ctx.fillStyle = '#f2ede7'; ctx.fillRect(0, 0, W, H)
    for (let i = 0; i < 80; i++) {
      const x = Math.random()*W, y = Math.random()*H, rx = Math.random()*18+4, ry = rx*(0.35+Math.random()*.65)
      ctx.fillStyle = `rgba(${Math.random()>.6?'255,254,252':'220,212,202'},${(Math.random()*0.022).toFixed(3)})`
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, Math.random()*Math.PI, 0, Math.PI*2); ctx.fill()
    }

  } else if (key === 'drywall') {
    ctx.fillStyle = '#f0ede8'; ctx.fillRect(0, 0, W, H)
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(255,255,255,${(Math.random()*0.015).toFixed(3)})`
      ctx.fillRect(Math.random()*W, Math.random()*H, Math.random()*30+5, 1)
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  return { texture, tileW, tileH }
}

// ─── scene builder ────────────────────────────────────────────────────────────

function buildScene(props: SpaceViewer3DProps, extras: PlacedOpening[] = []): { scene: THREE.Scene; fMats: FMats } {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xfff8f0)

  const { w, l, h } = getDimensions(props)
  const ep = props.entradaPos

  const floorKey = props.pisoTipo   || 'cimento-queimado'
  const wallKey  = props.paredeTipo || 'reboco-pintado'
  const ceilKey  = props.tetoTipo   || 'forro-gesso'

  // ── floor texture ─────────────────────────────────────────────────────────
  const floorTex = makeFloorTexture(floorKey)
  if (floorTex) {
    floorTex.texture.repeat.set((w * 2) / floorTex.tileW, (l * 2) / floorTex.tileH)
  }

  // ── materials ─────────────────────────────────────────────────────────────
  const wallMat = new THREE.MeshStandardMaterial({
    color:     WALL_COLOR[wallKey] ?? 0xf8f4ee,
    roughness: WALL_ROUGH[wallKey] ?? 0.88,
    metalness: WALL_METAL[wallKey] ?? 0,
    side: THREE.DoubleSide,
  })
  const floorMat = new THREE.MeshStandardMaterial({
    ...(floorTex ? { map: floorTex.texture, color: 0xffffff } : { color: FLOOR_COLOR[floorKey] ?? 0xb0a898 }),
    roughness: FLOOR_ROUGH[floorKey] ?? 0.85,
    metalness: 0,
    side: THREE.DoubleSide,
  })
  const ceilMat = new THREE.MeshStandardMaterial({
    color:     CEIL_COLOR[ceilKey] ?? 0xfaf8f4,
    roughness: CEIL_ROUGH[ceilKey] ?? 0.90,
    metalness: CEIL_METAL[ceilKey] ?? 0,
    side: THREE.DoubleSide,
  })
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xb8d8e8, transparent: true, opacity: 0.28,
    roughness: 0.05, metalness: 0.10, side: THREE.DoubleSide,
  })
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xc0b090, roughness: 0.58, metalness: 0 })

  // ── ground plane (lighter, infinite impression) ───────────────────────────
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xfaf7f2, roughness: 0.92, metalness: 0 })
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.002
  ground.receiveShadow = false   // no external shadows — misleading in planta view
  scene.add(ground)

  // Infinite background grid — 200 m, 1 m cells, fades in perspective
  const bgGrid = new THREE.GridHelper(200, 200, 0x9090a0, 0xc0c0d0)
  bgGrid.position.y = 0.001
  const bgMats = Array.isArray(bgGrid.material) ? bgGrid.material : [bgGrid.material]
  bgMats.forEach(m => { (m as THREE.LineBasicMaterial).transparent = true; (m as THREE.LineBasicMaterial).opacity = 0.28 })
  scene.add(bgGrid)

  // ── thick walls with perforation support ──────────────────────────────────
  // Each wall is built from BoxGeometry panels (DoubleSide, thickness T) that
  // leave gaps where PlacedOpening extras are positioned.
  // This makes manually placed doors/windows actually cut through the wall.
  const T = 0.15   // wall thickness in metres
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x706860, transparent: true, opacity: 0.50 })

  // Helper: add one wall panel (slab) + its edge lines
  function addPanel(
    pw: number, ph: number,  // panel width, height
    isFB: boolean,           // front-back wall (spans x) vs left-right (spans z)
    spanCx: number,          // centre along span axis
    slabCenter: number,      // centre along the thickness axis (x or z in world)
    yCen: number,            // centre Y
  ) {
    if (pw < 0.02 || ph < 0.02) return
    const gw = isFB ? pw : T
    const gd = isFB ? T  : pw
    const geo = new THREE.BoxGeometry(gw, ph, gd)
    const mesh = new THREE.Mesh(geo, wallMat)
    mesh.position.set(isFB ? spanCx : slabCenter, yCen, isFB ? slabCenter : spanCx)
    mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh)
    const el = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat.clone())
    el.position.copy(mesh.position); scene.add(el)
  }

  // Build one wall side, cutting holes for its openings
  function buildWall(side: WallSide) {
    const isFB   = side === 'frente' || side === 'fundo'
    const span   = isFB ? w * 2 : l * 2    // interior span in metres
    const halfSp = span / 2

    // World position of the slab centre (interior face ± T/2)
    const slabC =
      side === 'fundo'       ? -(l + T / 2) :
      side === 'frente'      ?  (l + T / 2) :
      side === 'lateral-dir' ?  (w + T / 2) :
                               -(w + T / 2)

    // Openings on this wall from extras
    type Hole = { cx: number; opW: number; y0: number; y1: number }
    const holes: Hole[] = extras
      .filter(op => op.wall === side)
      .map(op => {
        const opH = op.kind === 'door'
          ? Math.min(h * 0.80, 3.0)
          : (op.fullHeight ? h * 0.96 : Math.min(h * 0.40, 1.8))
        const opCY = op.kind === 'door'
          ? opH / 2
          : (op.fullHeight ? h * 0.5 : h * 0.58)
        return { cx: op.offset, opW: op.width, y0: opCY - opH / 2, y1: opCY + opH / 2 }
      })

    if (holes.length === 0) {
      addPanel(span, h, isFB, 0, slabC, h / 2)
      return
    }

    const sorted = [...holes].sort((a, b) => a.cx - b.cx)

    // Vertical strips (full height) between / outside holes
    const xBreaks = [-halfSp, ...sorted.flatMap(ho => [ho.cx - ho.opW / 2, ho.cx + ho.opW / 2]), halfSp]
    for (let i = 0; i < xBreaks.length - 1; i += 2) {
      const pw = xBreaks[i + 1] - xBreaks[i]
      addPanel(pw, h, isFB, (xBreaks[i] + xBreaks[i + 1]) / 2, slabC, h / 2)
    }

    // Above / below each hole
    for (const ho of sorted) {
      const aboveH = h - ho.y1
      if (aboveH > 0.02) addPanel(ho.opW, aboveH, isFB, ho.cx, slabC, ho.y1 + aboveH / 2)
      if (ho.y0  > 0.02) addPanel(ho.opW, ho.y0,  isFB, ho.cx, slabC, ho.y0  / 2)
    }
  }

  // Build all 4 walls — user places openings manually via planta tool
  buildWall('fundo')
  buildWall('frente')
  buildWall('lateral-dir')
  buildWall('lateral-esq')

  // ── floor slab ────────────────────────────────────────────────────────────
  const floorSlabGeo = new THREE.BoxGeometry(w * 2 + T * 2, T, l * 2 + T * 2)
  const floorSlabMesh = new THREE.Mesh(floorSlabGeo, floorMat)
  floorSlabMesh.position.set(0, -T / 2, 0)   // top of slab at y=0 (interior floor level)
  floorSlabMesh.receiveShadow = true; scene.add(floorSlabMesh)
  scene.add(new THREE.LineSegments(new THREE.EdgesGeometry(floorSlabGeo), edgeMat.clone())
    .translateY(-T / 2))

  // ── ceiling plane (BackSide) ──────────────────────────────────────────────
  // BackSide + normal pointing UP (+Y after rotation.x=+π/2):
  //   • camera above (planta): front side → culled → room visible from above ✓
  //   • camera inside/below: back side → renders → ceiling visible from inside ✓
  // rotation.x = -π/2 → normal points +Y (up).
  // BackSide = renders from the side OPPOSITE to normal = below (-Y) = interior camera sees it ✓
  // Planta camera above (+Y side) sees the FrontSide → BackSide culls it → invisible ✓
  const ceilPlane = new THREE.Mesh(new THREE.PlaneGeometry(w * 2, l * 2), ceilMat.clone())
  ;(ceilPlane.material as THREE.MeshStandardMaterial).side = THREE.BackSide
  ceilPlane.rotation.x = -Math.PI / 2
  ceilPlane.position.y = h
  scene.add(ceilPlane)

  // ── room floor grid (1 m, matches room footprint) ─────────────────────────
  const gridSize = Math.max(w * 2, l * 2)
  const gridDivs = Math.max(2, Math.round(gridSize))
  const gridHelper = new THREE.GridHelper(gridSize, gridDivs, 0x706860, 0x908880)
  gridHelper.position.y = 0.006
  const gridMats = Array.isArray(gridHelper.material) ? gridHelper.material : [gridHelper.material]
  gridMats.forEach(m => { (m as THREE.LineBasicMaterial).transparent = true; (m as THREE.LineBasicMaterial).opacity = 0.60 })
  scene.add(gridHelper)

  // ── lighting ──────────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.7))
  scene.add(new THREE.HemisphereLight(0xfff8f0, 0xe0d8c0, 0.5))

  // Key light from entrance side — enters through the open face, illuminates interior
  // Light mostly overhead so shadows are short — avoids misleading long diagonals in planta
  const keyLight = new THREE.DirectionalLight(0xfff8e8, 1.2)
  if      (ep === 'frente')      keyLight.position.set(w * 0.3,  h * 6.0,  l * 1.0)
  else if (ep === 'fundo')       keyLight.position.set(w * 0.3,  h * 6.0, -l * 1.0)
  else if (ep === 'lateral-dir') keyLight.position.set( w * 1.0, h * 6.0,  l * 0.3)
  else                           keyLight.position.set(-w * 1.0, h * 6.0,  l * 0.3)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(1024, 1024)
  const sr = Math.max(w, l) * 4.0   // wider frustum so shadow falls on ground plane too
  keyLight.shadow.camera.left = -sr; keyLight.shadow.camera.right = sr
  keyLight.shadow.camera.top  =  sr; keyLight.shadow.camera.bottom = -sr
  keyLight.shadow.camera.near = 0.5
  keyLight.shadow.camera.far  = Math.max(w, l) * 14
  keyLight.shadow.radius = 4
  keyLight.shadow.bias   = -0.001
  scene.add(keyLight)

  // Fill from opposite side — softens shadows on back wall
  const fillLight = new THREE.DirectionalLight(0xd8e8f8, 0.5)
  if      (ep === 'frente')      fillLight.position.set(-w * 0.5, h * 1.0, -l * 2.0)
  else if (ep === 'fundo')       fillLight.position.set(-w * 0.5, h * 1.0,  l * 2.0)
  else if (ep === 'lateral-dir') fillLight.position.set(-w * 2.0, h * 1.0, -l * 0.5)
  else                           fillLight.position.set( w * 2.0, h * 1.0, -l * 0.5)
  scene.add(fillLight)

  // ── columns ───────────────────────────────────────────────────────────────
  if (props.elementosFixos.includes('pilares')) {
    const colMat = new THREE.MeshStandardMaterial({ color: WALL_COLOR[wallKey] ?? 0xe0d8cc, roughness: 0.88, metalness: 0 })
    const colGeo = new THREE.CylinderGeometry(0.18, 0.18, h, 16)
    for (const [cx, cz] of [[-w*0.35,-l*0.35],[w*0.35,-l*0.35],[-w*0.35,l*0.35],[w*0.35,l*0.35]]) {
      const col = new THREE.Mesh(colGeo, colMat)
      col.position.set(cx, h / 2, cz)
      col.castShadow = true; col.receiveShadow = true
      scene.add(col)
    }
  }

  // ── mezzanine ─────────────────────────────────────────────────────────────
  if (props.elementosFixos.includes('mezanino')) {
    const mezMat = new THREE.MeshStandardMaterial({ color: FLOOR_COLOR[floorKey] ?? 0xa89880, roughness: 0.75, metalness: 0 })
    const mez = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.14, l * 0.75), mezMat)
    mez.position.set(w * 0.2, h * 0.55, -l * 0.1)
    mez.castShadow = true; mez.receiveShadow = true; scene.add(mez)
    const railMat = new THREE.MeshStandardMaterial({ color: 0x606050, roughness: 0.55, metalness: 0.30 })
    const rail = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.04, 0.04), railMat)
    rail.position.set(w * 0.2, h * 0.55 + 0.52, -l * 0.48)
    rail.castShadow = true; scene.add(rail)
  }

  // ── furniture materials ───────────────────────────────────────────────────
  const fMats: FMats = buildFMats()

  // ── manually placed openings (click-to-place) ────────────────────────────
  const fT = 0.06
  for (const op of extras) {
    let ox = 0, oz = 0, ory = 0
    const DOFF2 = 0.08
    if      (op.wall === 'frente')       { ox = op.offset; oz =  l - DOFF2; ory = Math.PI }
    else if (op.wall === 'fundo')        { ox = op.offset; oz = -l + DOFF2; ory = 0 }
    else if (op.wall === 'lateral-dir')  { ox =  w - DOFF2; oz = op.offset; ory = -Math.PI / 2 }
    else                                  { ox = -w + DOFF2; oz = op.offset; ory =  Math.PI / 2 }
    if (op.kind === 'door') {
      const g = makeDoor3D(op.width, Math.min(h * 0.80, 3.0), op.style ?? 'wood', op.double ?? false)
      g.position.set(ox, 0, oz); g.rotation.y = ory; scene.add(g)
    } else {
      const winH2 = op.fullHeight ? h * 0.96 : Math.min(h * 0.40, 1.8)
      const winY2 = op.fullHeight ? h * 0.5  : h * 0.58
      const wg = new THREE.Mesh(new THREE.PlaneGeometry(op.width, winH2), glassMat)
      wg.position.set(ox, winY2, oz); wg.rotation.y = ory; scene.add(wg)
      for (const [fw2, fh2, lx2, ly2] of [
        [op.width + fT, fT, 0,  winH2 / 2 + fT / 2],
        [op.width + fT, fT, 0, -winH2 / 2 - fT / 2],
        [fT, winH2 + fT,  op.width / 2 + fT / 2, 0],
        [fT, winH2 + fT, -op.width / 2 - fT / 2, 0],
      ] as [number, number, number, number][]) {
        const bar = new THREE.Mesh(new THREE.PlaneGeometry(fw2, fh2), frameMat)
        const lxv = new THREE.Vector3(lx2, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), ory)
        bar.position.set(ox + lxv.x, winY2 + ly2, oz + lxv.z); bar.rotation.y = ory; scene.add(bar)
      }
    }
  }

  return { scene, fMats }
}

// compute a camera radius that places the camera inside the room at a given theta angle
// fill: 0–1, how deep into the room (0.5 = halfway between center and wall)
function interiorDist(w: number, l: number, theta: number, fill = 0.65): number {
  const sAbs = Math.max(0.08, Math.abs(Math.sin(theta)))
  const cAbs = Math.max(0.08, Math.abs(Math.cos(theta)))
  const maxDist = Math.min((w - 0.25) / sAbs, (l - 0.25) / cAbs)
  return Math.max(0.5, maxDist * fill)
}

// ─── component ────────────────────────────────────────────────────────────────

const SpaceViewer3D = forwardRef<SpaceViewer3DHandle, SpaceViewer3DProps>(function SpaceViewer3D(props, ref) {
  const containerRef     = useRef<HTMLDivElement>(null)
  const rendererRef      = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef         = useRef<THREE.Scene | null>(null)
  const cameraRef        = useRef<THREE.PerspectiveCamera | null>(null)
  const frameRef         = useRef<number>(0)
  const draggableRef       = useRef<THREE.Group[]>([])
  const userFurnitureRef   = useRef<THREE.Group[]>([])
  const fMatsRef           = useRef<FMats | null>(null)

  // orbit state
  const isOrbitRef       = useRef(false)
  const lastMouseRef     = useRef({ x: 0, y: 0 })
  // theta = horizontal angle; phi only toggles planta mode (phi < 0.15)
  const camAngleRef      = useRef({ theta: 0.55, phi: 0.90 })
  const camRadiusRef     = useRef(0)          // horizontal distance from center
  const camHeightRef     = useRef(1.55)       // absolute height in metres (photography rule)

  const updateCameraRef  = useRef<() => void>(() => {})
  // lerp target — includes absolute height for photographic presets
  const camTargetRef     = useRef({ theta: 0.55, phi: 0.90, radius: 0, height: 1.55 })

  // furniture drag state
  const dragTargetRef    = useRef<THREE.Group | null>(null)
  const dragOffsetRef    = useRef(new THREE.Vector3())
  const floorPlaneRef    = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const raycasterRef     = useRef(new THREE.Raycaster())
  const hoveredRef       = useRef<THREE.Group | null>(null)

  // placement (click-to-place in planta view)
  const [rebuildCount,  setRebuildCount]  = useState(0)
  const [placeTool,     setPlaceTool]     = useState<'door' | 'window' | null>(null)
  const [placeWidth,    setPlaceWidth]    = useState(0.90)
  const [placeStyle,    setPlaceStyle]    = useState<'wood' | 'glass'>('wood')
  const [placeDouble,   setPlaceDouble]   = useState(false)
  const [placeFullH,    setPlaceFullH]    = useState(false)
  const placedRef      = useRef<PlacedOpening[]>([])
  const ghostRef       = useRef<THREE.Mesh | null>(null)
  const placeToolRef   = useRef<'door' | 'window' | null>(null)
  const placeWidthRef  = useRef(0.90)
  const placeStyleRef  = useRef<'wood' | 'glass'>('wood')
  const placeDoubleRef = useRef(false)
  const placeFullHRef  = useRef(false)
  const activeViewRef  = useRef<string>('fundo')

  // ── wall drawing ──────────────────────────────────────────────────────────
  const [wallMode,        setWallMode]        = useState(false)
  const [drawnWallCount,  setDrawnWallCount]  = useState(0)
  const [wallHasStart,    setWallHasStart]    = useState(false)
  const [wallLengthInput, setWallLengthInput] = useState('')
  const wallModeRef         = useRef(false)
  const wallStartRef        = useRef<{ x: number; z: number } | null>(null)
  const wallLengthInputRef  = useRef('')
  const lastMouseFloorRef   = useRef<{ x: number; z: number } | null>(null)
  const drawnWallsRef       = useRef<{ x1: number; z1: number; x2: number; z2: number }[]>([])
  const drawnWallMeshesRef  = useRef<THREE.Mesh[]>([])
  const wallGhostRef        = useRef<THREE.Mesh | null>(null)
  const wallStartDotRef     = useRef<THREE.Mesh | null>(null)

  useEffect(() => { wallLengthInputRef.current = wallLengthInput }, [wallLengthInput])

  useEffect(() => {
    wallModeRef.current = wallMode
    if (!wallMode) {
      wallStartRef.current = null
      lastMouseFloorRef.current = null
      setWallHasStart(false)
      setWallLengthInput('')
      if (wallGhostRef.current)   wallGhostRef.current.visible   = false
      if (wallStartDotRef.current) wallStartDotRef.current.visible = false
    }
  }, [wallMode])

  // ── helpers ──────────────────────────────────────────────────────────────

  function getNDC(clientX: number, clientY: number): THREE.Vector2 {
    const el = containerRef.current!
    const rect = el.getBoundingClientRect()
    return new THREE.Vector2(
      ((clientX - rect.left)  / rect.width)  * 2 - 1,
      -((clientY - rect.top)  / rect.height) * 2 + 1,
    )
  }

  function pickGroup(clientX: number, clientY: number): THREE.Group | null {
    const rc = raycasterRef.current
    rc.setFromCamera(getNDC(clientX, clientY), cameraRef.current!)
    const meshes: THREE.Object3D[] = []
    draggableRef.current.forEach(g => g.traverse(o => { if ((o as THREE.Mesh).isMesh) meshes.push(o) }))
    const hits = rc.intersectObjects(meshes, false)
    if (!hits.length) return null
    let obj: THREE.Object3D | null = hits[0].object
    while (obj) {
      if (obj.userData.draggable) return obj as THREE.Group
      obj = obj.parent
    }
    return null
  }

  function setHover(group: THREE.Group | null) {
    if (hoveredRef.current && hoveredRef.current !== group) {
      hoveredRef.current.traverse(o => {
        const m = (o as THREE.Mesh).material as THREE.MeshLambertMaterial
        if (m?.isMeshLambertMaterial && !m.transparent) m.color.setHex(m.userData._base ?? 0xeeeae4)
      })
    }
    if (group) {
      group.traverse(o => {
        const m = (o as THREE.Mesh).material as THREE.MeshLambertMaterial
        if (m?.isMeshLambertMaterial && !m.transparent) {
          m.userData._base = m.color.getHex()
          m.color.setHex(0xd8d4ce)
        }
      })
    }
    hoveredRef.current = group
    const el = containerRef.current
    if (el) el.style.cursor = group ? 'grab' : 'default'
  }

  function getDims() { return getDimensions(props) }

  // ray → floor point, snapped to 0.5 m grid, clamped to room bounds
  function floorPoint(clientX: number, clientY: number): { x: number; z: number } | null {
    const rc = raycasterRef.current, cam = cameraRef.current
    if (!cam) return null
    rc.setFromCamera(getNDC(clientX, clientY), cam)
    const pt = new THREE.Vector3()
    if (!rc.ray.intersectPlane(floorPlaneRef.current, pt)) return null
    const { w, l } = getDims()
    const SNAP = 0.5
    return {
      x: Math.max(-w, Math.min(w, Math.round(pt.x / SNAP) * SNAP)),
      z: Math.max(-l, Math.min(l, Math.round(pt.z / SNAP) * SNAP)),
    }
  }

  // build a wall mesh from two floor points
  function makeWallMesh(x1: number, z1: number, x2: number, z2: number): THREE.Mesh | null {
    const dx = x2 - x1, dz = z2 - z1
    const len = Math.sqrt(dx * dx + dz * dz)
    if (len < 0.1) return null
    const { h } = getDims()
    const geo = new THREE.BoxGeometry(len, h, 0.12)
    const mat = new THREE.MeshStandardMaterial({ color: 0xf0ece6, roughness: 0.88, metalness: 0, side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set((x1 + x2) / 2, h / 2, (z1 + z2) / 2)
    mesh.rotation.y = Math.atan2(-dz, dx)
    return mesh
  }

  // finalize a wall using the typed length + mouse direction
  function confirmWallWithLength() {
    const raw = wallLengthInputRef.current.trim().replace(',', '.')
    const len = parseFloat(raw)
    if (isNaN(len) || len < 0.1) return
    const start = wallStartRef.current
    if (!start) return
    // direction: from start → last known mouse floor position, or fallback to +Z
    let dx = 0, dz = 1
    const mouse = lastMouseFloorRef.current
    if (mouse) {
      const mdx = mouse.x - start.x, mdz = mouse.z - start.z
      const mlen = Math.sqrt(mdx * mdx + mdz * mdz)
      if (mlen > 0.05) { dx = mdx / mlen; dz = mdz / mlen }
    }
    const x2 = start.x + dx * len
    const z2 = start.z + dz * len
    const mesh = makeWallMesh(start.x, start.z, x2, z2)
    if (mesh && sceneRef.current) {
      sceneRef.current.add(mesh)
      drawnWallsRef.current.push({ x1: start.x, z1: start.z, x2, z2 })
      drawnWallMeshesRef.current.push(mesh)
      setDrawnWallCount(c => c + 1)
    }
    wallStartRef.current = null
    setWallHasStart(false)
    setWallLengthInput('')
    if (wallGhostRef.current)    wallGhostRef.current.visible    = false
    if (wallStartDotRef.current) wallStartDotRef.current.visible = false
  }

  // ── rebuild ───────────────────────────────────────────────────────────────

  const rebuild = useCallback(() => {
    if (!sceneRef.current) return
    const ghost     = ghostRef.current
    const wallGhost = wallGhostRef.current
    const wallDot   = wallStartDotRef.current
    const furniture = userFurnitureRef.current.slice()
    const walls     = drawnWallMeshesRef.current.slice()
    const persistent = new Set<THREE.Object3D>([ghost, wallGhost, wallDot, ...furniture, ...walls].filter(Boolean) as THREE.Object3D[])
    while (sceneRef.current.children.length > 0) {
      const c = sceneRef.current.children[0]
      if (!persistent.has(c) && (c as THREE.Mesh).geometry) (c as THREE.Mesh).geometry.dispose()
      sceneRef.current.remove(c)
    }
    const { scene: ns, fMats } = buildScene(props, placedRef.current)
    ns.children.forEach(c => sceneRef.current!.add(c))
    sceneRef.current.background = ns.background
    furniture.forEach(g => sceneRef.current!.add(g))
    walls.forEach(m => sceneRef.current!.add(m))
    draggableRef.current  = furniture
    fMatsRef.current      = fMats
    hoveredRef.current    = null
    dragTargetRef.current = null
    if (ghost)     sceneRef.current.add(ghost)
    if (wallGhost) sceneRef.current.add(wallGhost)
    if (wallDot)   sceneRef.current.add(wallDot)
  }, [props, rebuildCount])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current!
    const cw = el.clientWidth, ch = el.clientHeight

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(cw, ch)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.85
    renderer.outputColorSpace = THREE.SRGBColorSpace
    el.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const { scene, fMats } = buildScene(props, placedRef.current)
    sceneRef.current = scene
    draggableRef.current = []
    fMatsRef.current = fMats

    // ghost mesh for placement preview (persists across rebuilds)
    const ghostGeo = new THREE.BoxGeometry(1, 1, 0.07)
    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1, transparent: true, opacity: 0.38,
      side: THREE.DoubleSide, depthWrite: false,
    })
    const ghost = new THREE.Mesh(ghostGeo, ghostMat)
    ghost.renderOrder = 20
    ghost.visible = false
    scene.add(ghost)
    ghostRef.current = ghost

    // wall-drawing ghost (unit box, scaled dynamically)
    const wallGhostMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }),
    )
    wallGhostMesh.renderOrder = 21
    wallGhostMesh.visible = false
    scene.add(wallGhostMesh)
    wallGhostRef.current = wallGhostMesh

    // start-point indicator dot
    const wallDotMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x6366f1 }),
    )
    wallDotMesh.visible = false
    scene.add(wallDotMesh)
    wallStartDotRef.current = wallDotMesh

    const camera = new THREE.PerspectiveCamera(46, cw / ch, 0.05, 500)
    cameraRef.current = camera

    const { w: iw, l: il } = getDims()
    // Interior camera — start looking at the wall opposite to the entrance (eye level 1.55 m)
    const epInit    = props.entradaPos
    const initTheta = epInit === 'fundo'        ? Math.PI
                    : epInit === 'lateral-dir'  ? Math.PI / 2
                    : epInit === 'lateral-esq'  ? -Math.PI / 2
                    : 0   // 'frente' → looking at 'fundo' wall
    const initDist   = interiorDist(iw, il, initTheta, 0.60)
    const initHeight = 1.55
    camRadiusRef.current = initDist
    camHeightRef.current = initHeight
    camAngleRef.current  = { theta: initTheta, phi: 0.90 }
    camTargetRef.current = { theta: initTheta, phi: 0.90, radius: initDist, height: initHeight }
    activeViewRef.current = epInit === 'fundo' ? 'frente' : epInit === 'lateral-dir' ? 'lateral-esq' : epInit === 'lateral-esq' ? 'lateral-dir' : 'fundo'

    function updateCamera() {
      const { h } = getDims()
      const { theta, phi } = camAngleRef.current
      const dist = Math.max(0.4, camRadiusRef.current)

      if (phi < 0.15) {
        // ── planta baixa: camera overhead, nearly top-down ─────────────────
        const overhead = Math.max(h * 1.8, dist * 1.6)
        camera.position.set(0, overhead, 0.01)  // tiny z-offset avoids gimbal
        camera.lookAt(0, 0, 0)
      } else {
        // ── interior perspective: camera at eye level, level horizontal gaze ──
        const camY = Math.max(0.30, Math.min(h * 0.95, camHeightRef.current))
        camera.position.set(
          dist * Math.sin(theta),
          camY,
          dist * Math.cos(theta),
        )
        // look at same height as camera — true frontal/elevation perspective
        camera.lookAt(0, camY, 0)
      }
    }
    updateCameraRef.current = updateCamera
    updateCamera()

    function animate() {
      frameRef.current = requestAnimationFrame(animate)
      // smooth lerp toward camTargetRef
      const LERP = 0.11
      const a = camAngleRef.current
      const t = camTargetRef.current
      const dTheta  = t.theta  - a.theta
      const dPhi    = t.phi    - a.phi
      const dR      = t.radius - camRadiusRef.current
      const dH      = t.height - camHeightRef.current
      if (Math.abs(dTheta) > 0.001 || Math.abs(dPhi) > 0.001 ||
          Math.abs(dR) > 0.01      || Math.abs(dH) > 0.005) {
        a.theta              += dTheta * LERP
        a.phi                 = Math.max(0.01, Math.min(1.52, a.phi + dPhi * LERP))
        camRadiusRef.current += dR * LERP
        camHeightRef.current += dH * LERP
        updateCamera()
      }
      renderer.render(sceneRef.current!, cameraRef.current!)
    }
    animate()

    // ── pointer events ────────────────────────────────────────────────────

    // snap mouse to nearest wall in top-down view
    function wallSnap(clientX: number, clientY: number) {
      const rc = raycasterRef.current
      rc.setFromCamera(getNDC(clientX, clientY), camera)
      const pt = new THREE.Vector3()
      if (!rc.ray.intersectPlane(floorPlaneRef.current, pt)) return null
      const { w, l } = getDims()
      const SNAP = 1.1
      const candidates = [
        { wall: 'frente'      as WallSide, d: Math.abs(pt.z - l), off: pt.x, ok: Math.abs(pt.x) < w * 0.93 },
        { wall: 'fundo'       as WallSide, d: Math.abs(pt.z + l), off: pt.x, ok: Math.abs(pt.x) < w * 0.93 },
        { wall: 'lateral-dir' as WallSide, d: Math.abs(pt.x - w), off: pt.z, ok: Math.abs(pt.z) < l * 0.93 },
        { wall: 'lateral-esq' as WallSide, d: Math.abs(pt.x + w), off: pt.z, ok: Math.abs(pt.z) < l * 0.93 },
      ].filter(c => c.ok && c.d < SNAP).sort((a, b) => a.d - b.d)
      return candidates[0] ?? null
    }

    function moveGhost(clientX: number, clientY: number) {
      const g = ghostRef.current
      if (!g) return
      const tool = placeToolRef.current
      if (!tool || activeViewRef.current !== 'planta') { g.visible = false; return }
      const snap = wallSnap(clientX, clientY)
      if (!snap) { g.visible = false; return }
      const { w, l, h } = getDims()
      const opW = placeWidthRef.current
      const opH = tool === 'door'
        ? Math.min(h * 0.80, 3.0)
        : (placeFullHRef.current ? h * 0.96 : Math.min(h * 0.40, 1.8))
      const opY = tool === 'door' ? opH / 2 : (placeFullHRef.current ? h * 0.5 : h * 0.58)
      const DOFF = 0.08
      g.scale.set(opW, opH, 1)
      g.visible = true
      switch (snap.wall) {
        case 'frente':       g.position.set(snap.off, opY, l - DOFF);  g.rotation.y = 0; break
        case 'fundo':        g.position.set(snap.off, opY, -l + DOFF); g.rotation.y = 0; break
        case 'lateral-dir':  g.position.set(w - DOFF, opY, snap.off);  g.rotation.y = Math.PI / 2; break
        case 'lateral-esq':  g.position.set(-w + DOFF, opY, snap.off); g.rotation.y = Math.PI / 2; break
      }
    }

    function onDown(e: MouseEvent) {
      // ── wall drawing mode ─────────────────────────────────────────────────
      if (wallModeRef.current) {
        const fp = floorPoint(e.clientX, e.clientY)
        if (!fp) return
        if (!wallStartRef.current) {
          // first click — set start point
          wallStartRef.current = fp
          setWallHasStart(true)
          const dot = wallStartDotRef.current
          if (dot) { dot.position.set(fp.x, 0.18, fp.z); dot.visible = true }
        } else {
          // second click — finalize wall
          const { x: x1, z: z1 } = wallStartRef.current
          const { x: x2, z: z2 } = fp
          const mesh = makeWallMesh(x1, z1, x2, z2)
          if (mesh && sceneRef.current) {
            sceneRef.current.add(mesh)
            drawnWallsRef.current.push({ x1, z1, x2, z2 })
            drawnWallMeshesRef.current.push(mesh)
            setDrawnWallCount(c => c + 1)
          }
          // reset for next wall (stay in wall mode)
          wallStartRef.current = null
          setWallHasStart(false)
          setWallLengthInput('')
          if (wallGhostRef.current)    wallGhostRef.current.visible    = false
          if (wallStartDotRef.current) wallStartDotRef.current.visible = false
        }
        return
      }

      // ── placement mode: click to place door/window on wall ─────────────────
      if (placeToolRef.current && activeViewRef.current === 'planta') {
        const snap = wallSnap(e.clientX, e.clientY)
        if (snap) {
          placedRef.current = [...placedRef.current, {
            kind:       placeToolRef.current!,
            wall:       snap.wall,
            offset:     snap.off,
            width:      placeWidthRef.current,
            style:      placeStyleRef.current,
            double:     placeDoubleRef.current,
            fullHeight: placeFullHRef.current,
          }]
          setRebuildCount(c => c + 1)
          return
        }
      }
      const hit = pickGroup(e.clientX, e.clientY)
      if (hit) {
        dragTargetRef.current = hit
        const rc = raycasterRef.current
        rc.setFromCamera(getNDC(e.clientX, e.clientY), camera)
        const pt = new THREE.Vector3()
        rc.ray.intersectPlane(floorPlaneRef.current, pt)
        dragOffsetRef.current.set(pt.x - hit.position.x, 0, pt.z - hit.position.z)
        el.style.cursor = 'grabbing'
      } else {
        isOrbitRef.current = true
        lastMouseRef.current = { x: e.clientX, y: e.clientY }
      }
    }

    function onMove(e: MouseEvent) {
      // wall drawing ghost preview
      if (wallModeRef.current) {
        el.style.cursor = 'crosshair'
        if (wallStartRef.current) {
          const fp = floorPoint(e.clientX, e.clientY)
          if (fp) lastMouseFloorRef.current = fp
          const start = wallStartRef.current
          const ghost = wallGhostRef.current
          const { h } = getDims()
          if (fp && ghost) {
            let dx = fp.x - start.x, dz = fp.z - start.z
            let len = Math.sqrt(dx * dx + dz * dz)
            // if user has typed a valid length, snap ghost to that length in mouse direction
            const typed = parseFloat(wallLengthInputRef.current.replace(',', '.'))
            if (!isNaN(typed) && typed >= 0.1 && len > 0.05) {
              dx = (dx / len) * typed; dz = (dz / len) * typed; len = typed
            }
            if (len > 0.05) {
              ghost.scale.set(len, h, 1)
              ghost.position.set(start.x + dx / 2, h / 2, start.z + dz / 2)
              ghost.rotation.y = Math.atan2(-dz, dx)
              ghost.visible = true
            } else {
              ghost.visible = false
            }
          }
        }
        return
      }

      // placement ghost
      if (placeToolRef.current && activeViewRef.current === 'planta') {
        moveGhost(e.clientX, e.clientY)
        const snap = wallSnap(e.clientX, e.clientY)
        el.style.cursor = snap ? 'crosshair' : 'default'
        return
      }
      if (dragTargetRef.current) {
        // move furniture on floor plane
        const rc = raycasterRef.current
        rc.setFromCamera(getNDC(e.clientX, e.clientY), camera)
        const pt = new THREE.Vector3()
        if (rc.ray.intersectPlane(floorPlaneRef.current, pt)) {
          const { w, l } = getDims()
          const MARGIN = 0.5
          dragTargetRef.current.position.x = Math.max(-w + MARGIN, Math.min(w - MARGIN, pt.x - dragOffsetRef.current.x))
          dragTargetRef.current.position.z = Math.max(-l + MARGIN, Math.min(l - MARGIN, pt.z - dragOffsetRef.current.z))
        }
      } else if (isOrbitRef.current) {
        const dx = e.clientX - lastMouseRef.current.x
        const dy = e.clientY - lastMouseRef.current.y
        const { h } = getDims()
        // horizontal drag → rotate
        camAngleRef.current.theta -= dx * 0.010
        // vertical drag → raise/lower camera (drag up = higher)
        camHeightRef.current = Math.max(0.20, Math.min(h * 2.0, camHeightRef.current - dy * 0.035))
        lastMouseRef.current = { x: e.clientX, y: e.clientY }
        // keep target in sync so lerp doesn't fight manual orbit
        camTargetRef.current.theta  = camAngleRef.current.theta
        camTargetRef.current.height = camHeightRef.current
        updateCamera()
      } else {
        // hover highlight
        setHover(pickGroup(e.clientX, e.clientY))
      }
    }

    function onUp() {
      if (dragTargetRef.current) {
        setHover(null)
        dragTargetRef.current = null
        el.style.cursor = 'default'
      }
      isOrbitRef.current = false
    }

    function onWheel(e: WheelEvent) {
      const next = Math.max(0.4, camRadiusRef.current + e.deltaY * 0.05)
      camRadiusRef.current = next
      camTargetRef.current.radius = next
      updateCamera()
    }

    // touch
    let lastTouchDist = 0
    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 1) {
        const t = e.touches[0]
        const hit = pickGroup(t.clientX, t.clientY)
        if (hit) {
          dragTargetRef.current = hit
          const rc = raycasterRef.current
          rc.setFromCamera(getNDC(t.clientX, t.clientY), camera)
          const pt = new THREE.Vector3()
          rc.ray.intersectPlane(floorPlaneRef.current, pt)
          dragOffsetRef.current.set(pt.x - hit.position.x, 0, pt.z - hit.position.z)
        } else {
          isOrbitRef.current = true
          lastMouseRef.current = { x: t.clientX, y: t.clientY }
        }
      } else if (e.touches.length === 2) {
        lastTouchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 1) {
        const t = e.touches[0]
        if (dragTargetRef.current) {
          const rc = raycasterRef.current
          rc.setFromCamera(getNDC(t.clientX, t.clientY), camera)
          const pt = new THREE.Vector3()
          if (rc.ray.intersectPlane(floorPlaneRef.current, pt)) {
            const { w, l } = getDims()
            dragTargetRef.current.position.x = Math.max(-w + 0.5, Math.min(w - 0.5, pt.x - dragOffsetRef.current.x))
            dragTargetRef.current.position.z = Math.max(-l + 0.5, Math.min(l - 0.5, pt.z - dragOffsetRef.current.z))
          }
        } else if (isOrbitRef.current) {
          const dx = t.clientX - lastMouseRef.current.x
          const dy = t.clientY - lastMouseRef.current.y
          const { h } = getDims()
          camAngleRef.current.theta -= dx * 0.012
          camHeightRef.current = Math.max(0.20, Math.min(h * 2.0, camHeightRef.current - dy * 0.035))
          lastMouseRef.current = { x: t.clientX, y: t.clientY }
          camTargetRef.current.theta  = camAngleRef.current.theta
          camTargetRef.current.height = camHeightRef.current
          updateCamera()
        }
      } else if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
        camRadiusRef.current = Math.max(0.4, camRadiusRef.current - (d - lastTouchDist) * 0.03)
        lastTouchDist = d
        updateCamera()
      }
    }
    function onTouchEnd() { dragTargetRef.current = null; isOrbitRef.current = false }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && wallModeRef.current) {
        wallStartRef.current = null
        setWallHasStart(false)
        setWallLengthInput('')
        if (wallGhostRef.current)    wallGhostRef.current.visible    = false
        if (wallStartDotRef.current) wallStartDotRef.current.visible = false
      }
    }

    renderer.domElement.addEventListener('mousedown',  onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    window.addEventListener('keydown',   onKeyDown)
    renderer.domElement.addEventListener('wheel',      onWheel, { passive: true })
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true })
    renderer.domElement.addEventListener('touchmove',  onTouchMove,  { passive: true })
    renderer.domElement.addEventListener('touchend',   onTouchEnd)

    return () => {
      cancelAnimationFrame(frameRef.current)
      renderer.domElement.removeEventListener('mousedown',  onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
      window.removeEventListener('keydown',   onKeyDown)
      renderer.domElement.removeEventListener('wheel',      onWheel)
      renderer.domElement.removeEventListener('touchstart', onTouchStart)
      renderer.domElement.removeEventListener('touchmove',  onTouchMove)
      renderer.domElement.removeEventListener('touchend',   onTouchEnd)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { rebuild() }, [rebuild])

  // keep placement refs in sync with React state (for closure-based event handlers)
  useEffect(() => { placeToolRef.current  = placeTool },  [placeTool])
  useEffect(() => { placeWidthRef.current  = placeWidth },  [placeWidth])
  useEffect(() => { placeStyleRef.current  = placeStyle },  [placeStyle])
  useEffect(() => { placeDoubleRef.current = placeDouble }, [placeDouble])
  useEffect(() => { placeFullHRef.current  = placeFullH },  [placeFullH])

  // ── add furniture ─────────────────────────────────────────────────────────

  const addFurnitureToScene = useCallback((type: FurnitureType) => {
    if (!sceneRef.current || !fMatsRef.current) return
    const { w, l } = getDimensions(props)
    const group = makeFurniture(type, fMatsRef.current)
    group.position.set(
      (Math.random() - 0.5) * w * 0.6,
      0,
      (Math.random() - 0.5) * l * 0.6,
    )
    sceneRef.current.add(group)
    userFurnitureRef.current.push(group)
    draggableRef.current.push(group)
    setFurnitureCount(c => c + 1)
  }, [props])

  // ── capture ───────────────────────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    addFurniture(type: FurnitureType) { addFurnitureToScene(type) },

    captureViews() {
      const renderer = rendererRef.current!
      const scene    = sceneRef.current!
      const { w, l, h } = getDims()
      const el = containerRef.current!
      const ow = el.clientWidth, oh = el.clientHeight
      renderer.setSize(960, 640)
      const cam = new THREE.PerspectiveCamera(46, 960 / 640, 0.05, 500)
      const result: Record<string, string> = {}

      const wallViews = [
        { id: 'fundo',       theta: 0            },
        { id: 'frente',      theta: Math.PI      },
        { id: 'dir',         theta: -Math.PI / 2 },
        { id: 'esq',         theta:  Math.PI / 2 },
      ]
      for (const { id, theta } of wallViews) {
        const dist = interiorDist(w, l, theta, 0.60)
        cam.position.set(dist * Math.sin(theta), 1.55, dist * Math.cos(theta))
        cam.lookAt(0, 1.55, 0)
        renderer.render(scene, cam)
        result[id] = renderer.domElement.toDataURL('image/jpeg', 0.88).split(',')[1]
      }

      // planta
      renderer.setSize(800, 800)
      const camP = new THREE.PerspectiveCamera(55, 1, 0.05, 500)
      camP.position.set(0, Math.max(h * 1.8, Math.max(w, l) * 2.2 * 1.6), 0.01)
      camP.lookAt(0, 0, 0)
      renderer.render(scene, camP)
      result['planta'] = renderer.domElement.toDataURL('image/jpeg', 0.88).split(',')[1]

      renderer.setSize(ow, oh)
      renderer.render(scene, cameraRef.current!)
      return result
    },

    capture() {
      const renderer = rendererRef.current!
      const scene    = sceneRef.current!
      const { w, l, h } = getDims()

      // perspective: 3000×1688 PNG, 46° FOV, Two-Point Perspective (level gaze)
      renderer.setSize(3000, 1688)
      const cam1 = new THREE.PerspectiveCamera(46, 3000 / 1688, 0.05, 500)
      const capDist = interiorDist(w, l, 0.70, 0.68)
      const capY = 1.55
      cam1.position.set(capDist * Math.sin(0.70), capY, capDist * Math.cos(0.70))
      cam1.lookAt(0, capY, 0)
      renderer.render(scene, cam1)
      const perspective = renderer.domElement.toDataURL('image/png')

      // top-down: 3000×3000 PNG overhead
      renderer.setSize(3000, 3000)
      const cam2 = new THREE.PerspectiveCamera(55, 1, 0.05, 500)
      cam2.position.set(0, Math.max(w, l) * 2.5, 0)
      cam2.lookAt(0, 0, 0)
      renderer.render(scene, cam2)
      const topDown = renderer.domElement.toDataURL('image/png')

      const el = containerRef.current!
      renderer.setSize(el.clientWidth, el.clientHeight)
      renderer.render(scene, cameraRef.current!)
      return { perspective, topDown }
    },
  }), [props])

  const [addOpen,        setAddOpen]        = useState(false)
  const [furnitureCount, setFurnitureCount] = useState(0)
  const [activeView,     setActiveView]     = useState<string>('fundo')

  // External camera presets — orbit around the room from outside.
  // theta = horizontal angle around Y axis; height = camera Y in metres.
  // fill is unused for external view but kept for planta.
  // 4 interior wall views (camera inside at eye level, facing each wall) + planta
  const VIEW_PRESETS = [
    { id: 'fundo',       label: 'Fundo',  theta: 0,            phi: 0.90, height: 1.55 },
    { id: 'frente',      label: 'Frente', theta: Math.PI,      phi: 0.90, height: 1.55 },
    { id: 'lateral-dir', label: 'Dir.',   theta: -Math.PI / 2, phi: 0.90, height: 1.55 },
    { id: 'lateral-esq', label: 'Esq.',   theta:  Math.PI / 2, phi: 0.90, height: 1.55 },
    { id: 'planta',      label: 'Planta', theta: 0,            phi: 0.05, height: 1.55 },
  ] as const

  function goToView(id: string, theta: number, phi: number, height: number) {
    const { w, l } = getDimensions(props)
    const radius = phi < 0.15
      ? Math.max(w, l) * 2.20          // planta: camera overhead
      : interiorDist(w, l, theta, 0.60) // perspective: camera inside room
    camTargetRef.current = { theta, phi, radius, height }
    activeViewRef.current = id
    setActiveView(id)
    if (id !== 'planta') {
      placeToolRef.current = null
      setPlaceTool(null)
      if (ghostRef.current) ghostRef.current.visible = false
    }
  }

  return (
    <div
      className="w-full flex flex-col relative"
      style={{ height: 680, background: '#f8f5f0', fontFamily: 'monospace' }}
    >
      {/* ── top toolbar ───────────────────────────────────────────────────── */}
      <div
        className="flex items-stretch gap-0 flex-shrink-0 select-none"
        style={{ height: 30, borderTop: '1px solid #d4cfc8', borderBottom: '1px solid #d4cfc8', background: '#f2ede6' }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* view presets */}
        {VIEW_PRESETS.map(({ id, label, theta, phi, height }) => (
          <button
            key={id}
            onClick={() => goToView(id, theta, phi, height)}
            className="px-3 h-full text-[11px] transition-colors hover:bg-black/8 active:bg-black/12"
            style={{
              color: activeView === id ? '#1a1814' : '#7a7570',
              borderRight: '1px solid #d4cfc8',
              fontWeight: activeView === id ? 600 : 400,
              background: activeView === id ? 'rgba(0,0,0,0.055)' : 'transparent',
              fontFamily: 'monospace',
            }}
          >{label}</button>
        ))}

        <div className="flex-1" />

        {/* placement tools — visible only in planta view */}
        {activeView === 'planta' && (
          <>
            {(['door', 'window'] as const).map(tool => (
              <button
                key={tool}
                onClick={() => {
                  const next = placeTool === tool ? null : tool
                  placeToolRef.current = next
                  setPlaceTool(next)
                  if (next) setWallMode(false)
                  if (next === 'door')   { setPlaceWidth(0.90); placeWidthRef.current = 0.90; setPlaceDouble(false); placeDoubleRef.current = false }
                  if (next === 'window') { setPlaceWidth(1.20); placeWidthRef.current = 1.20; setPlaceFullH(false);  placeFullHRef.current  = false  }
                  if (ghostRef.current && !next) ghostRef.current.visible = false
                }}
                className="px-3 h-full text-[11px] transition-colors"
                style={{
                  color: placeTool === tool ? '#6366f1' : '#7a7570',
                  background: placeTool === tool ? 'rgba(99,102,241,0.10)' : 'transparent',
                  borderLeft: '1px solid #d4cfc8',
                  fontFamily: 'monospace',
                  fontWeight: placeTool === tool ? 600 : 400,
                }}
              >
                {tool === 'door' ? '+ porta' : '+ janela'}
              </button>
            ))}

            {/* wall drawing tool */}
            <button
              onClick={() => {
                const next = !wallMode
                setWallMode(next)
                if (next) {
                  placeToolRef.current = null
                  setPlaceTool(null)
                  if (ghostRef.current) ghostRef.current.visible = false
                }
              }}
              className="px-3 h-full text-[11px] transition-colors"
              style={{
                color: wallMode ? '#6366f1' : '#7a7570',
                background: wallMode ? 'rgba(99,102,241,0.10)' : 'transparent',
                borderLeft: '1px solid #d4cfc8',
                fontFamily: 'monospace',
                fontWeight: wallMode ? 600 : 400,
              }}
            >+ parede</button>

            {drawnWallCount > 0 && (
              <button
                onClick={() => {
                  if (!sceneRef.current) return
                  drawnWallMeshesRef.current.forEach(m => sceneRef.current!.remove(m))
                  drawnWallMeshesRef.current = []
                  drawnWallsRef.current = []
                  setDrawnWallCount(0)
                  wallStartRef.current = null
                  if (wallGhostRef.current)    wallGhostRef.current.visible    = false
                  if (wallStartDotRef.current) wallStartDotRef.current.visible = false
                }}
                className="px-2 h-full text-[10px] transition-colors hover:bg-red-50"
                style={{ color: '#c08070', borderLeft: '1px solid #d4cfc8', fontFamily: 'monospace' }}
                title="Remover todas as paredes desenhadas"
              >limpar paredes</button>
            )}

            {placedRef.current.length > 0 && (
              <button
                onClick={() => { placedRef.current = []; setRebuildCount(c => c + 1) }}
                className="px-2 h-full text-[10px] transition-colors hover:bg-red-50"
                style={{ color: '#c08070', borderLeft: '1px solid #d4cfc8', fontFamily: 'monospace' }}
                title="Limpar aberturas colocadas"
              >limpar</button>
            )}
          </>
        )}

        {/* clear furniture */}
        {furnitureCount > 0 && (
          <button
            onClick={() => {
              if (!sceneRef.current) return
              userFurnitureRef.current.forEach(g => sceneRef.current!.remove(g))
              userFurnitureRef.current = []
              draggableRef.current = []
              hoveredRef.current = null
              dragTargetRef.current = null
              setFurnitureCount(0)
            }}
            className="px-2 h-full text-[10px] transition-colors hover:bg-red-50"
            style={{ color: '#c08070', borderLeft: '1px solid #d4cfc8', fontFamily: 'monospace' }}
            title="Remover todos os móveis"
          >limpar móveis</button>
        )}

        {/* add furniture */}
        <div className="relative flex">
          <button
            onClick={() => setAddOpen(o => !o)}
            className="px-3 h-full text-[11px] transition-colors hover:bg-black/6"
            style={{ color: addOpen ? '#1a1814' : '#7a7570', background: addOpen ? 'rgba(0,0,0,0.06)' : 'transparent', borderLeft: '1px solid #d4cfc8', fontFamily: 'monospace' }}
          >+ móvel</button>

          {addOpen && (
            <div
              className="absolute top-full right-0 z-50 flex flex-col py-1"
              style={{ background: '#f2ede6', border: '1px solid #c8c3bc', minWidth: 165, boxShadow: '2px 3px 8px rgba(0,0,0,0.12)' }}
              onMouseDown={e => e.stopPropagation()}
            >
              {FURNITURE_CATALOG.map(({ type, label, icon }) => (
                <button
                  key={type}
                  onClick={() => { addFurnitureToScene(type); setAddOpen(false) }}
                  className="flex items-center gap-2.5 px-4 py-1.5 text-left transition-colors hover:bg-black/6"
                  style={{ color: '#3a3530', fontSize: 11, fontFamily: 'monospace' }}
                >
                  <span style={{ width: 18, textAlign: 'center' }}>{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── wall length input — visible when wall mode active + start placed ── */}
      {wallMode && wallHasStart && (
        <div
          className="flex items-center gap-2 px-3 flex-shrink-0 select-none"
          style={{ height: 30, borderBottom: '1px solid #c8c3bc', background: '#eae4f5' }}
          onMouseDown={e => e.stopPropagation()}
        >
          <span className="text-[10px]" style={{ color: '#6366f1', fontFamily: 'monospace' }}>comprimento:</span>
          <input
            autoFocus
            type="text"
            inputMode="decimal"
            value={wallLengthInput}
            onChange={e => setWallLengthInput(e.target.value)}
            onKeyDown={e => {
              e.stopPropagation()
              if (e.key === 'Enter') confirmWallWithLength()
              if (e.key === 'Escape') {
                wallStartRef.current = null
                setWallHasStart(false)
                setWallLengthInput('')
                if (wallGhostRef.current)    wallGhostRef.current.visible    = false
                if (wallStartDotRef.current) wallStartDotRef.current.visible = false
              }
            }}
            placeholder="ex: 3.50"
            style={{
              width: 80, height: 20, padding: '0 6px', fontSize: 12,
              fontFamily: 'monospace', background: '#fff',
              border: '1px solid rgba(99,102,241,0.5)', borderRadius: 4,
              outline: 'none', color: '#1f2937',
            }}
          />
          <span className="text-[10px]" style={{ color: '#6366f1', fontFamily: 'monospace' }}>m</span>
          <button
            onClick={confirmWallWithLength}
            style={{
              height: 20, padding: '0 8px', fontSize: 11, fontFamily: 'monospace',
              background: '#6366f1', color: '#fff', border: 'none', borderRadius: 4,
              cursor: 'pointer',
            }}
          >↵ confirmar</button>
          <span className="text-[10px]" style={{ color: '#9ca3af', fontFamily: 'monospace' }}>
            — ou clique no 2º ponto para comprimento livre
          </span>
        </div>
      )}

      {/* ── placement options bar — visible only when a tool is active ────── */}
      {placeTool && (
        <div
          className="flex items-center gap-1 px-2 flex-shrink-0 select-none flex-wrap"
          style={{ minHeight: 26, borderBottom: '1px solid #d4cfc8', background: '#ede8e0' }}
          onMouseDown={e => e.stopPropagation()}
        >
          {placeTool === 'door' && (
            <>
              {([0.70, 0.80, 0.90, 1.00, 1.20] as const).map(w => (
                <button
                  key={w}
                  onClick={() => { setPlaceWidth(w); setPlaceDouble(false) }}
                  className="px-1.5 text-[10px] rounded transition-colors"
                  style={{
                    height: 18, fontFamily: 'monospace',
                    background: placeWidth === w && !placeDouble ? 'rgba(99,102,241,0.18)' : 'transparent',
                    color: placeWidth === w && !placeDouble ? '#4f52cc' : '#6a6560',
                    border: placeWidth === w && !placeDouble ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent',
                  }}
                >{w.toFixed(2)}m</button>
              ))}
              <button
                onClick={() => { setPlaceWidth(1.60); setPlaceDouble(true) }}
                className="px-1.5 text-[10px] rounded transition-colors"
                style={{
                  height: 18, fontFamily: 'monospace',
                  background: placeDouble ? 'rgba(99,102,241,0.18)' : 'transparent',
                  color: placeDouble ? '#4f52cc' : '#6a6560',
                  border: placeDouble ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent',
                }}
              >dupla</button>
              <span style={{ width: 1, height: 14, background: '#d4cfc8', margin: '0 2px' }} />
              {(['wood', 'glass'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setPlaceStyle(s)}
                  className="px-1.5 text-[10px] rounded transition-colors"
                  style={{
                    height: 18, fontFamily: 'monospace',
                    background: placeStyle === s ? 'rgba(99,102,241,0.18)' : 'transparent',
                    color: placeStyle === s ? '#4f52cc' : '#6a6560',
                    border: placeStyle === s ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent',
                  }}
                >{s === 'wood' ? 'madeira' : 'vidro'}</button>
              ))}
            </>
          )}
          {placeTool === 'window' && (
            <>
              {([0.80, 1.20, 1.60, 2.00] as const).map(w => (
                <button
                  key={w}
                  onClick={() => setPlaceWidth(w)}
                  className="px-1.5 text-[10px] rounded transition-colors"
                  style={{
                    height: 18, fontFamily: 'monospace',
                    background: placeWidth === w ? 'rgba(99,102,241,0.18)' : 'transparent',
                    color: placeWidth === w ? '#4f52cc' : '#6a6560',
                    border: placeWidth === w ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent',
                  }}
                >{w.toFixed(2)}m</button>
              ))}
              <span style={{ width: 1, height: 14, background: '#d4cfc8', margin: '0 2px' }} />
              <button
                onClick={() => setPlaceFullH(v => !v)}
                className="px-1.5 text-[10px] rounded transition-colors"
                style={{
                  height: 18, fontFamily: 'monospace',
                  background: placeFullH ? 'rgba(99,102,241,0.18)' : 'transparent',
                  color: placeFullH ? '#4f52cc' : '#6a6560',
                  border: placeFullH ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent',
                }}
              >piso-teto</button>
            </>
          )}
        </div>
      )}

      {/* ── canvas ───────────────────────────────────────────────────────── */}
      <div ref={containerRef} className="flex-1 min-h-0" />

      {/* ── status bar ────────────────────────────────────────────────────── */}
      <div
        className="flex items-center px-3 flex-shrink-0 select-none"
        style={{ height: 22, borderTop: '1px solid #d4cfc8', background: '#f2ede6' }}
        onMouseDown={e => e.stopPropagation()}
      >
        <span className="text-[10px]" style={{ color: wallMode || placeTool ? '#6366f1' : '#b0aaa2' }}>
          {wallMode
            ? wallHasStart
              ? '2º clique → finalizar parede · ESC → cancelar'
              : `modo parede (${drawnWallCount} desenhada${drawnWallCount !== 1 ? 's' : ''}) — 1º clique → ponto inicial`
            : placeTool === 'door'
            ? `porta ${placeDouble ? 'dupla ' : ''}${placeWidth.toFixed(2)}m ${placeStyle === 'glass' ? '· vidro ' : ''}— clique na parede`
            : placeTool === 'window'
            ? `janela ${placeWidth.toFixed(2)}m${placeFullH ? ' · piso-teto' : ''} — clique na parede`
            : 'arrastar → orbitar · scroll → zoom · arrastar móvel → mover'
          }
        </span>
      </div>
    </div>
  )
})

export default SpaceViewer3D
