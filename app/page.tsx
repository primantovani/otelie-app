'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { SpaceViewer3DProps } from '@/components/SpaceViewer3D'
const SpaceViewer3D = dynamic(() => import('@/components/SpaceViewer3D'), { ssr: false })
const BriefingDownloadButton = dynamic(() => import('@/components/BriefingDownloadButton'), { ssr: false })
import { pushDebugEntry } from '@/lib/debug-store'
import Logo from '@/components/Logo'
import type {
  BriefFormData, PeDireito, AmbienteInterno,
  PlantaForma, JanelasPos, ElementoFixo, EntradaPos,
  PisoTipo, ParedeTipo, TetoTipo,
  JanelaCustom, PortaInterna, PilarCustom, MovelFixo, MovelTipo, PosicaoH, EscadaCustom,
  FotoAnalise, ConceptRedesign,
  TipoUso, PerfilPublico, OrcamentoProjeto, PrazoProjeto,
} from '@/lib/types'
import { t as tr, type Lang } from '@/lib/i18n'
import type { BriefingSummaryData } from '@/components/BriefingSummaryPDF'


// ─── local state types ────────────────────────────────────────────────────────

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

type NeedsState = {
  tipoUso: TipoUso | ''
  perfilPublico: PerfilPublico[]
  capacidade: string
  palavrasChave: string[]
  restricoes: string
  orcamento: OrcamentoProjeto | ''
  prazo: PrazoProjeto | ''
  referencias: string[]   // base64 dataURLs
  nomeMarca: string
  redeSocial: string
  primeiraUnidade: 'sim' | 'nao' | ''
}

// ─── shared atoms ─────────────────────────────────────────────────────────────

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
            <span className="ml-1.5 text-[8px] font-bold bg-[#D1A23A]/15 text-[#D1A23A] px-1 py-0.5 rounded">IA</span>
          )}
        </button>
      ))}
    </div>
  )
}

function MultiSelect<T extends string>({ options, value, onChange, cols = 2 }: {
  options: [T, string][]
  value: T[]
  onChange: (v: T[]) => void
  cols?: number
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {options.map(([val, label]) => {
        const on = value.includes(val)
        return (
          <button key={val} type="button"
            onClick={() => onChange(on ? value.filter(x => x !== val) : [...value, val])}
            className={`opt-btn${on ? ' selected' : ''}`}>{label}</button>
        )
      })}
    </div>
  )
}

function Section({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80)
    return () => clearTimeout(timer)
  }, [visible])
  if (!visible) return null
  return <div ref={ref} className="reveal-section">{children}</div>
}

function AiBadge() {
  return <span className="ml-2 text-[8px] font-bold bg-[#D1A23A]/10 text-[#D1A23A] px-1.5 py-0.5 rounded-full tracking-wide">IA</span>
}

function NumInput({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <input type="number" placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)} min="0.1" step="0.1"
      className="w-full text-sm border border-[#e5e7eb] rounded-lg px-3 py-2 outline-none focus:border-[#D1A23A]" />
  )
}

function WallSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full text-sm border border-[#e5e7eb] rounded-lg px-3 py-2 bg-white outline-none focus:border-[#D1A23A]">
      <option value="">Parede</option>
      <option value="frente">Frente</option><option value="fundo">Fundo</option>
      <option value="lateral-esq">Lateral esq.</option><option value="lateral-dir">Lateral dir.</option>
    </select>
  )
}

function PosHSelect({ value, onChange }: { value: string; onChange: (v: PosicaoH) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value as PosicaoH)}
      className="w-full text-sm border border-[#e5e7eb] rounded-lg px-3 py-2 bg-white outline-none focus:border-[#D1A23A]">
      <option value="esq">Lado esquerdo</option>
      <option value="centro">Centro</option>
      <option value="dir">Lado direito</option>
    </select>
  )
}

function MiniList<T>({ label, items, onRemove, renderChip, adding, onAdd, onCancel, onCommit, addLabel, children }: {
  label: string; items: T[]; onRemove: (i: number) => void; renderChip: (item: T) => string
  adding: boolean; onAdd: () => void; onCancel: () => void; onCommit: () => void; addLabel: string; children?: React.ReactNode
}) {
  return (
    <div>
      <label className="form-label">{label}</label>
      {items.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-[#e5e7eb] bg-[#f8f9fb] text-sm">
              <span className="text-[#1a1a1a]">{renderChip(item)}</span>
              <button type="button" onClick={() => onRemove(i)} className="text-[#9ca3af] hover:text-red-400 ml-2 text-xs transition-colors">✕</button>
            </div>
          ))}
        </div>
      )}
      {adding ? (
        <div className="border border-[#e5e7eb] rounded-xl p-3 space-y-2">
          {children}
          <div className="flex gap-2">
            <button type="button" onClick={onCommit} className="flex-1 text-sm font-medium bg-[#D1A23A] text-white rounded-lg px-3 py-2 hover:bg-[#a07d2e] transition-colors">Adicionar</button>
            <button type="button" onClick={onCancel} className="flex-1 text-sm text-[#6b7280] border border-[#e5e7eb] rounded-lg px-3 py-2 hover:bg-[#f3f4f6] transition-colors">Cancelar</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={onAdd}
          className="w-full text-sm text-[#D1A23A] border border-dashed border-[#D1A23A]/40 rounded-xl px-3 py-2.5 hover:bg-[#D1A23A]/[0.03] transition-colors">
          {addLabel}
        </button>
      )}
    </div>
  )
}

// ─── stage navigation ─────────────────────────────────────────────────────────

function StageNav({ stage, maxStage, onSelect, tx }: {
  stage: 1 | 2 | 3
  maxStage: number
  onSelect: (n: 1 | 2 | 3) => void
  tx: typeof tr[Lang]
}) {
  const stages = [
    { n: 1 as const, short: tx.bfStep1 },
    { n: 2 as const, short: tx.bfStep2 },
    { n: 3 as const, short: tx.bfStep3 },
  ]
  // With 3 steps, circles sit at 1/6, 3/6, 5/6 of the container.
  // Track runs between them: left=16.67%, right=16.67%.
  // Progress fill grows from left=16.67% by up to 66.67% of container.
  const progressPct = ((maxStage - 1) / (stages.length - 1)) * 100
  const progressWidth = `${progressPct * (2 / 3)}%`

  return (
    <div className="relative mb-8" style={{ fontFamily: 'var(--font-mono, Inter, sans-serif)' }}>
      {/* track */}
      <div className="absolute h-px bg-[#e5e7eb]"
        style={{ top: '0.875rem', left: 'calc(100% / 6)', right: 'calc(100% / 6)' }} />
      {/* progress fill */}
      <div className="absolute h-px bg-[#D1A23A] transition-all duration-300"
        style={{ top: '0.875rem', left: 'calc(100% / 6)', width: progressWidth }} />
      {/* steps — each takes exactly 1/3 so circles land at 1/6, 3/6, 5/6 */}
      <div className="relative flex">
        {stages.map(s => {
          const done      = maxStage > s.n
          const active    = stage === s.n
          const reachable = maxStage >= s.n
          return (
            <button key={s.n}
              onClick={() => reachable && onSelect(s.n)}
              disabled={!reachable}
              className="flex-1 flex flex-col items-center gap-1.5 transition-opacity"
              style={{ opacity: reachable ? 1 : 0.35, cursor: reachable ? 'pointer' : 'default' }}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors"
                style={{
                  background: active ? '#D1A23A' : done ? '#1a1a1a' : '#f3f4f6',
                  color: active ? '#fff' : done ? '#fff' : '#9ca3af',
                  border: active ? '2px solid #D1A23A' : 'none',
                }}>
                {done ? '✓' : s.n}
              </div>
              <span className="text-[9px] font-medium uppercase tracking-wider hidden sm:block text-center"
                style={{ color: active ? '#1a1a1a' : done ? '#D1A23A' : '#9ca3af' }}>
                {s.short}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── concept display components ───────────────────────────────────────────────

function ConceptCard({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden">
      <div className="px-7 pt-6 pb-2 border-b border-[#f3f4f6]">
        <div className="flex items-baseline gap-3">
          <span className="text-[2.5rem] font-bold leading-none select-none" style={{ color: '#f0f0ee', fontFamily: 'serif' }}>{num}</span>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#D1A23A]" style={{ fontFamily: 'var(--font-mono, Inter, sans-serif)' }}>Concept Redesign™</p>
            <h2 className="text-base font-semibold text-[#1a1a1a]">{title}</h2>
          </div>
        </div>
      </div>
      <div className="px-7 py-6">{children}</div>
    </div>
  )
}

function Pill({ label }: { label: string }) {
  return <span className="inline-block px-3 py-1 bg-[#f3f4f6] text-[#374151] text-[11px] font-medium rounded-full">{label}</span>
}

function ConceptDisplay({ concept, viewerProps, capturedViews, existente, necessidades }: {
  concept: ConceptRedesign
  viewerProps: SpaceViewer3DProps
  capturedViews?: Record<string, string>
  existente?: Record<string, unknown>
  necessidades?: Record<string, unknown>
}) {
  const { atmosfera, ritmoVisual, presencaEmocional, redesignIA, sensoryConcept } = concept
  const [genImages, setGenImages] = useState<Record<string, string>>({})
  const [genEnhanced, setGenEnhanced] = useState<Record<string, string>>({})
  const [genPrompts, setGenPrompts] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  const hasViews = capturedViews && Object.keys(capturedViews).length > 0

  async function gerarVisualizacoes() {
    if (!hasViews) return
    setGenerating(true)
    setGenError(null)
    try {
      const views = capturedViews
      const res = await fetch('/api/concept-imagens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ views, concept, existente, necessidades }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setGenImages(data.images ?? {})
      setGenEnhanced(data.enhancedImages ?? {})
      setGenPrompts(data.prompts ?? {})
      if (data.imageErrors && Object.keys(data.imageErrors).length > 0) {
        const firstErr = Object.values(data.imageErrors as Record<string, string>)[0]
        setGenError(`Imagem não gerada: ${firstErr}`)
      }
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Erro ao gerar visualizações')
    } finally {
      setGenerating(false)
    }
  }

  const VIEW_LABELS: Record<string, string> = { planta: 'Planta', fundo: 'Fundo', frente: 'Frente', dir: 'Dir.', esq: 'Esq.' }

  return (
    <div className="space-y-4">

      {/* 01 Nova Atmosfera */}
      <ConceptCard num="01" title="Nova Atmosfera">
        <div className="space-y-5">
          <div>
            <p className="form-label mb-3">Paleta</p>
            <div className="flex gap-2 flex-wrap">
              {atmosfera.paleta.map((hex, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div className="w-11 h-14 rounded-lg shadow-sm border border-black/5" style={{ background: hex }} />
                  <span className="text-[9px] text-[#9ca3af] font-mono">{hex}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="form-label mb-1">Iluminação</p>
            <p className="text-sm text-[#4b5563]">{atmosfera.temperaturaLuz}</p>
          </div>
          <div>
            <p className="form-label mb-2">Materiais</p>
            <div className="flex flex-wrap gap-2">{atmosfera.materiais.map((m, i) => <Pill key={i} label={m} />)}</div>
          </div>
          <p className="text-sm text-[#4b5563] leading-relaxed">{atmosfera.descricao}</p>
        </div>
      </ConceptCard>

      {/* 02 Ritmo Visual */}
      <ConceptCard num="02" title="Ritmo Visual">
        <div className="space-y-5">
          <SpaceViewer3D {...viewerProps} />
          <p className="text-[10px] text-[#9ca3af] text-center">Arrastar → orbitar · scroll → zoom</p>
          <p className="text-sm text-[#4b5563] leading-relaxed">{ritmoVisual.descricao}</p>
          <div>
            <p className="form-label mb-1">Circulação</p>
            <p className="text-sm text-[#4b5563]">{ritmoVisual.circulacao}</p>
          </div>
          <div>
            <p className="form-label mb-2">Pontos focais</p>
            <ol className="space-y-1">
              {ritmoVisual.pontosFocais.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm text-[#4b5563]">
                  <span className="text-[#D1A23A] font-mono font-bold shrink-0">{i + 1}.</span>
                  {p}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </ConceptCard>

      {/* 03 Presença Emocional */}
      <ConceptCard num="03" title="Presença Emocional">
        <div className="space-y-5">
          <blockquote className="border-l-2 border-[#D1A23A] pl-4 py-1">
            <p className="text-base font-semibold text-[#1a1a1a] italic leading-snug">"{presencaEmocional.conceito}"</p>
          </blockquote>
          <div className="flex flex-wrap gap-2">{presencaEmocional.palavrasChave.map((k, i) => <Pill key={i} label={k} />)}</div>
          <p className="text-sm text-[#4b5563] leading-relaxed">{presencaEmocional.storytelling}</p>
        </div>
      </ConceptCard>

      {/* 04 Visualizações por Vista */}
      <ConceptCard num="04" title="Visualizações do Espaço">
        <div className="space-y-4">
          <p className="text-xs text-[#6b7280] leading-relaxed">
            Claude lê cada render 3D e aplica o conceito Otelie mantendo a mesma câmera e proporções — exibição antes / depois por vista.
          </p>

          {/* generated images grid — render 3D antes / conceito depois */}
          {Object.keys(genImages).length > 0 && (
            <div className="space-y-4">
              {(['planta', 'fundo', 'frente', 'dir', 'esq'] as const).map(id =>
                genImages[id] ? (
                  <div key={id} className="space-y-2">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#9ca3af]" style={{ fontFamily: 'var(--font-mono, Inter, sans-serif)' }}>{VIEW_LABELS[id]} — Antes / Depois</p>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Antes: espaço vazio fotorrealista (fase 1), fallback para render 3D */}
                      {(genEnhanced[id] || capturedViews?.[id]) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={genEnhanced[id] ?? `data:image/jpeg;base64,${capturedViews![id]}`}
                          alt={`Antes ${id}`}
                          className="w-full rounded-xl border border-[#e5e7eb] object-cover"
                          style={{ aspectRatio: '1/1' }}
                        />
                      )}
                      {/* Depois: conceito aplicado (fase 2) */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={genImages[id]} alt={`Conceito ${id}`}
                        className="w-full rounded-xl border border-[#e5e7eb] object-cover" style={{ aspectRatio: '1/1' }} />
                    </div>
                  </div>
                ) : null
              )}
            </div>
          )}

          {/* prompts only (no images) */}
          {Object.keys(genImages).length === 0 && Object.keys(genPrompts).length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-amber-600">Imagens não geradas — prompts prontos para uso em DALL-E 3 ou Midjourney:</p>
              {Object.entries(genPrompts).map(([id, prompt]) => (
                <div key={id} className="rounded-lg bg-[#f8f9fb] border border-[#e5e7eb] p-3 space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#9ca3af]" style={{ fontFamily: 'var(--font-mono, Inter, sans-serif)' }}>{id}</p>
                  <p className="text-[11px] text-[#4b5563] leading-relaxed">{prompt}</p>
                </div>
              ))}
            </div>
          )}

          {genError && <p className="text-xs text-red-500">{genError}</p>}

          <button
            onClick={gerarVisualizacoes}
            disabled={generating || !hasViews}
            className="w-full py-3 rounded-xl border border-[#D1A23A] text-[#D1A23A] text-sm font-medium transition-colors hover:bg-[#D1A23A]/5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {generating
              ? <><span className="animate-spin">⟳</span> Analisando cenas e gerando visualizações…</>
              : Object.keys(genImages).length > 0 ? 'Regenerar visualizações' : 'Gerar visualizações do espaço'
            }
          </button>

          {redesignIA.imagemUrl && Object.keys(genImages).length === 0 && (
            <div className="space-y-2 pt-2 border-t border-[#f3f4f6]">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#9ca3af]" style={{ fontFamily: 'var(--font-mono, Inter, sans-serif)' }}>Concept visual geral</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={redesignIA.imagemUrl} alt="Concept visual"
                className="w-full rounded-xl border border-[#e5e7eb] object-cover" style={{ aspectRatio: '1/1' }} />
            </div>
          )}
        </div>
      </ConceptCard>

      {/* 05 Sensory Concept */}
      <ConceptCard num="05" title="Sensory Concept">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="form-label mb-2">Materiais</p>
              <div className="space-y-1">{sensoryConcept.materiais.map((m, i) => (
                <p key={i} className="text-sm text-[#4b5563] flex gap-2"><span className="text-[#D1A23A]">—</span>{m}</p>
              ))}</div>
            </div>
            <div>
              <p className="form-label mb-2">Texturas</p>
              <div className="space-y-1">{sensoryConcept.texturas.map((t, i) => (
                <p key={i} className="text-sm text-[#4b5563] flex gap-2"><span className="text-[#D1A23A]">—</span>{t}</p>
              ))}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 pt-2 border-t border-[#f3f4f6]">
            <div>
              <p className="form-label mb-1">Trilha sonora</p>
              <p className="text-sm text-[#4b5563]">{sensoryConcept.trilhaSonora}</p>
            </div>
            <div>
              <p className="form-label mb-1">Fragrância</p>
              <p className="text-sm text-[#4b5563]">{sensoryConcept.fragrancia}</p>
            </div>
          </div>
          <p className="text-sm text-[#4b5563] leading-relaxed">{sensoryConcept.descricao}</p>
        </div>
      </ConceptCard>

    </div>
  )
}

// ─── constants ────────────────────────────────────────────────────────────────

const SL = 'text-[10px] font-bold uppercase tracking-[0.15em] text-[#D1A23A] mb-5'
const SS = { fontFamily: 'var(--font-mono, monospace)' }

// ─── page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {

  // ── stage ─────────────────────────────────────────────────────────────────

  const [lang, setLang] = useState<Lang>('pt')
  const tx = tr[lang]

  const [stage,      setStage]      = useState<1 | 2 | 3>(1)
  const [maxStage,   setMaxStage]   = useState<number>(1)

  function goToStage(n: 1 | 2 | 3) {
    setStage(n)
    if (n > maxStage) setMaxStage(n)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── stage 1 — existing form ───────────────────────────────────────────────

  const [sketchBase64,  setSketchBase64]  = useState<string | null>(null)
  const [sketchMime,    setSketchMime]    = useState<string>('image/jpeg')
  const [sketchPreview, setSketchPreview] = useState<string | null>(null)
  const [analyzing,     setAnalyzing]     = useState(false)
  const [analyzeError,  setAnalyzeError]  = useState<string | null>(null)
  const [aiFields,      setAiFields]      = useState<Set<string>>(new Set())

  const [capturedViews, setCapturedViews] = useState<Record<string, string>>({})
  const [showFotos,       setShowFotos]       = useState(false)
  const [showAcabamentos, setShowAcabamentos] = useState(false)
  const [showCroquiHint,  setShowCroquiHint]  = useState(false)

  // unit conversion helpers (EN = imperial, PT = metric)
  const FT_PER_M   = 3.28084
  const SQFT_PER_M2 = 10.7639
  const toM  = (ft: number) => ft / FT_PER_M
  const toFt = (m: number)  => m  * FT_PER_M
  const dimUnit  = lang === 'en' ? 'ft'    : 'm'
  const areaUnit = lang === 'en' ? 'sq ft' : 'm²'
  const displayDim = (m: number | undefined) => m == null ? '' : lang === 'en' ? parseFloat(toFt(m).toFixed(1)).toString() : m.toString()
  // peDirLabel uses stored meters for threshold checks regardless of display unit
  const peDirLabel = (storedM: number) => storedM < 2.4 ? tx.bfPeBaixo : storedM <= 3.35 ? tx.bfPeMedio : tx.bfPeAlto


  const [form, setForm] = useState<FormState>({
    area: 40, comprimento: undefined, largura: undefined, alturaPeDireito: undefined,
    peDireito: '', entradaPos: '', portaLargura: undefined,
    plantaForma: '', janelasPos: '', elementosFixos: [], ambientesInternos: [],
    janelasCustom: [], portasInternas: [], pilaresCustom: [], moveisFixos: [], escadasCustom: [],
    pisoTipo: '', paredeTipo: '', tetoTipo: '',
  })

  function set<K extends keyof FormState>(key: K, val: FormState[K]) { setForm(f => ({ ...f, [key]: val })) }

  const displayArea = lang === 'en' ? Math.round(form.area * SQFT_PER_M2) : form.area

  // progressive disclosure (fotosCat effect is declared after fotosCat below)
  useEffect(() => { if (form.alturaPeDireito) setShowFotos(true) }, [form.alturaPeDireito])
  useEffect(() => { if (form.alturaPeDireito) { const h = form.alturaPeDireito; set('peDireito', h < 2.4 ? 'baixo' : h <= 3.35 ? 'medio' : 'alto') } }, [form.alturaPeDireito])
  useEffect(() => { if (form.comprimento && form.largura) set('area', Math.min(280, Math.max(15, Math.round(form.comprimento * form.largura / 5) * 5))) }, [form.comprimento, form.largura])

  // croqui upload
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setAnalyzeError(null)
    const reader = new FileReader()
    reader.onload = () => { const d = reader.result as string; setSketchPreview(d); setSketchBase64(d.split(',')[1]); setSketchMime(file.type || 'image/jpeg') }
    reader.readAsDataURL(file)
  }
  async function analyzeSketch() {
    if (!sketchBase64) return
    setAnalyzing(true); setAnalyzeError(null)
    try {
      const res = await fetch('/api/analisar-croqui', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: sketchBase64, mimeType: sketchMime }) })
      const data = await res.json()
      if (data._debug) pushDebugEntry(data._debug)
      if (!res.ok) throw new Error(data.error ?? 'Erro')
      const filled = new Set<string>(); const updates: Partial<FormState> = {}
      if (data.plantaForma)  { updates.plantaForma = data.plantaForma;   filled.add('plantaForma') }
      if (data.entradaPos)   { updates.entradaPos  = data.entradaPos;    filled.add('entradaPos') }
      if (data.portaLargura) { updates.portaLargura = data.portaLargura }
      if (data.janelasPos)   { updates.janelasPos  = data.janelasPos;    filled.add('janelasPos') }
      if (Array.isArray(data.elementosFixos) && data.elementosFixos.length) { updates.elementosFixos = data.elementosFixos; filled.add('elementosFixos') }
      if (data.comprimento)  { updates.comprimento = data.comprimento;   filled.add('comprimento') }
      if (data.largura)      { updates.largura     = data.largura;       filled.add('largura') }
      if (data.area)         { updates.area = Math.min(280, Math.max(15, Math.round(data.area / 5) * 5)); filled.add('area') }
      if (data.peDireito)       { updates.peDireito       = data.peDireito;       filled.add('peDireito') }
      if (data.alturaPeDireito) { updates.alturaPeDireito = data.alturaPeDireito; filled.add('alturaPeDireito') }
      if (Array.isArray(data.ambientesInternos) && data.ambientesInternos.length) {
        updates.ambientesInternos = data.ambientesInternos
        filled.add('ambientesInternos')
      }
      setForm(f => ({ ...f, ...updates })); setAiFields(filled)
    } catch (err) { setAnalyzeError(err instanceof Error ? err.message : 'Não foi possível ler o croqui.') }
    finally { setAnalyzing(false) }
  }

  // stage 1.4 — space photos (categorized)
  const FOTO_CATS = [
    { id: 'fachada',    label: tx.bfFotoFachada,    req: true  },
    { id: 'int_fundo',  label: tx.bfFotoIntFundo,   req: true  },
    { id: 'int_frente', label: tx.bfFotoIntFrente,  req: true  },
    { id: 'lat_esq',    label: tx.bfFotoLatEsq,     req: false },
    { id: 'lat_dir',    label: tx.bfFotoLatDir,     req: false },
    { id: 'detalhes',   label: tx.bfFotoDetalhes,   req: false },
  ]

  const [fotosCat,      setFotosCat]      = useState<Record<string, string>>({})   // id → base64
  const [fotosPreview,  setFotosPreview]  = useState<Record<string, string>>({})   // id → dataURL
  const [fotoAnalise,   setFotoAnalise]   = useState<FotoAnalise | null>(null)

  // show acabamentos after first foto is uploaded
  useEffect(() => { if (Object.keys(fotosCat).length > 0) setShowAcabamentos(true) }, [fotosCat])

  function handleFotoChange(catId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const d = reader.result as string
      setFotosPreview(p => ({ ...p, [catId]: d }))
      setFotosCat(p => ({ ...p, [catId]: d.split(',')[1] }))
      setFotoAnalise(null)
    }
    reader.readAsDataURL(file)
  }

  function removeFoto(catId: string) {
    setFotosPreview(p => { const n = { ...p }; delete n[catId]; return n })
    setFotosCat(p => { const n = { ...p }; delete n[catId]; return n })
    setFotoAnalise(null)
  }

  const fotosObrigatorias = FOTO_CATS.filter(c => c.req).map(c => c.id)
  const fotosCompletas = fotosObrigatorias.every(id => fotosCat[id])


  // ── stage 2 — needs ───────────────────────────────────────────────────────

  const [needs, setNeeds] = useState<NeedsState>({
    tipoUso: '', perfilPublico: [], capacidade: '',
    palavrasChave: [], restricoes: '', orcamento: '', prazo: '', referencias: [],
    nomeMarca: '', redeSocial: '', primeiraUnidade: '',
  })
  function setN<K extends keyof NeedsState>(key: K, val: NeedsState[K]) { setNeeds(n => ({ ...n, [key]: val })) }

  const [kwInput, setKwInput] = useState('')

  function addKw() {
    const kw = kwInput.trim(); if (!kw) return
    if (!needs.palavrasChave.includes(kw)) setN('palavrasChave', [...needs.palavrasChave, kw])
    setKwInput('')
  }

  function handleRefChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => { const d = reader.result as string; setN('referencias', [...needs.referencias, d]) }
    reader.readAsDataURL(file)
  }

  // ── stage 3 — concept ─────────────────────────────────────────────────────

  const [concept,       setConcept]       = useState<ConceptRedesign | null>(null)
  const [gerandoConcept, setGerandoConcept] = useState(false)
  const [conceptError,  setConceptError]  = useState<string | null>(null)
  const [elapsed,       setElapsed]       = useState(0)

  // hybrid workflow — project submission
  const [projetoId,          setProjetoId]          = useState<string | null>(null)
  const [solicitandoProjeto, setSolicitandoProjeto] = useState(false)
  const [solicitacaoErro,    setSolicitacaoErro]    = useState<string | null>(null)

  async function solicitarProjeto() {
    setSolicitandoProjeto(true)
    setSolicitacaoErro(null)
    setConcept(null)
    goToStage(3)
    try {
      const res = await fetch('/api/solicitar-projeto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          existente:       form,
          necessidades:    needs,
          fotosCategories: Object.keys(fotosCat),
          fotosBase64:     fotosCat,
          views:           capturedViews.fundo ? { fundo: capturedViews.fundo } : {},
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro')
      setProjetoId(data.id)
    } catch (err) {
      setSolicitacaoErro(err instanceof Error ? err.message : 'Erro ao solicitar projeto')
    } finally {
      setSolicitandoProjeto(false)
    }
  }

  async function gerarConcept() {
    setGerandoConcept(true); setConceptError(null); setConcept(null)
    goToStage(3)
    let t = 0
    const timer = setInterval(() => { t += 1; setElapsed(t) }, 1000)
    try {
      const res = await fetch('/api/concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ existente: form, necessidades: needs, fotoAnalise }),
      })
      const data = await res.json()
      if (data._debug) pushDebugEntry(data._debug)
      if (!res.ok) throw new Error(data.error ?? 'Erro')
      setConcept(data.concept)
    } catch (err) { setConceptError(err instanceof Error ? err.message : 'Erro ao gerar concept') }
    finally { clearInterval(timer); setGerandoConcept(false) }
  }

  // ── viewer props ──────────────────────────────────────────────────────────

  const viewerProps = {
    comprimento: form.comprimento,
    largura: form.largura,
    area: form.area,
    alturaPeDireito: form.alturaPeDireito,
    peDireito: (form.peDireito || 'medio') as PeDireito,
    plantaForma: form.plantaForma || 'retangular',
    janelasPos: 'sem-janelas',
    entradaPos: form.entradaPos || 'frente',
    fachada: '',
    elementosFixos: form.elementosFixos,
    pisoTipo: form.pisoTipo || '',
    paredeTipo: form.paredeTipo || '',
    tetoTipo: form.tetoTipo || '',
    ambientesInternos: form.ambientesInternos,
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen" style={{ background: '#f8f9fb' }}>
      <div className="max-w-xl mx-auto px-4 pt-10 pb-20">

        {/* header */}
        <div className="relative flex flex-col items-center mb-8">
          <Logo variant="stacked" size="md" />
          <button
            onClick={() => setLang(l => l === 'pt' ? 'en' : 'pt')}
            className="absolute right-0 top-0 text-[10px] font-bold tracking-widest text-[#6b7280] hover:text-[#D1A23A] border border-[#e5e7eb] hover:border-[#D1A23A] rounded-lg px-2.5 py-1.5 transition-colors"
            style={{ fontFamily: 'var(--font-mono, Inter, sans-serif)' }}
          >
            {tx.bfLangToggle}
          </button>
        </div>

        {/* stage nav */}
        <StageNav stage={stage} maxStage={maxStage} onSelect={goToStage} tx={tx} />

        {/* ───────────────────────────────────────────────── STAGE 1 */}
        {stage === 1 && (
          <div className="space-y-0">

            {/* ── Levantamento do espaço ──────────────────────── */}
            <>
                <div className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden space-y-0">

                  {/* 1.1 Croqui */}
                  <div className="px-8 pt-7 pb-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className={SL} style={{ ...SS, marginBottom: 0 }}>
                        {tx.bfCroqui}
                        <span className="ml-2 text-[8px] font-normal text-[#9ca3af] normal-case tracking-normal">({tx.bfCroquiOptional})</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowCroquiHint(h => !h)}
                        className="text-[#9ca3af] hover:text-[#D1A23A] transition-colors shrink-0"
                        aria-expanded={showCroquiHint}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/>
                          <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                    {showCroquiHint && (
                      <div className="flex items-start gap-2 px-3 py-2.5 bg-[#f8f9fb] rounded-xl border border-[#e0e7ff] mb-3">
                        <p className="text-xs text-[#6b7280] leading-relaxed">
                          {tx.bfCroquiHint}
                        </p>
                      </div>
                    )}
                    {!sketchPreview ? (
                      <label className="block border-2 border-dashed border-[#e5e7eb] rounded-xl cursor-pointer hover:border-[#D1A23A]/30 transition-colors">
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                        <div className="px-6 py-8 text-center">
                          <p className="text-sm text-[#6b7280] font-medium">{tx.bfCroquiDrop}</p>
                          <p className="text-xs text-[#9ca3af] mt-1">{tx.bfCroquiAiNote}</p>
                        </div>
                      </label>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-[#f8f9fb] rounded-xl border border-[#e5e7eb]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={sketchPreview} alt="croqui" className="w-14 h-14 rounded-lg object-cover border border-[#e5e7eb] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#1a1a1a]">{tx.bfCroquiLoaded}</p>
                          {analyzeError && <p className="text-[10px] text-red-500 mt-0.5">{analyzeError}</p>}
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button onClick={analyzeSketch} disabled={analyzing}
                            className="text-xs bg-[#D1A23A] text-white rounded-lg px-3 py-1.5 font-medium hover:bg-[#a07d2e] transition-colors disabled:opacity-40">
                            {analyzing ? tx.bfCroquiAnalyzing : tx.bfCroquiAnalyze}
                          </button>
                          <button onClick={() => { setSketchBase64(null); setSketchPreview(null); setAiFields(new Set()) }}
                            className="text-xs text-[#9ca3af] hover:text-[#6b7280] transition-colors">{tx.bfCroquiRemove}</button>
                        </div>
                      </div>
                    )}
                  </div>

                  <hr className="section-divider" />

                  {/* 1.2 Geometry */}
                  <div className="px-8 py-7">
                    <p className={SL} style={SS}>
                      {tx.bfPlanta}
                      {(aiFields.has('plantaForma') || aiFields.has('comprimento') || aiFields.has('area') || aiFields.has('peDireito')) && <AiBadge />}
                    </p>
                    <div className="space-y-6">
                      <div>
                        <label className="form-label">{tx.bfDimensoes} <span className="text-[#9ca3af] font-normal normal-case tracking-normal">({tx.bfDimensoesOptional})</span></label>
                        <div className="grid grid-cols-2 gap-3">
                          {(['comprimento', 'largura'] as const).map(key => (
                            <div key={key}>
                              <p className="text-xs text-[#9ca3af] mb-1.5 flex items-center gap-1">
                                {key === 'largura' ? tx.bfLargura : tx.bfComprimento}
                                {aiFields.has(key) && <span className="text-[8px] font-bold text-[#D1A23A]">IA</span>}
                              </p>
                              <div className="flex items-center gap-1.5">
                                <input type="number" min={1} max={lang === 'en' ? 200 : 60} step={0.5} placeholder="—"
                                  value={displayDim(form[key])}
                                  onChange={e => {
                                    const raw = e.target.value ? Number(e.target.value) : undefined
                                    set(key, raw != null ? (lang === 'en' ? toM(raw) : raw) : undefined)
                                  }}
                                  className={`w-full rounded-xl border px-3 py-3 text-[0.9375rem] text-[#1a1a1a] placeholder-[#9ca3af] focus:outline-none focus:ring-1 focus:ring-[#D1A23A] ${aiFields.has(key) ? 'border-[#D1A23A]/30 bg-[#D1A23A]/[0.03]' : 'border-[#e5e7eb] bg-[#f8f9fb]'}`}
                                />
                                <span className="text-sm text-[#9ca3af] shrink-0">{dimUnit}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-baseline justify-between mb-0">
                          <label className="form-label" style={{ marginBottom: 0 }}>{tx.bfAreaAprox}{aiFields.has('area') && <AiBadge />}</label>
                          {form.comprimento && form.largura && <span className="text-[10px] text-[#D1A23A] font-medium">{tx.bfAutoCalc}</span>}
                        </div>
                        <div className="flex items-center gap-4 mt-2.5">
                          <input type="range" min={15} max={280} step={5} value={form.area}
                            onChange={e => set('area', Number(e.target.value))} className="flex-1 accent-[#D1A23A]" />
                          <span className="text-base font-semibold text-[#1a1a1a] w-28 text-right tabular-nums">{displayArea} {areaUnit}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 1.3 Pé-direito — obrigatório */}
                  <hr className="section-divider" />
                  <div className="px-8 py-7">
                    <p className={SL} style={SS}>
                      {tx.bfPeDireito}
                      <span className="ml-1.5 text-amber-500 text-[9px] font-normal normal-case tracking-normal">*</span>
                      {(aiFields.has('peDireito') || aiFields.has('alturaPeDireito')) && <AiBadge />}
                    </p>
                    <div className="flex items-center gap-2">
                      <input type="number"
                        min={lang === 'en' ? 5 : 1.5}
                        max={lang === 'en' ? 33 : 10}
                        step={0.1}
                        placeholder={tx.bfPeDireitoPlaceholder}
                        value={form.alturaPeDireito != null ? (lang === 'en' ? parseFloat(toFt(form.alturaPeDireito).toFixed(1)) : form.alturaPeDireito) : ''}
                        onChange={e => {
                          const raw = e.target.value ? Number(e.target.value) : undefined
                          set('alturaPeDireito', raw != null ? (lang === 'en' ? toM(raw) : raw) : undefined)
                        }}
                        className={`w-28 rounded-xl border px-3 py-2.5 text-[0.9375rem] text-[#1a1a1a] placeholder-[#9ca3af] focus:outline-none focus:ring-1 focus:ring-[#D1A23A] ${aiFields.has('alturaPeDireito') ? 'border-[#D1A23A]/30 bg-[#D1A23A]/[0.03]' : 'border-[#e5e7eb] bg-[#f8f9fb]'}`}
                      />
                      <span className="text-sm text-[#9ca3af]">{tx.bfPeDireitoUnit}</span>
                      {form.alturaPeDireito && <span className="text-[11px] text-[#D1A23A] font-medium">{peDirLabel(form.alturaPeDireito)}</span>}
                    </div>
                  </div>

                  {/* 1.4 Fotos do espaço — aparece após pé-direito preenchido */}
                  <Section visible={showFotos}>
                    <hr className="section-divider" />
                    <div className="px-8 py-7">
                      <div className="flex items-center justify-between mb-1">
                        <p className={SL} style={SS}>{tx.bfFotos}</p>
                        {fotosCompletas
                          ? <span className="text-[10px] font-medium text-[#D1A23A] bg-[#D1A23A]/10 px-2 py-0.5 rounded-full">✓</span>
                          : <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{fotosObrigatorias.filter(id => !fotosCat[id]).length}×</span>
                        }
                      </div>
                      <p className="text-xs text-[#9ca3af] mb-3 -mt-2">{tx.bfFotosNote}</p>

                      <div className="flex items-start gap-2 px-3 py-2.5 bg-[#fffbeb] rounded-xl border border-[#fde68a] mb-4">
                        <span className="text-amber-500 text-sm shrink-0 leading-tight">!</span>
                        <p className="text-xs text-[#92400e] leading-relaxed">
                          {tx.bfFotosAmberNote}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {FOTO_CATS.map(cat => (
                          <div key={cat.id} className="space-y-1">
                            <p className="text-[9px] font-medium text-[#6b7280] leading-tight">{cat.label}</p>
                            {fotosPreview[cat.id] ? (
                              <div className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={fotosPreview[cat.id]} alt={cat.label}
                                  className="w-full aspect-square rounded-lg object-cover border border-[#e5e7eb]" />
                                <button onClick={() => removeFoto(cat.id)}
                                  className="absolute top-1 right-1 w-5 h-5 bg-white/90 rounded-full text-[9px] text-[#9ca3af] flex items-center justify-center hover:text-red-400 transition-colors border border-[#e5e7eb]">✕</button>
                              </div>
                            ) : (
                              <label className={`flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed cursor-pointer transition-colors
                                ${cat.req ? 'border-amber-200 bg-amber-50/50 hover:border-amber-400' : 'border-[#e5e7eb] bg-[#fafafa] hover:border-[#D1A23A]/30'}`}>
                                <input type="file" accept="image/*" className="hidden"
                                  onChange={e => handleFotoChange(cat.id, e)} />
                                <span className="text-[8px] text-[#9ca3af] mt-0.5">{cat.req ? tx.bfFotoReq : tx.bfCroquiOptional}</span>
                              </label>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </Section>

                  {/* 1.5 Finishes — auto-filled by IA photo analysis */}
                  <Section visible={showAcabamentos}>
                    <hr className="section-divider" />
                    <div className="px-8 py-7">
                      <p className={SL} style={SS}>{tx.bfAcabamentos}{fotoAnalise && <AiBadge />}</p>
                      <div className="space-y-6">
                        <div><label className="form-label">{tx.bfPiso}</label><OptGrid options={[['cimento-queimado', tx.bfCimento],['ceramica', tx.bfCeramica],['madeira', tx.bfMadeira],['vinilico', tx.bfVinilico],['pedra', tx.bfPedra],['outro', tx.bfOutroAcab]] as [PisoTipo, string][]} value={form.pisoTipo} onChange={v => set('pisoTipo', v)} cols={3} /></div>
                        <div><label className="form-label">{tx.bfParede}</label><OptGrid options={[['reboco-pintado', tx.bfReboco],['tijolo-aparente', tx.bfTijolo],['azulejo', tx.bfAzulejo],['drywall', tx.bfDrywall],['outro', tx.bfOutroAcab]] as [ParedeTipo, string][]} value={form.paredeTipo} onChange={v => set('paredeTipo', v)} cols={3} /></div>
                        <div><label className="form-label">{tx.bfTeto}</label><OptGrid options={[['laje-aparente', tx.bfLaje],['forro-gesso', tx.bfForroGesso],['forro-madeira', tx.bfForroMadeira],['steel-deck', tx.bfSteelDeck],['outro', tx.bfOutroAcab]] as [TetoTipo, string][]} value={form.tetoTipo} onChange={v => set('tetoTipo', v)} cols={3} /></div>
                      </div>
                    </div>
                  </Section>

                </div>

                {/* CTA → stage 2 */}
                <div className="mt-4 space-y-2">
                  {!form.alturaPeDireito && (
                    <p className="text-[11px] text-center text-amber-600">
                      {lang === 'pt' ? '* Informe o pé-direito (estimado é suficiente) para continuar.' : '* Ceiling height is required — an estimate is fine.'}
                    </p>
                  )}
                  <button onClick={() => goToStage(2)}
                    disabled={!form.alturaPeDireito}
                    className="w-full py-4 rounded-2xl bg-[#1a1a1a] text-white font-semibold text-sm hover:bg-[#333333] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    {tx.bfContinuar}
                  </button>
                </div>
              </>

          </div>
        )}

        {/* ───────────────────────────────────────────────── STAGE 2 */}
        {stage === 2 && (
          <div className="space-y-0">
            <div className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden">

              {/* 2.1 Tipo de uso */}
              <div className="px-8 pt-7 pb-6">
                <p className={SL} style={SS}>{tx.bfTipoUso}</p>
                <OptGrid
                  options={[
                    ['cafeteria', tx.bfCafe],
                    ['restaurante', tx.bfRestaurante],
                    ['sorveteria', tx.bfSorveteria],
                    ['bar', tx.bfBar],
                  ] as [TipoUso, string][]}
                  value={needs.tipoUso} onChange={v => setN('tipoUso', v)} cols={2}
                />
              </div>

              <hr className="section-divider" />

              {/* 2.2 Public profile */}
              <div className="px-8 py-6">
                <p className={SL} style={SS}>{tx.bfPerfilPublico} <span className="text-[#9ca3af] font-normal normal-case tracking-normal">{tx.bfPerfilPublicoHint}</span></p>
                <MultiSelect
                  options={[
                    ['jovem-casual', tx.bfJovem],['corporativo', tx.bfCorporativo],
                    ['familia', tx.bfFamilia],['premium', tx.bfPremium],
                    ['turista', tx.bfTurista],['artistico', tx.bfArtistico],
                  ] as [PerfilPublico, string][]}
                  value={needs.perfilPublico}
                  onChange={v => setN('perfilPublico', v)}
                  cols={2}
                />
              </div>

              <hr className="section-divider" />

              {/* 2.3 Brand */}
              <div className="px-8 py-6">
                <p className={SL} style={SS}>{tx.bfMarca}</p>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">{tx.bfNomeMarca}</label>
                    <input type="text" placeholder={tx.bfNomeMarcaPlaceholder} value={needs.nomeMarca}
                      onChange={e => setN('nomeMarca', e.target.value)}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-[#f8f9fb] px-4 py-3 text-sm text-[#1a1a1a] placeholder-[#9ca3af] focus:outline-none focus:ring-1 focus:ring-[#D1A23A]" />
                  </div>
                  <div>
                    <label className="form-label">{tx.bfRedeSocial}</label>
                    <input type="text" placeholder={tx.bfRedeSocialPlaceholder} value={needs.redeSocial}
                      onChange={e => setN('redeSocial', e.target.value)}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-[#f8f9fb] px-4 py-3 text-sm text-[#1a1a1a] placeholder-[#9ca3af] focus:outline-none focus:ring-1 focus:ring-[#D1A23A]" />
                  </div>
                  <div>
                    <label className="form-label">{tx.bfPrimeiraUnidade}</label>
                    <OptGrid
                      options={[['sim', tx.bfPrimeiraUnidadeSim], ['nao', tx.bfPrimeiraUnidadeNao]] as ['sim' | 'nao', string][]}
                      value={needs.primeiraUnidade} onChange={v => setN('primeiraUnidade', v)} cols={2}
                    />
                  </div>
                </div>
              </div>

              <hr className="section-divider" />

              {/* 2.4 Functional */}
              <div className="px-8 py-6">
                <p className={SL} style={SS}>{tx.bfDemandaFuncional}</p>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">{tx.bfCapacidade}</label>
                    <input type="text" placeholder={tx.bfCapacidadePlaceholder} value={needs.capacidade}
                      onChange={e => setN('capacidade', e.target.value)}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-[#f8f9fb] px-4 py-3 text-sm text-[#1a1a1a] placeholder-[#9ca3af] focus:outline-none focus:ring-1 focus:ring-[#D1A23A]" />
                  </div>
                  <div>
                    <label className="form-label">{tx.bfConceito}</label>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {([
                        [tx.bfMinimalista, 'Minimalista'],
                        [tx.bfIndustrial, 'Industrial'],
                        [tx.bfAconchegante, 'Aconchegante'],
                        [tx.bfContemporaneo, 'Contemporâneo'],
                      ] as [string, string][]).map(([label, key]) => {
                        const on = needs.palavrasChave.includes(key)
                        return (
                          <button key={key} type="button"
                            onClick={() => setN('palavrasChave', on ? needs.palavrasChave.filter(k => k !== key) : [...needs.palavrasChave, key])}
                            className={`opt-btn${on ? ' selected' : ''}`}>
                            {label}
                          </button>
                        )
                      })}
                    </div>
                    {needs.palavrasChave.filter(k => !['Minimalista','Industrial','Aconchegante','Contemporâneo'].includes(k)).length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {needs.palavrasChave
                          .filter(k => !['Minimalista','Industrial','Aconchegante','Contemporâneo'].includes(k))
                          .map((k, i) => (
                            <span key={i} className="flex items-center gap-1 px-3 py-1 bg-[#eef2ff] text-[#D1A23A] text-xs font-medium rounded-full">
                              {k}
                              <button onClick={() => setN('palavrasChave', needs.palavrasChave.filter(x => x !== k))} className="ml-1 text-[#D1A23A]/60 hover:text-[#D1A23A] transition-colors">✕</button>
                            </span>
                          ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input type="text" value={kwInput} onChange={e => setKwInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addKw() }}
                        placeholder={tx.bfConceitoPlaceholder}
                        className="flex-1 rounded-xl border border-[#e5e7eb] bg-[#f8f9fb] px-3 py-2.5 text-sm text-[#1a1a1a] placeholder-[#9ca3af] focus:outline-none focus:ring-1 focus:ring-[#D1A23A]" />
                      {kwInput.trim() && (
                        <button onClick={addKw} className="px-3 py-2 bg-[#D1A23A] text-white rounded-xl text-sm font-medium hover:bg-[#a07d2e] transition-colors">+</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <hr className="section-divider" />

              {/* 2.5 References */}
              <div className="px-8 py-6">
                <p className={SL} style={SS}>{tx.bfReferencias} <span className="text-[#9ca3af] font-normal normal-case tracking-normal">({tx.bfReferenciasOptional})</span></p>
                <p className="text-xs text-[#9ca3af] mb-4 -mt-3">{tx.bfReferenciasHint}</p>
                {needs.referencias.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-3">
                    {needs.referencias.map((src, i) => (
                      <div key={i} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="w-16 h-16 rounded-lg object-cover border border-[#e5e7eb]" />
                        <button onClick={() => setN('referencias', needs.referencias.filter((_, j) => j !== i))}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-white border border-[#e5e7eb] rounded-full text-[8px] text-[#9ca3af] flex items-center justify-center hover:text-red-400 transition-colors">✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex items-center justify-center gap-2 border border-dashed border-[#e5e7eb] rounded-xl py-3 cursor-pointer hover:border-[#D1A23A]/30 transition-colors">
                  <input type="file" accept="image/*" onChange={handleRefChange} className="hidden" />
                  <span className="text-sm text-[#6b7280]">{tx.bfReferenciasAdd}</span>
                </label>
              </div>

              <hr className="section-divider" />

              {/* 2.6 Restrictions */}
              <div className="px-8 py-6">
                <p className={SL} style={SS}>{tx.bfRestricoes}</p>
                <div className="space-y-5">
                  <div>
                    <label className="form-label">{tx.bfOrcamento}</label>
                    <OptGrid
                      options={[['ate50k', tx.bfAte50k],['50k-150k', tx.bf50k150k],['150k-300k', tx.bf150k300k],['acima300k', tx.bfAcima300k]] as [OrcamentoProjeto, string][]}
                      value={needs.orcamento} onChange={v => setN('orcamento', v)} cols={2}
                    />
                  </div>
                  <div>
                    <label className="form-label">{tx.bfPrazo}</label>
                    <OptGrid
                      options={[['urgente', tx.bfUrgente],['1-3-meses', tx.bf1a3meses],['3-6-meses', tx.bf3a6meses],['sem-prazo', tx.bfSemPrazo]] as [PrazoProjeto, string][]}
                      value={needs.prazo} onChange={v => setN('prazo', v)} cols={2}
                    />
                  </div>
                  <div>
                    <label className="form-label">{tx.bfRestricoesLabel} <span className="text-[#9ca3af] font-normal normal-case tracking-normal">({tx.bfRestricoesOptional})</span></label>
                    <textarea placeholder={tx.bfRestricoesPlaceholder}
                      value={needs.restricoes} onChange={e => setN('restricoes', e.target.value)} rows={3}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-[#f8f9fb] px-4 py-3 text-sm text-[#1a1a1a] placeholder-[#9ca3af] focus:outline-none focus:ring-1 focus:ring-[#D1A23A] resize-none" />
                  </div>
                </div>
              </div>

            </div>

            {/* CTAs */}
            <div className="mt-4 space-y-3">

              {/* validation hint */}
              {!fotosCompletas && (
                <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-amber-500 shrink-0">⚠</span>
                  <p className="text-xs text-amber-700">
                    {tx.bfFotosObrigatorias}
                    <button onClick={() => goToStage(1)} className="ml-1 underline font-medium">{tx.bfAddNow}</button>
                  </p>
                </div>
              )}

              {/* Primary: project request */}
              <button onClick={solicitarProjeto}
                disabled={!fotosCompletas || !needs.tipoUso}
                className="w-full py-4 rounded-2xl bg-[#1a1a1a] text-white font-semibold text-sm hover:bg-[#333333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3">
                <span>{tx.bfSolicitar}</span>
                <span className="text-[#9ca3af]">→</span>
              </button>

            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────── STAGE 3 */}
        {stage === 3 && (
          <div>

            {/* ── loading: submitting project ── */}
            {solicitandoProjeto && (
              <div className="bg-white rounded-2xl border border-[#e5e7eb] px-8 py-16 flex flex-col items-center gap-6">
                <div className="flex gap-2">
                  {['#1a1a1a','#6b7280','#d1d5db'].map((c, i) => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: c, animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-[#1a1a1a]">{lang === 'pt' ? 'Enviando briefing para a OTELIE…' : 'Sending briefing to OTELIE…'}</p>
                  <p className="text-xs text-[#9ca3af]">{lang === 'pt' ? 'Fotos · levantamento · referências' : 'Photos · survey · references'}</p>
                </div>
              </div>
            )}

            {/* ── loading: generating AI concept ── */}
            {gerandoConcept && (
              <div className="bg-white rounded-2xl border border-[#e5e7eb] px-8 py-16 flex flex-col items-center gap-6">
                <div className="flex gap-2">
                  {['#D1A23A','#a5b4fc','#e0e7ff'].map((c, i) => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: c, animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-[#1a1a1a]">{lang === 'pt' ? 'OTELIE está criando seu Concept Redesign™' : 'OTELIE is building your Concept Redesign™'}</p>
                  <p className="text-xs text-[#9ca3af]">{lang === 'pt' ? 'Nova Atmosfera · Ritmo Visual · Presença Emocional · Sensory Concept' : 'New Atmosphere · Visual Rhythm · Emotional Presence · Sensory Concept'}</p>
                </div>
                <p className="text-2xl font-bold tabular-nums text-[#D1A23A]">{elapsed}s</p>
              </div>
            )}

            {/* ── success: project submitted ── */}
            {projetoId && !solicitandoProjeto && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-[#e5e7eb] px-8 py-12 text-center space-y-6">
                  <div className="w-14 h-14 rounded-full bg-[#D1A23A]/15 flex items-center justify-center mx-auto text-2xl" style={{ color: '#D1A23A' }}>
                    ✓
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-[#D1A23A]" style={{ fontFamily: 'var(--font-mono, Inter, sans-serif)' }}>{tx.bfSuccessTag}</p>
                    <h2 className="text-xl font-bold text-[#1a1a1a]">{tx.bfSuccessTitle}</h2>
                    <p className="text-sm text-[#6b7280] leading-relaxed max-w-xs mx-auto">
                      {tx.bfSuccessMsg}
                    </p>
                  </div>
                  <div className="bg-[#f8f9fb] rounded-xl px-4 py-3 text-left space-y-0.5 inline-block w-full">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#9ca3af]" style={{ fontFamily: 'var(--font-mono, Inter, sans-serif)' }}>{tx.bfSuccessRef}</p>
                    <p className="text-sm font-mono text-[#1a1a1a] break-all">{projetoId}</p>
                  </div>
                  {/* Status tracker */}
                  <div className="space-y-3 text-left">
                    {([
                      { label: tx.bfSuccessStep1, done: true,  active: false },
                      { label: tx.bfSuccessStep2, done: false, active: true  },
                      { label: tx.bfSuccessStep3, done: false, active: false },
                    ]).map((step, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors
                          ${step.done ? 'bg-[#1a1a1a] text-white' : step.active ? 'bg-[#D1A23A] text-white' : 'bg-[#f3f4f6] text-[#9ca3af]'}`}>
                          {step.done ? '✓' : i + 1}
                        </div>
                        <span className={`text-sm ${step.done ? 'text-[#6b7280]' : step.active ? 'text-[#1a1a1a] font-medium' : 'text-[#9ca3af]'}`}>
                          {step.label}
                        </span>
                        {step.active && (
                          <span className="ml-auto text-[9px] font-bold text-[#D1A23A] bg-[#eef2ff] px-2 py-0.5 rounded-full" style={{ fontFamily: 'var(--font-mono, Inter, sans-serif)' }}>{lang === 'pt' ? 'EM ANDAMENTO' : 'IN PROGRESS'}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* PDF download */}
                {BriefingDownloadButton && (
                  <BriefingDownloadButton
                    data={{
                      projetoId: projetoId!,
                      createdAt: new Date().toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US'),
                      lang,
                      area: form.area,
                      comprimento: form.comprimento,
                      largura: form.largura,
                      alturaPeDireito: form.alturaPeDireito,
                      pisoTipo: form.pisoTipo,
                      paredeTipo: form.paredeTipo,
                      tetoTipo: form.tetoTipo,
                      fotosEnviadas: Object.keys(fotosCat),
                      fotosBase64: Object.fromEntries(Object.entries(fotosPreview)),
                      tipoUso: needs.tipoUso,
                      nomeMarca: needs.nomeMarca,
                      redeSocial: needs.redeSocial,
                      primeiraUnidade: needs.primeiraUnidade,
                      perfilPublico: needs.perfilPublico,
                      capacidade: needs.capacidade,
                      palavrasChave: needs.palavrasChave,
                      orcamento: needs.orcamento,
                      prazo: needs.prazo,
                      restricoes: needs.restricoes,
                    }}
                    label={lang === 'pt' ? 'Baixar resumo em PDF' : 'Download briefing PDF'}
                    loadingLabel={lang === 'pt' ? 'Gerando PDF…' : 'Generating PDF…'}
                  />
                )}

                <div className="flex gap-3">
                  <button onClick={() => { setProjetoId(null); goToStage(2) }}
                    className="flex-1 py-3 border border-[#e5e7eb] rounded-xl text-sm text-[#6b7280] font-medium hover:bg-[#f8f9fb] transition-colors">
                    ← {lang === 'pt' ? 'Ajustar brief' : 'Edit brief'}
                  </button>
                  <button onClick={() => { setProjetoId(null); goToStage(1) }}
                    className="flex-1 py-3 border border-[#e5e7eb] rounded-xl text-sm text-[#6b7280] font-medium hover:bg-[#f8f9fb] transition-colors">
                    {lang === 'pt' ? 'Novo projeto' : 'New project'}
                  </button>
                </div>
              </div>
            )}

            {/* ── error: submission failed ── */}
            {solicitacaoErro && !solicitandoProjeto && !projetoId && (
              <div className="bg-white rounded-2xl border border-[#e5e7eb] px-8 py-10 text-center space-y-4">
                <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{solicitacaoErro}</p>
                <button onClick={solicitarProjeto} className="px-6 py-3 bg-[#1a1a1a] text-white rounded-xl text-sm font-medium hover:bg-[#333333] transition-colors">{lang === 'pt' ? 'Tentar novamente' : 'Try again'}</button>
              </div>
            )}

            {/* ── error: AI concept failed ── */}
            {conceptError && !gerandoConcept && !projetoId && (
              <div className="bg-white rounded-2xl border border-[#e5e7eb] px-8 py-10 text-center space-y-4">
                <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{conceptError}</p>
                <button onClick={gerarConcept} className="px-6 py-3 bg-[#D1A23A] text-white rounded-xl text-sm font-medium hover:bg-[#a07d2e] transition-colors">{lang === 'pt' ? 'Tentar novamente' : 'Try again'}</button>
              </div>
            )}

            {/* ── AI concept result ── */}
            {concept && !gerandoConcept && !projetoId && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <p className="text-[9px] font-bold tracking-[0.3em] text-[#9ca3af] uppercase mb-1" style={{ fontFamily: 'var(--font-mono, Inter, sans-serif)' }}>OTELIE · Preview com IA</p>
                  <h2 className="text-xl font-bold text-[#1a1a1a]">Concept Redesign™</h2>
                </div>

                <ConceptDisplay
                  concept={concept}
                  viewerProps={viewerProps}
                  capturedViews={capturedViews}
                  existente={form as unknown as Record<string, unknown>}
                  necessidades={needs as unknown as Record<string, unknown>}
                />

                {/* upsell to real project */}
                <div className="bg-[#f8f9fb] border border-[#e5e7eb] rounded-2xl px-6 py-5 space-y-3">
                  <p className="text-sm font-semibold text-[#1a1a1a]">{lang === 'pt' ? 'Gostou do concept preview?' : 'Liked the concept preview?'}</p>
                  <p className="text-xs text-[#6b7280]">{lang === 'pt' ? 'Solicite o concept inicial completo — diretrizes, paleta, layout e referências visuais — entregue pela equipe OTELIE em até 24h.' : 'Request the full initial concept — guidelines, palette, layout and visual references — delivered by the OTELIE team within 24h.'}</p>
                  <button onClick={solicitarProjeto}
                    disabled={!fotosCompletas || !needs.tipoUso}
                    className="w-full py-3 rounded-xl bg-[#1a1a1a] text-white font-semibold text-sm hover:bg-[#333333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    {tx.bfSolicitar} →
                  </button>
                  {!fotosCompletas && <p className="text-[10px] text-amber-600 text-center">{tx.bfFotosObrigatorias}</p>}
                </div>

                <div className="flex gap-3">
                  <button onClick={gerarConcept}
                    className="flex-1 py-3 border border-[#e5e7eb] rounded-xl text-sm text-[#6b7280] font-medium hover:bg-[#f8f9fb] transition-colors">
                    {lang === 'pt' ? 'Regenerar preview' : 'Regenerate preview'}
                  </button>
                  <button onClick={() => goToStage(2)}
                    className="flex-1 py-3 border border-[#D1A23A]/30 rounded-xl text-sm text-[#D1A23A] font-medium hover:bg-[#D1A23A]/[0.04] transition-colors">
                    ← {lang === 'pt' ? 'Ajustar brief' : 'Edit brief'}
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        <p className="mt-10 text-center text-xs text-[#9ca3af]" style={{ fontFamily: 'var(--font-mono, Inter, sans-serif)' }}>OTELIE · Concept Redesign™</p>
      </div>
    </main>
  )
}
