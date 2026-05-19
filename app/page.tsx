'use client'

import { useState, useRef, useEffect } from 'react'
import type {
  BriefFormData, PeDireito, AmbienteInterno,
  PlantaForma, JanelasPos, ElementoFixo, EntradaPos,
  PisoTipo, ParedeTipo, TetoTipo,
  JanelaCustom, PortaInterna, PilarCustom, MovelFixo, MovelTipo, PosicaoH, EscadaCustom,
} from '@/lib/types'

type FormState = {
  area: number
  comprimento: number | undefined
  largura: number | undefined
  alturaPeDireito: number | undefined
  peDireito: PeDireito | ''
  entradaPos: EntradaPos | ''
  portaLargura: number | undefined
  plantaForma: PlantaForma | ''
  janelasPos: JanelasPos | ''
  elementosFixos: ElementoFixo[]
  ambientesInternos: AmbienteInterno[]
  janelasCustom: JanelaCustom[]
  portasInternas: PortaInterna[]
  pilaresCustom: PilarCustom[]
  moveisFixos: MovelFixo[]
  escadasCustom: EscadaCustom[]
  pisoTipo: PisoTipo | ''
  paredeTipo: ParedeTipo | ''
  tetoTipo: TetoTipo | ''
}

// ─── sub-components ───────────────────────────────────────────────────────────

function OptGrid<T extends string>({
  options, value, onChange, cols = 2, aiFields, fieldKey,
}: {
  options: [T, string][]
  value: T | ''
  onChange: (v: T) => void
  cols?: number
  aiFields?: Set<string>
  fieldKey?: string
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {options.map(([val, label]) => (
        <button key={val} type="button" onClick={() => onChange(val)}
          className={`opt-btn${value === val ? ' selected' : ''}`}>
          {label}
          {aiFields && fieldKey && aiFields.has(fieldKey) && value === val && (
            <span className="ml-1.5 text-[8px] font-bold bg-[#6366f1]/15 text-[#6366f1] px-1 py-0.5 rounded">IA</span>
          )}
        </button>
      ))}
    </div>
  )
}

function Section({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!visible) return
    const el = ref.current
    if (!el) return
    const timer = setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80)
    return () => clearTimeout(timer)
  }, [visible])
  if (!visible) return null
  return <div ref={ref} className="reveal-section">{children}</div>
}

function AiBadge() {
  return <span className="ml-2 text-[8px] font-bold bg-[#6366f1]/10 text-[#6366f1] px-1.5 py-0.5 rounded-full tracking-wide">IA</span>
}

const SECTION_LABEL = 'text-[10px] font-bold uppercase tracking-[0.15em] text-[#6366f1] mb-5'
const SECTION_STYLE = { fontFamily: 'var(--font-mono, monospace)' }

function ViewCard({ title, src, aspectClass = 'aspect-[4/3]' }: { title: string; src: string; aspectClass?: string }) {
  const slug = title.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6b7280]">{title}</span>
        <div className="flex items-center gap-4">
          <a href={src} target="_blank" rel="noopener noreferrer"
            className="text-[11px] font-medium text-[#6366f1] hover:underline">Ver</a>
          <a href={src} download={`otelie-${slug}.png`}
            className="text-[11px] font-medium text-[#6366f1] hover:underline">↓ Baixar</a>
        </div>
      </div>
      <a href={src} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={title}
          className={`rounded-xl border border-[#e5e7eb] w-full object-cover cursor-zoom-in hover:opacity-90 transition-opacity ${aspectClass}`} />
      </a>
    </div>
  )
}

// ── Floor plan SVG — generated from form data (browser-side, no SketchUp dependency) ──
function FloorPlanSVG({ form }: { form: FormState }) {
  const svgRef = useRef<SVGSVGElement>(null)

  // form.comprimento / form.largura are in metres; form.area in sq m (auto-calc = comp×larg)
  let wM: number, lM: number
  if (form.comprimento && form.largura) {
    wM = form.largura
    lM = form.comprimento
  } else {
    const ratios: Record<string, number> = {
      corredor: 0.30, quadrado: 1.00, retangular: 0.65, 'formato-l': 0.65, irregular: 0.72,
    }
    const r = ratios[form.plantaForma || 'retangular'] ?? 0.65
    const sqM = form.area  // treat stored value as sq m for proportional display
    lM = Math.sqrt(sqM / r)
    wM = sqM / lM
  }

  const SIZE = 560
  const MGEX = 76           // margin for dimension labels
  const WALL_M = 0.15       // wall thickness in metres
  const scale = (SIZE - 2 * MGEX) / Math.max(wM, lM)
  const W  = wM * scale
  const L  = lM * scale
  const T  = Math.max(WALL_M * scale, 7)   // wall thickness in SVG px

  // Centre room in canvas
  const ox = MGEX + (SIZE - 2 * MGEX - W) / 2
  const oy = MGEX + (SIZE - 2 * MGEX - L) / 2

  const FLOOR_COLORS: Record<string, string> = {
    'cimento-queimado': '#d2cfc8', 'ceramica': '#ece5d2', 'madeira': '#c8936a',
    'vinilico': '#c0b8b0', 'pedra': '#b8b5ae', 'outro': '#d4d0c8',
  }
  const floorFill = FLOOR_COLORS[form.pisoTipo || ''] ?? '#dddbd4'
  const WC = '#2a2a2a'   // wall colour
  const DC = '#4b6bfb'   // dimension colour

  const ep = form.entradaPos || 'frente'
  const jp = form.janelasPos  || 'sem-janelas'
  const dPx = (form.portaLargura ?? 0.9) * scale   // door width px
  const dCX  = (W - dPx) / 2                        // door offset along H walls
  const dCY  = (L - dPx) / 2                        // door offset along V walls
  const winPx = W * 0.36
  const wCX   = (W - winPx) / 2

  const downloadSVG = () => {
    if (!svgRef.current) return
    const data = new XMLSerializer().serializeToString(svgRef.current)
    const blob = new Blob([data], { type: 'image/svg+xml' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'planta-baixa.svg'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6b7280]">Planta Baixa</span>
        <button onClick={downloadSVG} className="text-[11px] font-medium text-[#6366f1] hover:underline">↓ Baixar SVG</button>
      </div>
      <svg ref={svgRef} width="100%" viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="rounded-xl border border-[#e5e7eb] bg-white w-full"
        style={{ maxHeight: 560 }}>
        <defs>
          {/* Cross-hatch fill for cut walls */}
          <pattern id="wp" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="5" stroke="#555" strokeWidth="1.5" />
          </pattern>
        </defs>

        {/* Floor */}
        <rect x={ox+T} y={oy+T} width={W-2*T} height={L-2*T} fill={floorFill} />

        {/* Walls — hatched fill */}
        <rect x={ox}      y={oy}      width={W} height={T}   fill="url(#wp)" />  {/* N */}
        <rect x={ox}      y={oy+L-T}  width={W} height={T}   fill="url(#wp)" />  {/* S */}
        <rect x={ox}      y={oy+T}    width={T} height={L-2*T} fill="url(#wp)" />{/* W */}
        <rect x={ox+W-T}  y={oy+T}    width={T} height={L-2*T} fill="url(#wp)" />{/* E */}
        {/* Corner fills */}
        <rect x={ox}     y={oy}     width={T} height={T} fill="url(#wp)" />
        <rect x={ox+W-T} y={oy}     width={T} height={T} fill="url(#wp)" />
        <rect x={ox}     y={oy+L-T} width={T} height={T} fill="url(#wp)" />
        <rect x={ox+W-T} y={oy+L-T} width={T} height={T} fill="url(#wp)" />
        {/* Room outline */}
        <rect x={ox} y={oy} width={W} height={L} fill="none" stroke={WC} strokeWidth="1.5" />

        {/* ── Door ── */}
        {ep === 'frente' && <>
          <rect x={ox+dCX} y={oy+L-T-0.5} width={dPx} height={T+2} fill={floorFill} />
          <line x1={ox+dCX} y1={oy+L-T} x2={ox+dCX} y2={oy+L-T-dPx} stroke={WC} strokeWidth="1.5" />
          <path d={`M${ox+dCX} ${oy+L-T-dPx} A${dPx} ${dPx} 0 0 1 ${ox+dCX+dPx} ${oy+L-T}`}
            fill="none" stroke={WC} strokeWidth="1" strokeDasharray="4,2" />
        </>}
        {ep === 'fundo' && <>
          <rect x={ox+dCX} y={oy-0.5} width={dPx} height={T+1} fill={floorFill} />
          <line x1={ox+dCX+dPx} y1={oy+T} x2={ox+dCX+dPx} y2={oy+T+dPx} stroke={WC} strokeWidth="1.5" />
          <path d={`M${ox+dCX+dPx} ${oy+T+dPx} A${dPx} ${dPx} 0 0 0 ${ox+dCX} ${oy+T}`}
            fill="none" stroke={WC} strokeWidth="1" strokeDasharray="4,2" />
        </>}
        {ep === 'lateral-esq' && <>
          <rect x={ox-0.5} y={oy+dCY} width={T+1} height={dPx} fill={floorFill} />
          <line x1={ox+T} y1={oy+dCY} x2={ox+T+dPx} y2={oy+dCY} stroke={WC} strokeWidth="1.5" />
          <path d={`M${ox+T+dPx} ${oy+dCY} A${dPx} ${dPx} 0 0 0 ${ox+T} ${oy+dCY+dPx}`}
            fill="none" stroke={WC} strokeWidth="1" strokeDasharray="4,2" />
        </>}
        {ep === 'lateral-dir' && <>
          <rect x={ox+W-T-0.5} y={oy+dCY} width={T+1} height={dPx} fill={floorFill} />
          <line x1={ox+W-T} y1={oy+dCY+dPx} x2={ox+W-T-dPx} y2={oy+dCY+dPx} stroke={WC} strokeWidth="1.5" />
          <path d={`M${ox+W-T-dPx} ${oy+dCY+dPx} A${dPx} ${dPx} 0 0 0 ${ox+W-T} ${oy+dCY}`}
            fill="none" stroke={WC} strokeWidth="1" strokeDasharray="4,2" />
        </>}

        {/* ── Window on S wall (frente) if no door there ── */}
        {(jp === 'so-frente' || jp === 'frente-lateral') && ep !== 'frente' && <>
          <rect x={ox+wCX} y={oy+L-T-0.5} width={winPx} height={T+1} fill="white" />
          <line x1={ox+wCX} y1={oy+L-T+T*0.28} x2={ox+wCX+winPx} y2={oy+L-T+T*0.28} stroke="#888" strokeWidth="1.5" />
          <line x1={ox+wCX} y1={oy+L-T*0.28} x2={ox+wCX+winPx} y2={oy+L-T*0.28} stroke="#888" strokeWidth="1.5" />
          <line x1={ox+wCX}       y1={oy+L-T} x2={ox+wCX}       y2={oy+L} stroke={WC} strokeWidth="1" />
          <line x1={ox+wCX+winPx} y1={oy+L-T} x2={ox+wCX+winPx} y2={oy+L} stroke={WC} strokeWidth="1" />
        </>}
        {/* Window on E wall */}
        {(jp === 'frente-lateral' || jp === 'so-lateral') && ep !== 'lateral-dir' && <>
          <rect x={ox+W-T-0.5} y={oy+(L-winPx)/2} width={T+1} height={winPx} fill="white" />
          <line x1={ox+W-T+T*0.28} y1={oy+(L-winPx)/2} x2={ox+W-T+T*0.28} y2={oy+(L+winPx)/2} stroke="#888" strokeWidth="1.5" />
          <line x1={ox+W-T*0.28}   y1={oy+(L-winPx)/2} x2={ox+W-T*0.28}   y2={oy+(L+winPx)/2} stroke="#888" strokeWidth="1.5" />
        </>}

        {/* ── Dimensions ── */}
        {/* Width — below */}
        <line x1={ox}   y1={oy+L+22} x2={ox+W} y2={oy+L+22} stroke={DC} strokeWidth="1" />
        <line x1={ox}   y1={oy+L+17} x2={ox}   y2={oy+L+27} stroke={DC} strokeWidth="1" />
        <line x1={ox+W} y1={oy+L+17} x2={ox+W} y2={oy+L+27} stroke={DC} strokeWidth="1" />
        <text x={ox+W/2} y={oy+L+40} textAnchor="middle" fontSize="12" fill={DC}
          fontFamily="monospace" fontWeight="600">{wM.toFixed(2)}m</text>

        {/* Length — right */}
        <line x1={ox+W+22} y1={oy}   x2={ox+W+22} y2={oy+L} stroke={DC} strokeWidth="1" />
        <line x1={ox+W+17} y1={oy}   x2={ox+W+27} y2={oy}   stroke={DC} strokeWidth="1" />
        <line x1={ox+W+17} y1={oy+L} x2={ox+W+27} y2={oy+L} stroke={DC} strokeWidth="1" />
        <text x={ox+W+32} y={oy+L/2} textAnchor="start" fontSize="12" fill={DC}
          fontFamily="monospace" fontWeight="600" dominantBaseline="middle">{lM.toFixed(2)}m</text>

        {/* North arrow */}
        <text x={ox+W+52} y={oy+12} textAnchor="middle" fontSize="9" fill="#9ca3af" fontWeight="700">N</text>
        <path d={`M${ox+W+52} ${oy+16} L${ox+W+48} ${oy+30} L${ox+W+52} ${oy+25} L${ox+W+56} ${oy+30} Z`}
          fill="#374151" />
      </svg>
    </div>
  )
}

// ─── reusable mini-form atoms ─────────────────────────────────────────────────

function NumInput({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <input type="number" placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)} min="0.1" step="0.1"
      className="w-full text-sm border border-[#e5e7eb] rounded-lg px-3 py-2 outline-none focus:border-[#6366f1]" />
  )
}

function WallSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full text-sm border border-[#e5e7eb] rounded-lg px-3 py-2 bg-white outline-none focus:border-[#6366f1]">
      <option value="">Parede</option>
      <option value="frente">Frente</option>
      <option value="fundo">Fundo</option>
      <option value="lateral-esq">Lateral esq.</option>
      <option value="lateral-dir">Lateral dir.</option>
    </select>
  )
}

function PosHSelect({ value, onChange }: { value: string; onChange: (v: PosicaoH) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value as PosicaoH)}
      className="w-full text-sm border border-[#e5e7eb] rounded-lg px-3 py-2 bg-white outline-none focus:border-[#6366f1]">
      <option value="esq">Lado esquerdo</option>
      <option value="centro">Centro</option>
      <option value="dir">Lado direito</option>
    </select>
  )
}

function MiniList<T>({
  label, items, onRemove, renderChip,
  adding, onAdd, onCancel, onCommit, addLabel, children,
}: {
  label: string
  items: T[]
  onRemove: (i: number) => void
  renderChip: (item: T) => string
  adding: boolean
  onAdd: () => void
  onCancel: () => void
  onCommit: () => void
  addLabel: string
  children?: React.ReactNode
}) {
  return (
    <div>
      <label className="form-label">{label}</label>
      {items.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] text-sm">
              <span className="text-[#1f2937]">{renderChip(item)}</span>
              <button type="button" onClick={() => onRemove(i)}
                className="text-[#9ca3af] hover:text-red-400 ml-2 text-xs transition-colors">✕</button>
            </div>
          ))}
        </div>
      )}
      {adding ? (
        <div className="border border-[#e5e7eb] rounded-xl p-3 space-y-2">
          {children}
          <div className="flex gap-2">
            <button type="button" onClick={onCommit}
              className="flex-1 text-sm font-medium bg-[#6366f1] text-white rounded-lg px-3 py-2 hover:bg-[#4f46e5] transition-colors">
              Adicionar
            </button>
            <button type="button" onClick={onCancel}
              className="flex-1 text-sm text-[#6b7280] border border-[#e5e7eb] rounded-lg px-3 py-2 hover:bg-[#f3f4f6] transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={onAdd}
          className="w-full text-sm text-[#6366f1] border border-dashed border-[#6366f1]/40 rounded-xl px-3 py-2.5 hover:bg-[#6366f1]/[0.03] transition-colors">
          {addLabel}
        </button>
      )}
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [step, setStep] = useState<'upload' | 'form'>('upload')

  // sketch upload
  const [sketchBase64, setSketchBase64] = useState<string | null>(null)
  const [sketchMime, setSketchMime] = useState<string>('image/jpeg')
  const [sketchPreview, setSketchPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [aiFields, setAiFields] = useState<Set<string>>(new Set())

  // 3d model
  const [modelLoading, setModelLoading] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  const [modelImages, setModelImages] = useState<{ perspective: string; topDown: string; planta: string | null } | null>(null)

  // section visibility
  const [showAberturas, setShowAberturas] = useState(false)
  const [showAcabamentos, setShowAcabamentos] = useState(false)

  // manual add-room mini-form
  const [addingRoom, setAddingRoom] = useState(false)
  const [newRoomNome, setNewRoomNome] = useState('')
  const [newRoomPos, setNewRoomPos] = useState<AmbienteInterno['posicao'] | ''>('')
  const [newRoomLarg, setNewRoomLarg] = useState('')
  const [newRoomProf, setNewRoomProf] = useState('')

  function commitRoom() {
    if (!newRoomNome.trim() || !newRoomPos) return
    const room: AmbienteInterno = {
      nome: newRoomNome.trim(),
      posicao: newRoomPos,
      largura: newRoomLarg ? parseFloat(newRoomLarg) : null,
      profundidade: newRoomProf ? parseFloat(newRoomProf) : null,
    }
    setForm(f => ({ ...f, ambientesInternos: [...f.ambientesInternos, room] }))
    setNewRoomNome(''); setNewRoomPos(''); setNewRoomLarg(''); setNewRoomProf('')
    setAddingRoom(false)
  }

  // Janela custom mini-form
  const [addingJanela, setAddingJanela] = useState(false)
  const [newJanela, setNewJanela] = useState({ parede: '' as EntradaPos | '', posH: 'centro' as PosicaoH, largura: '1.2', altura: '1.2', peitoril: '0.9' })
  function commitJanela() {
    if (!newJanela.parede || !newJanela.largura || !newJanela.altura) return
    const j: JanelaCustom = { parede: newJanela.parede as EntradaPos, posicaoH: newJanela.posH, largura: parseFloat(newJanela.largura), altura: parseFloat(newJanela.altura), peitoril: newJanela.peitoril ? parseFloat(newJanela.peitoril) : 0.9 }
    setForm(f => ({ ...f, janelasCustom: [...f.janelasCustom, j] }))
    setNewJanela({ parede: '', posH: 'centro', largura: '1.2', altura: '1.2', peitoril: '0.9' })
    setAddingJanela(false)
  }

  // Porta interna mini-form
  const [addingPorta, setAddingPorta] = useState(false)
  const [newPorta, setNewPorta] = useState({ parede: '' as EntradaPos | '', posH: 'centro' as PosicaoH, largura: '0.9' })
  function commitPorta() {
    if (!newPorta.parede || !newPorta.largura) return
    const p: PortaInterna = { parede: newPorta.parede as EntradaPos, posicaoH: newPorta.posH, largura: parseFloat(newPorta.largura) }
    setForm(f => ({ ...f, portasInternas: [...f.portasInternas, p] }))
    setNewPorta({ parede: '', posH: 'centro', largura: '0.9' })
    setAddingPorta(false)
  }

  // Pilar custom mini-form
  const [addingPilar, setAddingPilar] = useState(false)
  const [newPilar, setNewPilar] = useState({ posX: '', posY: '', diametro: '0.2' })
  function commitPilar() {
    if (!newPilar.posX || !newPilar.posY) return
    const p: PilarCustom = { posX: parseFloat(newPilar.posX), posY: parseFloat(newPilar.posY), diametro: parseFloat(newPilar.diametro || '0.2') }
    setForm(f => ({ ...f, pilaresCustom: [...f.pilaresCustom, p] }))
    setNewPilar({ posX: '', posY: '', diametro: '0.2' })
    setAddingPilar(false)
  }

  // Móvel fixo mini-form
  const [addingMovel, setAddingMovel] = useState(false)
  const [newMovel, setNewMovel] = useState({ tipo: 'bancada' as MovelTipo, parede: '' as EntradaPos | 'centro' | '', posH: 'centro' as PosicaoH, largura: '', profundidade: '0.6', altura: '0.9' })
  function commitMovel() {
    if (!newMovel.parede || !newMovel.largura) return
    const m: MovelFixo = { tipo: newMovel.tipo, parede: newMovel.parede as EntradaPos | 'centro', posicaoH: newMovel.posH, largura: parseFloat(newMovel.largura), profundidade: parseFloat(newMovel.profundidade || '0.6'), altura: parseFloat(newMovel.altura || '0.9') }
    setForm(f => ({ ...f, moveisFixos: [...f.moveisFixos, m] }))
    setNewMovel({ tipo: 'bancada', parede: '', posH: 'centro', largura: '', profundidade: '0.6', altura: '0.9' })
    setAddingMovel(false)
  }

  // Escada custom mini-form
  const [addingEscada, setAddingEscada] = useState(false)
  const [newEscada, setNewEscada] = useState({ parede: '' as EntradaPos | '', posH: 'esq' as PosicaoH, largura: '0.9' })
  function commitEscada() {
    if (!newEscada.parede) return
    const e: EscadaCustom = { parede: newEscada.parede as EntradaPos, posicaoH: newEscada.posH, largura: parseFloat(newEscada.largura || '0.9') }
    setForm(f => ({ ...f, escadasCustom: [...f.escadasCustom, e] }))
    setNewEscada({ parede: '', posH: 'esq', largura: '0.9' })
    setAddingEscada(false)
  }

  const [form, setForm] = useState<FormState>({
    area: 40,
    comprimento: undefined, largura: undefined, alturaPeDireito: undefined,
    peDireito: '',
    entradaPos: '', portaLargura: undefined,
    plantaForma: '', janelasPos: '', elementosFixos: [], ambientesInternos: [],
    janelasCustom: [], portasInternas: [], pilaresCustom: [], moveisFixos: [], escadasCustom: [],
    pisoTipo: '', paredeTipo: '', tetoTipo: '',
  })

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function toggleElemento(val: ElementoFixo) {
    setForm(f => ({
      ...f,
      elementosFixos: f.elementosFixos.includes(val)
        ? f.elementosFixos.filter(e => e !== val)
        : [...f.elementosFixos, val],
    }))
  }

  // Always metric — convert to feet for API
  function toApiForm(): BriefFormData {
    return {
      ...(form as unknown as BriefFormData),
      comprimento: form.comprimento != null ? form.comprimento * 3.281 : undefined,
      largura: form.largura != null ? form.largura * 3.281 : undefined,
      alturaPeDireito: form.alturaPeDireito != null ? form.alturaPeDireito * 3.281 : undefined,
      area: Math.round(form.area * 10.764),
    }
  }

  // ── upload handlers ───────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAnalyzeError(null)
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setSketchPreview(dataUrl)
      setSketchBase64(dataUrl.split(',')[1])
      setSketchMime(file.type || 'image/jpeg')
    }
    reader.readAsDataURL(file)
  }

  async function analyzeSketch() {
    if (!sketchBase64) return
    setAnalyzing(true)
    setAnalyzeError(null)
    try {
      const res = await fetch('/api/analisar-croqui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: sketchBase64, mimeType: sketchMime }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro')

      const filled = new Set<string>()
      const updates: Partial<FormState> = {}

      if (data.plantaForma)  { updates.plantaForma = data.plantaForma;   filled.add('plantaForma') }
      if (data.entradaPos)   { updates.entradaPos  = data.entradaPos;    filled.add('entradaPos') }
      if (data.portaLargura) { updates.portaLargura = data.portaLargura }
      if (data.janelasPos)   { updates.janelasPos  = data.janelasPos;    filled.add('janelasPos') }
      if (Array.isArray(data.elementosFixos) && data.elementosFixos.length) {
        updates.elementosFixos = data.elementosFixos; filled.add('elementosFixos')
      }
      if (data.comprimento)  { updates.comprimento = data.comprimento;   filled.add('comprimento') }
      if (data.largura)      { updates.largura     = data.largura;       filled.add('largura') }
      if (data.area) {
        updates.area = Math.min(280, Math.max(15, Math.round(data.area / 5) * 5))
        filled.add('area')
      }
      if (data.peDireito)       { updates.peDireito       = data.peDireito;       filled.add('peDireito') }
      if (data.alturaPeDireito) { updates.alturaPeDireito = data.alturaPeDireito; filled.add('alturaPeDireito') }


      setForm(f => ({ ...f, ...updates }))
      setAiFields(filled)
      setStep('form')
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Não foi possível ler o croqui. Tente uma imagem mais clara ou preencha manualmente.')
    } finally {
      setAnalyzing(false)
    }
  }

  function resetSketch() {
    setSketchBase64(null)
    setSketchPreview(null)
    setAiFields(new Set())
    setAnalyzeError(null)
    setStep('upload')
  }

  // ── progressive disclosure ────────────────────────────────────────────────

  useEffect(() => {
    if (form.plantaForma || form.peDireito || form.alturaPeDireito) setShowAberturas(true)
  }, [form.plantaForma, form.peDireito, form.alturaPeDireito])

  useEffect(() => {
    if (form.entradaPos) setShowAcabamentos(true)
  }, [form.entradaPos])

  // auto-set peDireito from numeric height
  useEffect(() => {
    if (form.alturaPeDireito) {
      const h = form.alturaPeDireito
      set('peDireito', h < 2.4 ? 'baixo' : h <= 3.35 ? 'medio' : 'alto')
    }
  }, [form.alturaPeDireito])

  // auto-calc area from dimensions
  useEffect(() => {
    if (form.comprimento && form.largura) {
      set('area', Math.min(280, Math.max(15, Math.round(form.comprimento * form.largura / 5) * 5)))
    }
  }, [form.comprimento, form.largura])

  // ── model ─────────────────────────────────────────────────────────────────

  async function handleGerarModelo() {
    setModelLoading(true)
    setModelError(null)
    setModelImages(null)
    try {
      const res = await fetch('/api/modelo3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toApiForm()),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setModelError(data.error ?? 'Erro ao gerar modelo 3D')
      } else {
        setModelImages({ perspective: data.perspective, topDown: data.topDown, planta: data.planta ?? null })
      }
    } catch (err) {
      setModelError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setModelLoading(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-[#e5e7eb] bg-[#f8f9fb] px-4 py-3.5 text-[0.9375rem] text-[#1f2937] placeholder-[#9ca3af] focus:outline-none focus:ring-1 focus:ring-[#6366f1]'

  // ── header ────────────────────────────────────────────────────────────────

  const Header = (
    <div className="mb-10 text-center">
      <p className="text-[10px] font-bold tracking-[0.25em] text-[#9ca3af] uppercase mb-5">Gerador de modelo 3D</p>
      <h1 className="text-[2rem] font-bold text-[#1f2937] leading-tight">
        Otelie
      </h1>
      <p className="mt-4 text-[#9ca3af] text-base">Faça upload do croqui e gere o modelo 3D do seu espaço</p>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // STEP: UPLOAD
  // ─────────────────────────────────────────────────────────────────────────

  if (step === 'upload') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl">
          {Header}

          <div className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden">
            <div className="px-8 pt-8 pb-7">
              <p className={SECTION_LABEL} style={SECTION_STYLE}>Croqui de planta</p>

              <label className={`block border-2 border-dashed rounded-xl cursor-pointer transition-colors ${sketchPreview ? 'border-[#6366f1]/30 bg-[#6366f1]/[0.02]' : 'border-[#e5e7eb] hover:border-[#6366f1]/30'}`}>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                {sketchPreview ? (
                  <div className="p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sketchPreview} alt="sketch" className="max-h-64 mx-auto rounded-lg object-contain" />
                    <p className="text-center text-xs text-[#6366f1] mt-3 font-medium">
                      Croqui carregado — clique para trocar
                    </p>
                  </div>
                ) : (
                  <div className="px-8 py-12 text-center">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#f3f4f6] flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 3v10M6 7l4-4 4 4" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <p className="text-sm text-[#6b7280] font-medium">Arraste ou clique — foto, scan ou arquivo digital</p>
                    <p className="text-xs text-[#9ca3af] mt-1">JPG · PNG · desenhado à mão, impresso ou digital</p>
                  </div>
                )}
              </label>

              {analyzeError && (
                <p className="mt-3 text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{analyzeError}</p>
              )}

              <button
                type="button"
                onClick={analyzeSketch}
                disabled={!sketchBase64 || analyzing}
                className="w-full mt-4 py-3.5 rounded-xl bg-[#6366f1] text-white font-semibold text-sm hover:bg-[#4f46e5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {analyzing ? 'Analisando planta…' : 'Analisar croqui'}
              </button>

              <p className="text-center mt-4">
                <button type="button" onClick={() => setStep('form')}
                  className="text-sm text-[#9ca3af] hover:text-[#6b7280] underline underline-offset-2 transition-colors">
                  Preencher manualmente
                </button>
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-[#9ca3af]">Otelie · gerador de ambientes</p>
        </div>
      </main>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP: FORM
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">
        {Header}

        <div className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden space-y-0">

          {/* Sketch thumbnail */}
          {sketchPreview && (
            <div className="px-8 pt-6 pb-0">
              <div className="flex items-center gap-3 p-3 bg-[#f8f9fb] rounded-xl border border-[#e5e7eb]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sketchPreview} alt="croqui" className="w-14 h-14 rounded-lg object-cover border border-[#e5e7eb] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#1f2937]">Croqui carregado</p>
                  <p className="text-[11px] text-[#9ca3af] mt-0.5 leading-snug">Campos espaciais preenchidos — revise e ajuste</p>
                </div>
                <button type="button" onClick={resetSketch}
                  className="text-xs text-[#9ca3af] hover:text-[#6b7280] shrink-0 transition-colors">
                  Trocar
                </button>
              </div>
            </div>
          )}

          {/* Bloco 1 — Planta */}
          <div className="px-8 pt-8 pb-7">
            <p className={SECTION_LABEL} style={SECTION_STYLE}>
              Planta
              {(aiFields.has('plantaForma') || aiFields.has('comprimento') || aiFields.has('area') || aiFields.has('peDireito')) && <AiBadge />}
            </p>
            <div className="space-y-6">

              <div>
                <label className="form-label">Formato da planta</label>
                <div className="flex flex-col gap-2">
                  {([
                    ['corredor', 'Corredor'],['retangular', 'Retangular'],
                    ['quadrado', 'Quadrado'],['formato-l', 'Formato L'],['irregular', 'Irregular'],
                  ] as [PlantaForma, string][]).map(([val, label]) => (
                    <button key={val} type="button" onClick={() => set('plantaForma', val)}
                      className={`opt-btn${form.plantaForma === val ? ' selected' : ''}`}>
                      {label}
                      {aiFields.has('plantaForma') && form.plantaForma === val && <span className="ml-1.5 text-[8px] font-bold bg-[#6366f1]/15 text-[#6366f1] px-1 py-0.5 rounded">IA</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">
                  Dimensões <span className="text-[#9ca3af] font-normal normal-case tracking-normal">(opcional)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { key: 'comprimento' as const, label: 'Comprimento' },
                    { key: 'largura' as const, label: 'Largura' },
                  ]).map(({ key, label }) => (
                    <div key={key}>
                      <p className="text-xs text-[#9ca3af] mb-1.5 flex items-center gap-1">
                        {label}
                        {aiFields.has(key) && <span className="text-[8px] font-bold text-[#6366f1]">IA</span>}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <input type="number" min={1} max={60} step={0.5} placeholder="—"
                          value={form[key] ?? ''}
                          onChange={e => set(key, e.target.value ? Number(e.target.value) : undefined)}
                          className={`w-full rounded-xl border px-3 py-3 text-[0.9375rem] text-[#1f2937] placeholder-[#9ca3af] focus:outline-none focus:ring-1 focus:ring-[#6366f1] ${aiFields.has(key) ? 'border-[#6366f1]/30 bg-[#6366f1]/[0.03]' : 'border-[#e5e7eb] bg-[#f8f9fb]'}`}
                        />
                        <span className="text-sm text-[#9ca3af] shrink-0">m</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-0">
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Área
                    {aiFields.has('area') && <AiBadge />}
                  </label>
                  {form.comprimento && form.largura && (
                    <span className="text-[10px] text-[#6366f1] font-medium">calculado automaticamente</span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2.5">
                  <input type="range" min={15} max={280} step={5} value={form.area}
                    onChange={e => set('area', Number(e.target.value))} className="flex-1 accent-[#6366f1]" />
                  <span className="text-base font-semibold text-[#1f2937] w-24 text-right tabular-nums">{form.area} m²</span>
                </div>
              </div>

              <div>
                <label className="form-label">
                  Pé-direito
                  {(aiFields.has('peDireito') || aiFields.has('alturaPeDireito')) && <AiBadge />}
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input type="number" min={1.5} max={10} step={0.1} placeholder="—"
                    value={form.alturaPeDireito ?? ''}
                    onChange={e => set('alturaPeDireito', e.target.value ? Number(e.target.value) : undefined)}
                    className={`w-24 rounded-xl border px-3 py-2.5 text-[0.9375rem] text-[#1f2937] placeholder-[#9ca3af] focus:outline-none focus:ring-1 focus:ring-[#6366f1] ${aiFields.has('alturaPeDireito') ? 'border-[#6366f1]/30 bg-[#6366f1]/[0.03]' : 'border-[#e5e7eb] bg-[#f8f9fb]'}`}
                  />
                  <span className="text-sm text-[#9ca3af]">m</span>
                  {form.alturaPeDireito && (
                    <span className="text-[11px] text-[#6366f1] font-medium">
                      {form.alturaPeDireito < 2.4 ? 'baixo' : form.alturaPeDireito <= 3.35 ? 'médio' : 'alto'}
                    </span>
                  )}
                </div>
                {!form.alturaPeDireito && (
                  <div className="flex flex-col gap-2">
                    {([['baixo', 'Baixo  — até 2,4m'],['medio', 'Médio  — 2,4 a 3,35m'],['alto', 'Alto  — acima de 3,35m']] as [PeDireito, string][]).map(([val, label]) => (
                      <button key={val} type="button" onClick={() => set('peDireito', val)}
                        className={`opt-btn${form.peDireito === val ? ' selected' : ''}`}>
                        {label}
                        {aiFields.has('peDireito') && form.peDireito === val && <span className="ml-1.5 text-[8px] font-bold bg-[#6366f1]/15 text-[#6366f1] px-1 py-0.5 rounded">IA</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Bloco 2 — Aberturas */}
          <Section visible={showAberturas}>
            <hr className="section-divider" />
            <div className="px-8 py-7">
              <p className={SECTION_LABEL} style={SECTION_STYLE}>
                Aberturas
                {(aiFields.has('entradaPos') || aiFields.has('janelasPos') || aiFields.has('elementosFixos')) && <AiBadge />}
              </p>
              <div className="space-y-6">

                <div>
                  <label className="form-label">Posição da entrada principal</label>
                  <OptGrid
                    options={[['frente','Frente'],['lateral-esq','Lateral esq.'],['lateral-dir','Lateral dir.'],['fundo','Fundo']] as [EntradaPos, string][]}
                    value={form.entradaPos} onChange={v => set('entradaPos', v)}
                    aiFields={aiFields} fieldKey="entradaPos"
                  />
                </div>

                <div>
                  <label className="form-label">Posição das janelas</label>
                  <div className="flex flex-col gap-2">
                    {([
                      ['so-frente', 'Só na frente'],['frente-lateral', 'Frente + lateral'],
                      ['so-lateral', 'Só lateral'],['sem-janelas', 'Sem janelas'],
                    ] as [JanelasPos, string][]).map(([val, label]) => (
                      <button key={val} type="button" onClick={() => set('janelasPos', val)}
                        className={`opt-btn${form.janelasPos === val ? ' selected' : ''}`}>
                        {label}
                        {aiFields.has('janelasPos') && form.janelasPos === val && <span className="ml-1.5 text-[8px] font-bold bg-[#6366f1]/15 text-[#6366f1] px-1 py-0.5 rounded">IA</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <MiniList<AmbienteInterno>
                  label="Ambientes internos"
                  items={form.ambientesInternos}
                  onRemove={i => setForm(f => ({ ...f, ambientesInternos: f.ambientesInternos.filter((_, j) => j !== i) }))}
                  renderChip={a => `${a.nome || 'Ambiente'} · ${a.posicao}${a.largura && a.profundidade ? ` · ${a.largura}×${a.profundidade}m` : ''}`}
                  adding={addingRoom}
                  onAdd={() => setAddingRoom(true)}
                  onCancel={() => setAddingRoom(false)}
                  onCommit={commitRoom}
                  addLabel="+ Adicionar ambiente interno"
                >
                  <input type="text" placeholder="Nome (ex: Banheiro, Copa)" value={newRoomNome}
                    onChange={e => setNewRoomNome(e.target.value)}
                    className="w-full text-sm border border-[#e5e7eb] rounded-lg px-3 py-2 outline-none focus:border-[#6366f1]" />
                  <select value={newRoomPos} onChange={e => setNewRoomPos(e.target.value as AmbienteInterno['posicao'])}
                    className="w-full text-sm border border-[#e5e7eb] rounded-lg px-3 py-2 bg-white outline-none focus:border-[#6366f1]">
                    <option value="">Posição no espaço</option>
                    <option value="canto-sw">Canto frente-esq</option>
                    <option value="canto-se">Canto frente-dir</option>
                    <option value="canto-nw">Canto fundo-esq</option>
                    <option value="canto-ne">Canto fundo-dir</option>
                    <option value="fundo-centro">Fundo centro</option>
                    <option value="lateral">Lateral</option>
                  </select>
                  <div className="flex gap-2">
                    <NumInput placeholder="Largura (m)" value={newRoomLarg} onChange={setNewRoomLarg} />
                    <NumInput placeholder="Profund. (m)" value={newRoomProf} onChange={setNewRoomProf} />
                  </div>
                </MiniList>

                {/* Janelas extras */}
                <MiniList<JanelaCustom>
                  label="Janelas extras"
                  items={form.janelasCustom}
                  onRemove={i => setForm(f => ({ ...f, janelasCustom: f.janelasCustom.filter((_, j) => j !== i) }))}
                  renderChip={j => `${j.parede} · ${j.largura}×${j.altura}m`}
                  adding={addingJanela}
                  onAdd={() => setAddingJanela(true)}
                  onCancel={() => setAddingJanela(false)}
                  onCommit={commitJanela}
                  addLabel="+ Adicionar janela"
                >
                  <WallSelect value={newJanela.parede} onChange={v => setNewJanela(p => ({ ...p, parede: v as EntradaPos }))} />
                  <PosHSelect value={newJanela.posH} onChange={v => setNewJanela(p => ({ ...p, posH: v }))} />
                  <div className="flex gap-2">
                    <NumInput placeholder="Largura (m)" value={newJanela.largura} onChange={v => setNewJanela(p => ({ ...p, largura: v }))} />
                    <NumInput placeholder="Altura (m)" value={newJanela.altura} onChange={v => setNewJanela(p => ({ ...p, altura: v }))} />
                    <NumInput placeholder="Peitoril (m)" value={newJanela.peitoril} onChange={v => setNewJanela(p => ({ ...p, peitoril: v }))} />
                  </div>
                </MiniList>

                {/* Portas internas */}
                <MiniList<PortaInterna>
                  label="Portas internas"
                  items={form.portasInternas}
                  onRemove={i => setForm(f => ({ ...f, portasInternas: f.portasInternas.filter((_, j) => j !== i) }))}
                  renderChip={p => `${p.parede} · ${p.largura}m`}
                  adding={addingPorta}
                  onAdd={() => setAddingPorta(true)}
                  onCancel={() => setAddingPorta(false)}
                  onCommit={commitPorta}
                  addLabel="+ Adicionar porta interna"
                >
                  <WallSelect value={newPorta.parede} onChange={v => setNewPorta(p => ({ ...p, parede: v as EntradaPos }))} />
                  <PosHSelect value={newPorta.posH} onChange={v => setNewPorta(p => ({ ...p, posH: v }))} />
                  <NumInput placeholder="Largura (m)" value={newPorta.largura} onChange={v => setNewPorta(p => ({ ...p, largura: v }))} />
                </MiniList>

                {/* Pilares */}
                <MiniList<PilarCustom>
                  label="Pilares"
                  items={form.pilaresCustom}
                  onRemove={i => setForm(f => ({ ...f, pilaresCustom: f.pilaresCustom.filter((_, j) => j !== i) }))}
                  renderChip={p => `X:${p.posX}m Y:${p.posY}m ⌀${p.diametro}m`}
                  adding={addingPilar}
                  onAdd={() => setAddingPilar(true)}
                  onCancel={() => setAddingPilar(false)}
                  onCommit={commitPilar}
                  addLabel="+ Adicionar pilar"
                >
                  <div className="flex gap-2">
                    <NumInput placeholder="Pos X (m da esq)" value={newPilar.posX} onChange={v => setNewPilar(p => ({ ...p, posX: v }))} />
                    <NumInput placeholder="Pos Y (m da frente)" value={newPilar.posY} onChange={v => setNewPilar(p => ({ ...p, posY: v }))} />
                    <NumInput placeholder="Diâm. (m)" value={newPilar.diametro} onChange={v => setNewPilar(p => ({ ...p, diametro: v }))} />
                  </div>
                </MiniList>

                {/* Móveis fixos */}
                <MiniList<MovelFixo>
                  label="Móveis fixos"
                  items={form.moveisFixos}
                  onRemove={i => setForm(f => ({ ...f, moveisFixos: f.moveisFixos.filter((_, j) => j !== i) }))}
                  renderChip={m => `${m.tipo} · ${m.parede} · ${m.largura}×${m.profundidade}m`}
                  adding={addingMovel}
                  onAdd={() => setAddingMovel(true)}
                  onCancel={() => setAddingMovel(false)}
                  onCommit={commitMovel}
                  addLabel="+ Adicionar móvel fixo"
                >
                  <select value={newMovel.tipo} onChange={e => setNewMovel(p => ({ ...p, tipo: e.target.value as MovelTipo }))}
                    className="w-full text-sm border border-[#e5e7eb] rounded-lg px-3 py-2 bg-white outline-none focus:border-[#6366f1]">
                    <option value="bancada">Bancada</option>
                    <option value="balcao">Balcão</option>
                    <option value="prateleira">Prateleira</option>
                    <option value="ilha">Ilha central</option>
                  </select>
                  <select value={newMovel.parede} onChange={e => setNewMovel(p => ({ ...p, parede: e.target.value as EntradaPos | 'centro' }))}
                    className="w-full text-sm border border-[#e5e7eb] rounded-lg px-3 py-2 bg-white outline-none focus:border-[#6366f1]">
                    <option value="">Posição</option>
                    <option value="frente">Parede frente</option>
                    <option value="fundo">Parede fundo</option>
                    <option value="lateral-esq">Lateral esq.</option>
                    <option value="lateral-dir">Lateral dir.</option>
                    <option value="centro">Centro (ilha)</option>
                  </select>
                  {newMovel.parede !== 'centro' && newMovel.parede !== '' && (
                    <PosHSelect value={newMovel.posH} onChange={v => setNewMovel(p => ({ ...p, posH: v }))} />
                  )}
                  <div className="flex gap-2">
                    <NumInput placeholder="Largura (m)" value={newMovel.largura} onChange={v => setNewMovel(p => ({ ...p, largura: v }))} />
                    <NumInput placeholder="Profund. (m)" value={newMovel.profundidade} onChange={v => setNewMovel(p => ({ ...p, profundidade: v }))} />
                    <NumInput placeholder="Altura (m)" value={newMovel.altura} onChange={v => setNewMovel(p => ({ ...p, altura: v }))} />
                  </div>
                </MiniList>

                {/* Escadas */}
                <MiniList<EscadaCustom>
                  label="Escadas"
                  items={form.escadasCustom}
                  onRemove={i => setForm(f => ({ ...f, escadasCustom: f.escadasCustom.filter((_, j) => j !== i) }))}
                  renderChip={e => `${e.parede} · ${e.posicaoH} · ${e.largura}m`}
                  adding={addingEscada}
                  onAdd={() => setAddingEscada(true)}
                  onCancel={() => setAddingEscada(false)}
                  onCommit={commitEscada}
                  addLabel="+ Adicionar lance de escada"
                >
                  <WallSelect value={newEscada.parede} onChange={v => setNewEscada(p => ({ ...p, parede: v as EntradaPos }))} />
                  <PosHSelect value={newEscada.posH} onChange={v => setNewEscada(p => ({ ...p, posH: v }))} />
                  <NumInput placeholder="Largura (m)" value={newEscada.largura} onChange={v => setNewEscada(p => ({ ...p, largura: v }))} />
                </MiniList>

                <div>
                  <label className="form-label">
                    Elementos fixos <span className="text-[#9ca3af] font-normal normal-case tracking-normal">(selecione todos)</span>
                    {aiFields.has('elementosFixos') && <AiBadge />}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {([['pilares','Pilares'],['desnivel','Desnível'],['mezanino','Mezanino']] as [ElementoFixo, string][]).map(([val, label]) => (
                      <button key={val} type="button" onClick={() => toggleElemento(val)}
                        className={`opt-btn${form.elementosFixos.includes(val) ? ' selected' : ''}`}>{label}</button>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </Section>

          {/* Bloco 3 — Acabamentos + botão 3D */}
          <Section visible={showAcabamentos}>
            <hr className="section-divider" />
            <div className="px-8 py-7">
              <p className={SECTION_LABEL} style={SECTION_STYLE}>Acabamentos existentes</p>
              <div className="space-y-6">

                <div>
                  <label className="form-label">Piso</label>
                  <OptGrid options={[['cimento-queimado','Cimento queimado'],['ceramica','Cerâmica'],['madeira','Madeira'],['vinilico','Vinílico'],['pedra','Pedra'],['outro','Outro']] as [PisoTipo, string][]}
                    value={form.pisoTipo} onChange={v => set('pisoTipo', v)} cols={3} />
                </div>

                <div>
                  <label className="form-label">Paredes</label>
                  <OptGrid options={[['reboco-pintado','Reboco pintado'],['tijolo-aparente','Tijolo aparente'],['azulejo','Azulejo'],['drywall','Drywall'],['outro','Outro']] as [ParedeTipo, string][]}
                    value={form.paredeTipo} onChange={v => set('paredeTipo', v)} cols={3} />
                </div>

                <div>
                  <label className="form-label">Teto</label>
                  <OptGrid options={[['laje-aparente','Laje aparente'],['forro-gesso','Forro de gesso'],['forro-madeira','Forro de madeira'],['steel-deck','Steel deck'],['outro','Outro']] as [TetoTipo, string][]}
                    value={form.tetoTipo} onChange={v => set('tetoTipo', v)} cols={3} />
                </div>

              </div>
            </div>

            {/* CTA modelo 3D */}
            <div className="px-8 pb-8 space-y-3">
              <p className={SECTION_LABEL} style={SECTION_STYLE}>Modelo 3D</p>
              <button type="button" onClick={handleGerarModelo} disabled={modelLoading}
                className="w-full py-3.5 rounded-xl bg-[#1f2937] text-white font-semibold text-sm hover:bg-[#111827] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {modelLoading ? 'Gerando modelo…' : 'Gerar modelo 3D'}
              </button>
              {modelError && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{modelError}</p>}
              {modelImages && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <ViewCard title="Perspectiva 1" src={modelImages.perspective} aspectClass="aspect-[4/3]" />
                    <ViewCard title="Perspectiva 2" src={modelImages.topDown} aspectClass="aspect-[4/3]" />
                  </div>
                  {modelImages.planta && (
                    <ViewCard title="Planta Baixa" src={modelImages.planta} aspectClass="aspect-square" />
                  )}
                  <button type="button" onClick={handleGerarModelo} disabled={modelLoading}
                    className="w-full py-3 rounded-xl border border-[#e5e7eb] text-[#6b7280] font-semibold text-sm hover:bg-[#f8f9fb] transition-colors disabled:opacity-40">
                    Regerar modelo
                  </button>
                </div>
              )}
            </div>
          </Section>

        </div>

        {!sketchPreview && (
          <p className="mt-4 text-center">
            <button type="button" onClick={() => setStep('upload')}
              className="text-sm text-[#9ca3af] hover:text-[#6b7280] underline underline-offset-2 transition-colors">
              ← Croqui de planta
            </button>
          </p>
        )}

        <p className="mt-4 text-center text-sm text-[#9ca3af]">Otelie · gerador de ambientes</p>
      </div>
    </main>
  )
}
