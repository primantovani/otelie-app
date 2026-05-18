'use client'

import { useState, useRef, useEffect, lazy, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import type { SpaceViewer3DHandle } from '@/components/SpaceViewer3D'
import type {
  BriefFormData, SpaceType, Budget, Location, EstadoAtual, LuzNatural, PeDireito, PublicoAlvo, Prioridade,
  CafeModelo, CafeDestaque, CafeAreaExterna,
  BistroCozinha, BistroServico, BistroDestaque,
  SorveteriaVariante, SorveteriaModelo, SorveteriaDestaque,
  PlantaForma, JanelasPos, Fachada, ElementoFixo, EntradaPos,
  PisoTipo, ParedeTipo, TetoTipo,
} from '@/lib/types'

const SpaceViewer3D = lazy(() => import('@/components/SpaceViewer3D'))

type FormState = {
  tipo: SpaceType | ''
  // Café
  cafeModelo: CafeModelo | ''
  cafeDestaque: CafeDestaque | ''
  cafeAreaExterna: CafeAreaExterna | ''
  // Bistro
  bistroCozinha: BistroCozinha | ''
  bistroServico: BistroServico | ''
  bistroDestaque: BistroDestaque | ''
  // Sorveteria
  sorveteriaVariante: SorveteriaVariante | ''
  sorveteriaModelo: SorveteriaModelo | ''
  sorveteriaDestaque: SorveteriaDestaque | ''
  // Comum
  area: number
  orcamento: Budget | ''
  vibe: string
  localizacao: Location | ''
  estadoAtual: EstadoAtual | ''
  luzNatural: LuzNatural | ''
  peDireito: PeDireito | ''
  publicoAlvo: PublicoAlvo | ''
  prioridade: Prioridade | ''
  capacidade: number
  comprimento: number | undefined
  largura: number | undefined
  alturaPeDireito: number | undefined
  observacoes: string
  olharOtelie: string
  // Ambiente
  entradaPos: EntradaPos | ''
  plantaForma: PlantaForma | ''
  janelasPos: JanelasPos | ''
  fachada: Fachada | ''
  elementosFixos: ElementoFixo[]
  // Acabamentos
  pisoTipo: PisoTipo | ''
  pisoFica: boolean | undefined
  paredeTipo: ParedeTipo | ''
  paredeFica: boolean | undefined
  tetoTipo: TetoTipo | ''
  tetoFica: boolean | undefined
}

function SectionProgress({ items }: { items: { label: string; done: boolean }[] }) {
  const allDone = items.every(i => i.done)
  if (allDone) return null
  return (
    <div className="flex flex-wrap gap-2 pt-5 mt-6 border-t border-[#f3f4f6]">
      {items.map(({ label, done }) => (
        <span key={label} className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border transition-all duration-300 ${done ? 'border-[#6366f1]/25 text-[#6366f1] bg-[#6366f1]/5' : 'border-[#e5e7eb] text-[#b0b7c3]'}`}>
          {done ? (
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M1.5 4.5l2 2L7.5 2" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <span className="w-2 h-2 rounded-full border border-[#d1d5db] inline-block" />
          )}
          {label}
        </span>
      ))}
    </div>
  )
}

function OptGrid<T extends string>({
  options, value, onChange, cols = 2,
}: {
  options: [T, string][]
  value: T | ''
  onChange: (v: T) => void
  cols?: number
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {options.map(([val, label]) => (
        <button key={val} type="button" onClick={() => onChange(val)}
          className={`opt-btn${value === val ? ' selected' : ''}`}>
          {label}
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

const SECTION_LABEL = 'text-[10px] font-bold uppercase tracking-[0.15em] text-[#6366f1] mb-5'
const SECTION_STYLE = { fontFamily: 'var(--font-mono, monospace)' }

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const viewerRef = useRef<SpaceViewer3DHandle>(null)

  const [showPerfil, setShowPerfil] = useState(false)
  const [showDimensoes, setShowDimensoes] = useState(false)
  const [showAmbiente, setShowAmbiente] = useState(false)
  const [showAcabamentos, setShowAcabamentos] = useState(false)
  const [showReforma, setShowReforma] = useState(false)
  const [showIdentidade, setShowIdentidade] = useState(false)

  const [form, setForm] = useState<FormState>({
    tipo: '',
    cafeModelo: '', cafeDestaque: '', cafeAreaExterna: '',
    bistroCozinha: '', bistroServico: '', bistroDestaque: '',
    sorveteriaVariante: '', sorveteriaModelo: '', sorveteriaDestaque: '',
    area: 40, orcamento: '', vibe: '', localizacao: '', estadoAtual: '',
    luzNatural: '', peDireito: '', publicoAlvo: '', prioridade: '',
    capacidade: 20, comprimento: undefined, largura: undefined, alturaPeDireito: undefined,
    observacoes: '', olharOtelie: '',
    entradaPos: '', plantaForma: '', janelasPos: '', fachada: '', elementosFixos: [],
    pisoTipo: '', pisoFica: undefined, paredeTipo: '', paredeFica: undefined, tetoTipo: '', tetoFica: undefined,
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

  // Perfil: mostra quando tipo + estadoAtual + localizacao preenchidos
  useEffect(() => {
    if (form.tipo && form.estadoAtual && form.localizacao) setShowPerfil(true)
  }, [form.tipo, form.estadoAtual, form.localizacao])

  // Dimensões: mostra quando a pergunta-chave do perfil é respondida
  useEffect(() => {
    const perfilKey =
      (form.tipo === 'cafe' && !!form.cafeModelo) ||
      (form.tipo === 'bistro' && !!form.bistroCozinha) ||
      (form.tipo === 'sorveteria' && !!form.sorveteriaVariante)
    if (perfilKey) setShowDimensoes(true)
  }, [form.tipo, form.cafeModelo, form.bistroCozinha, form.sorveteriaVariante])

  // Auto-deriva categoria de pé-direito a partir da altura numérica
  useEffect(() => {
    if (form.alturaPeDireito) {
      const h = form.alturaPeDireito
      set('peDireito', h < 8 ? 'baixo' : h <= 11 ? 'medio' : 'alto')
    }
  }, [form.alturaPeDireito])

  useEffect(() => {
    if (form.peDireito && form.luzNatural) setShowAmbiente(true)
  }, [form.peDireito, form.luzNatural])

  useEffect(() => {
    if (form.plantaForma) setShowAcabamentos(true)
  }, [form.plantaForma])

  // Reforma + modelo 3D: aparece assim que temos acabamentos básicos
  useEffect(() => {
    if (form.pisoTipo || form.paredeTipo || form.tetoTipo) setShowReforma(true)
  }, [form.pisoTipo, form.paredeTipo, form.tetoTipo])

  useEffect(() => {
    if (form.orcamento && form.prioridade) setShowIdentidade(true)
  }, [form.orcamento, form.prioridade])

  useEffect(() => {
    if (form.comprimento && form.largura) {
      const calc = Math.round(form.comprimento * form.largura / 5) * 5
      set('area', Math.min(300, Math.max(15, calc)))
    }
  }, [form.comprimento, form.largura])


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const screenshots = viewerRef.current?.capture()
      const res = await fetch('/api/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(form as unknown as BriefFormData),
          sceneImages: screenshots ? [screenshots.perspective, screenshots.topDown] : undefined,
        }),
      })
      const result = await res.json()
      if (!res.ok) { setError(result.error ?? 'Erro ao gerar conceito.'); setLoading(false); return }
      sessionStorage.removeItem('otelie_photo')
      const encoded = encodeURIComponent(JSON.stringify({ result, form }))
      router.push(`/resultado?data=${encoded}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido.')
      setLoading(false)
    }
  }

  const isFormValid = !!(form.tipo && form.estadoAtual && form.vibe.trim() && showIdentidade)
  const inputCls = 'w-full rounded-xl border border-[#e5e7eb] bg-[#f8f9fb] px-4 py-3.5 text-[0.9375rem] text-[#1f2937] placeholder-[#9ca3af] focus:outline-none focus:ring-1 focus:ring-[#6366f1]'

  const perfilTitle = { cafe: 'Café Profile', bistro: 'Bistro Profile', sorveteria: 'Ice Cream Shop Profile', '': 'Profile' }[form.tipo]

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">

        <div className="mb-10 text-center">
          <p className="text-[10px] font-bold tracking-[0.25em] text-[#9ca3af] uppercase mb-5">Otelie Studio</p>
          <h1 className="text-[2rem] font-bold text-[#1f2937] leading-tight">
            Design concept<br />for your space
          </h1>
          <p className="mt-4 text-[#9ca3af] text-base">Answer a few questions and get a complete design concept in seconds.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden space-y-0">

          {/* Bloco 1 — The space */}
          <div className="px-8 pt-8 pb-7">
            <p className={SECTION_LABEL} style={SECTION_STYLE}>Your space</p>
            <div className="space-y-6">

              <div>
                <label className="form-label">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ['cafe', 'Café'],
                    ['bistro', 'Bistro'],
                    ['sorveteria', 'Ice Cream Shop'],
                  ] as [SpaceType, string][]).map(([val, label]) => (
                    <button key={val} type="button" onClick={() => set('tipo', val)}
                      className={`opt-btn${form.tipo === val ? ' selected' : ''}`}>{label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">Current state</label>
                <div className="flex flex-col gap-2">
                  {([
                    ['obra-bruta', 'Shell / raw space'],
                    ['ja-funciona', 'Currently operating'],
                    ['precisa-refresh', 'Needs a refresh'],
                  ] as [EstadoAtual, string][]).map(([val, label]) => (
                    <button key={val} type="button" onClick={() => set('estadoAtual', val)}
                      className={`opt-btn${form.estadoAtual === val ? ' selected' : ''}`}>{label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">Location</label>
                <OptGrid
                  options={[
                    ['terreo-urbano', 'Urban storefront'],
                    ['shopping', 'Mall / shopping center'],
                    ['rua-bairro', 'Neighborhood street'],
                    ['outro', 'Other'],
                  ] as [Location, string][]}
                  value={form.localizacao}
                  onChange={v => set('localizacao', v)}
                />
              </div>

              <SectionProgress items={[
                { label: 'Type', done: !!form.tipo },
                { label: 'Current state', done: !!form.estadoAtual },
                { label: 'Location', done: !!form.localizacao },
              ]} />
            </div>
          </div>

          {/* Bloco 2 — Perfil do espaço (personalizado por tipo) */}
          <Section visible={showPerfil}>
            <hr className="section-divider" />
            <div className="px-8 py-7">
              <p className={SECTION_LABEL} style={SECTION_STYLE}>{perfilTitle}</p>
              <div className="space-y-6">

                {/* CAFÉ */}
                {form.tipo === 'cafe' && (<>
                  <div>
                    <label className="form-label">Service model</label>
                    <div className="flex flex-col gap-2">
                      {([
                        ['balcao', 'Counter / takeaway — walk-up coffee service'],
                        ['mesas', 'Seating — space to sit and stay'],
                        ['hibrido', 'Hybrid — counter up front, seating in the back'],
                      ] as [CafeModelo, string][]).map(([val, label]) => (
                        <button key={val} type="button" onClick={() => set('cafeModelo', val)}
                          className={`opt-btn${form.cafeModelo === val ? ' selected' : ''}`}>{label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Main feature</label>
                    <div className="flex flex-col gap-2">
                      {([
                        ['maquina', 'Espresso bar — barista and machine as centerpiece'],
                        ['vitrine', 'Pastry display — cakes, bread and pastries on show'],
                        ['ambos', 'Both — specialty coffee meets bakery'],
                      ] as [CafeDestaque, string][]).map(([val, label]) => (
                        <button key={val} type="button" onClick={() => set('cafeDestaque', val)}
                          className={`opt-btn${form.cafeDestaque === val ? ' selected' : ''}`}>{label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Outdoor area</label>
                    <OptGrid
                      options={[['sim', 'Yes, patio or sidewalk seating'], ['nao', 'No outdoor area']] as [CafeAreaExterna, string][]}
                      value={form.cafeAreaExterna} onChange={v => set('cafeAreaExterna', v)} cols={2}
                    />
                  </div>
                </>)}

                {/* BISTRO */}
                {form.tipo === 'bistro' && (<>
                  <div>
                    <label className="form-label">Culinary inspiration</label>
                    <OptGrid
                      options={[
                        ['francesa', 'French / European'],
                        ['italiana', 'Italian'],
                        ['mediterranea', 'Mediterranean'],
                        ['contemporanea', 'Contemporary California'],
                      ] as [BistroCozinha, string][]}
                      value={form.bistroCozinha} onChange={v => set('bistroCozinha', v)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Main service period</label>
                    <OptGrid
                      options={[
                        ['almoco', 'Lunch'],
                        ['jantar', 'Dinner'],
                        ['fullday', 'All day'],
                        ['brunch', 'Brunch'],
                      ] as [BistroServico, string][]}
                      value={form.bistroServico} onChange={v => set('bistroServico', v)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Special feature</label>
                    <div className="flex flex-col gap-2">
                      {([
                        ['vinhos', 'Wine bar — cellar and wine list front and center'],
                        ['cozinha-aberta', 'Open kitchen — visible to guests'],
                        ['sem-destaque', 'No specific feature'],
                      ] as [BistroDestaque, string][]).map(([val, label]) => (
                        <button key={val} type="button" onClick={() => set('bistroDestaque', val)}
                          className={`opt-btn${form.bistroDestaque === val ? ' selected' : ''}`}>{label}</button>
                      ))}
                    </div>
                  </div>
                </>)}

                {/* ICE CREAM SHOP */}
                {form.tipo === 'sorveteria' && (<>
                  <div>
                    <label className="form-label">Product type</label>
                    <OptGrid
                      options={[
                        ['gelato', 'Artisan gelato'],
                        ['soft', 'Soft serve'],
                        ['acai', 'Açaí bowls'],
                        ['mix', 'Mixed'],
                      ] as [SorveteriaVariante, string][]}
                      value={form.sorveteriaVariante} onChange={v => set('sorveteriaVariante', v)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Consumption model</label>
                    <OptGrid
                      options={[
                        ['takeaway', 'Takeaway'],
                        ['mesas', 'Dine-in seating'],
                        ['kids', 'Kids friendly'],
                        ['misto', 'Mixed'],
                      ] as [SorveteriaModelo, string][]}
                      value={form.sorveteriaModelo} onChange={v => set('sorveteriaModelo', v)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Visual highlight</label>
                    <OptGrid
                      options={[
                        ['vitrine', 'Display case'],
                        ['producao', 'Visible production'],
                        ['topping', 'Topping bar'],
                        ['sem-destaque', 'No specific highlight'],
                      ] as [SorveteriaDestaque, string][]}
                      value={form.sorveteriaDestaque} onChange={v => set('sorveteriaDestaque', v)}
                    />
                  </div>
                </>)}

                <SectionProgress items={[
                  ...(form.tipo === 'cafe' ? [
                    { label: 'Service model', done: !!form.cafeModelo },
                    { label: 'Main feature', done: !!form.cafeDestaque },
                  ] : []),
                  ...(form.tipo === 'bistro' ? [
                    { label: 'Cuisine', done: !!form.bistroCozinha },
                    { label: 'Service period', done: !!form.bistroServico },
                  ] : []),
                  ...(form.tipo === 'sorveteria' ? [
                    { label: 'Product type', done: !!form.sorveteriaVariante },
                    { label: 'Model', done: !!form.sorveteriaModelo },
                  ] : []),
                ]} />
              </div>
            </div>
          </Section>

          {/* Bloco 3 — Dimensions */}
          <Section visible={showDimensoes}>
            <hr className="section-divider" />
            <div className="px-8 py-7">
              <p className={SECTION_LABEL} style={SECTION_STYLE}>Dimensions</p>
              <div className="space-y-6">

                <div>
                  <label className="form-label">
                    Floor dimensions <span className="text-[#9ca3af] font-normal normal-case tracking-normal">— optional</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'comprimento' as const, label: 'Length' },
                      { key: 'largura' as const, label: 'Width' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <p className="text-xs text-[#9ca3af] mb-1.5">{label}</p>
                        <div className="flex items-center gap-1.5">
                          <input type="number" min={1} max={200} step={0.5} placeholder="—"
                            value={form[key] ?? ''}
                            onChange={e => set(key, e.target.value ? Number(e.target.value) : undefined)}
                            className="w-full rounded-xl border border-[#e5e7eb] bg-[#f8f9fb] px-3 py-3 text-[0.9375rem] text-[#1f2937] placeholder-[#9ca3af] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                          />
                          <span className="text-sm text-[#9ca3af] shrink-0">ft</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between mb-0">
                    <label className="form-label" style={{ marginBottom: 0 }}>Approximate area</label>
                    {form.comprimento && form.largura && (
                      <span className="text-[10px] text-[#6366f1] font-medium">auto-calculated</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2.5">
                    <input type="range" min={150} max={3000} step={50} value={form.area}
                      onChange={e => set('area', Number(e.target.value))}
                      className="flex-1 accent-[#6366f1]" />
                    <span className="text-base font-semibold text-[#1f2937] w-20 text-right tabular-nums">{form.area} sq ft</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Ceiling height</label>
                    <div className="flex items-center gap-2 mb-2">
                      <input type="number" min={5} max={32} step={0.5} placeholder="e.g. 10"
                        value={form.alturaPeDireito ?? ''}
                        onChange={e => set('alturaPeDireito', e.target.value ? Number(e.target.value) : undefined)}
                        className="w-24 rounded-xl border border-[#e5e7eb] bg-[#f8f9fb] px-3 py-2.5 text-[0.9375rem] text-[#1f2937] placeholder-[#9ca3af] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                      />
                      <span className="text-sm text-[#9ca3af]">ft</span>
                      {form.alturaPeDireito && (
                        <span className="text-[11px] text-[#6366f1] font-medium">
                          {form.alturaPeDireito < 8 ? '↳ low' : form.alturaPeDireito <= 11 ? '↳ medium' : '↳ high'}
                        </span>
                      )}
                    </div>
                    {!form.alturaPeDireito && (
                      <div className="flex flex-col gap-2">
                        {([
                          ['baixo', 'Under 8 ft'],
                          ['medio', '8 to 11 ft'],
                          ['alto', 'Above 11 ft'],
                        ] as [PeDireito, string][]).map(([val, label]) => (
                          <button key={val} type="button" onClick={() => set('peDireito', val)}
                            className={`opt-btn${form.peDireito === val ? ' selected' : ''}`}>{label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Natural light</label>
                    <div className="flex flex-col gap-2">
                      {([
                        ['muita', 'Lots'],
                        ['moderada', 'Moderate'],
                        ['pouca', 'Little or none'],
                      ] as [LuzNatural, string][]).map(([val, label]) => (
                        <button key={val} type="button" onClick={() => set('luzNatural', val)}
                          className={`opt-btn${form.luzNatural === val ? ' selected' : ''}`}>{label}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="form-label">Desired capacity</label>
                  <div className="flex items-center gap-4">
                    <input type="range" min={5} max={150} step={5} value={form.capacidade}
                      onChange={e => set('capacidade', Number(e.target.value))}
                      className="flex-1 accent-[#6366f1]" />
                    <span className="text-base font-semibold text-[#1f2937] w-24 text-right tabular-nums">{form.capacidade} seats</span>
                  </div>
                </div>

                <SectionProgress items={[
                  { label: 'Ceiling height', done: !!form.peDireito },
                  { label: 'Natural light', done: !!form.luzNatural },
                ]} />
              </div>
            </div>
          </Section>

          {/* Bloco 4 — Ambiente */}
          <Section visible={showAmbiente}>
            <hr className="section-divider" />
            <div className="px-8 py-7">
              <p className={SECTION_LABEL} style={SECTION_STYLE}>Space reading</p>
              <div className="space-y-6">

                <div>
                  <label className="form-label">Floor plan shape</label>
                  <div className="flex flex-col gap-2">
                    {([
                      ['corredor', 'Corridor — narrow and long'],
                      ['retangular', 'Rectangle — proportional'],
                      ['quadrado', 'Square — balanced on all sides'],
                      ['formato-l', 'L-shaped — two connected areas'],
                      ['irregular', 'Irregular — angled walls'],
                    ] as [PlantaForma, string][]).map(([val, label]) => (
                      <button key={val} type="button" onClick={() => set('plantaForma', val)}
                        className={`opt-btn${form.plantaForma === val ? ' selected' : ''}`}>{label}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="form-label">Window position</label>
                  <div className="flex flex-col gap-2">
                    {([
                      ['so-frente', 'Front only — directional light, darker at the back'],
                      ['frente-lateral', 'Front and side — light on two axes'],
                      ['so-lateral', 'Side only — indirect, controlled light'],
                      ['sem-janelas', 'No windows — 100% artificial lighting'],
                    ] as [JanelasPos, string][]).map(([val, label]) => (
                      <button key={val} type="button" onClick={() => set('janelasPos', val)}
                        className={`opt-btn${form.janelasPos === val ? ' selected' : ''}`}>{label}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="form-label">Storefront</label>
                  <OptGrid
                    options={[
                      ['aberta', 'Open / glass front'],
                      ['semi-aberta', 'Semi-open'],
                      ['fechada', 'Closed / discreet'],
                      ['interior', 'Interior (mall / gallery)'],
                    ] as [Fachada, string][]}
                    value={form.fachada} onChange={v => set('fachada', v)}
                  />
                </div>

                <div>
                  <label className="form-label">Main entrance</label>
                  <OptGrid
                    options={[
                      ['frente', 'Front of the space'],
                      ['lateral-esq', 'Left side'],
                      ['lateral-dir', 'Right side'],
                      ['fundo', 'Back'],
                    ] as [EntradaPos, string][]}
                    value={form.entradaPos} onChange={v => set('entradaPos', v)}
                  />
                </div>

                <div>
                  <label className="form-label">
                    Fixed elements <span className="text-[#9ca3af] font-normal normal-case tracking-normal">— select all that apply</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ['pilares', 'Columns / pillars'],
                      ['desnivel', 'Floor level change'],
                      ['mezanino', 'Mezzanine'],
                      ['escadas', 'Internal stairs'],
                    ] as [ElementoFixo, string][]).map(([val, label]) => (
                      <button key={val} type="button" onClick={() => toggleElemento(val)}
                        className={`opt-btn${form.elementosFixos.includes(val) ? ' selected' : ''}`}>{label}</button>
                    ))}
                  </div>
                </div>

                <SectionProgress items={[
                  { label: 'Shape', done: !!form.plantaForma },
                  { label: 'Windows', done: !!form.janelasPos },
                  { label: 'Storefront', done: !!form.fachada },
                ]} />
              </div>
            </div>
          </Section>

          {/* Bloco 5 — Acabamentos + Levantamento */}
          <Section visible={showAcabamentos}>
            <hr className="section-divider" />
            <div className="px-8 py-7">
              <p className={SECTION_LABEL} style={SECTION_STYLE}>Current finishes</p>
              <div className="space-y-6">

                {/* Floor */}
                <div>
                  <label className="form-label">Current floor</label>
                  <OptGrid
                    options={[
                      ['cimento-queimado', 'Polished concrete'],
                      ['ceramica', 'Ceramic / porcelain tile'],
                      ['madeira', 'Hardwood'],
                      ['vinilico', 'Vinyl (LVT)'],
                      ['pedra', 'Natural stone'],
                      ['outro', 'Other'],
                    ] as [PisoTipo, string][]}
                    value={form.pisoTipo} onChange={v => set('pisoTipo', v)} cols={3}
                  />
                  {form.pisoTipo && (
                    <div className="flex gap-2 mt-2">
                      {(['fica', 'troca'] as const).map(opt => (
                        <button key={opt} type="button"
                          onClick={() => set('pisoFica', opt === 'fica')}
                          className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all ${
                            (opt === 'fica' ? form.pisoFica === true : form.pisoFica === false)
                              ? 'border-[#6366f1] bg-[#6366f1]/5 text-[#6366f1]'
                              : 'border-[#e5e7eb] text-[#9ca3af] hover:border-[#d1d5db]'
                          }`}>
                          {opt === 'fica' ? 'Keeping' : 'Replacing'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Walls */}
                <div>
                  <label className="form-label">Current walls</label>
                  <OptGrid
                    options={[
                      ['reboco-pintado', 'Painted plaster'],
                      ['tijolo-aparente', 'Exposed brick'],
                      ['azulejo', 'Ceramic tile'],
                      ['drywall', 'Drywall'],
                      ['outro', 'Other'],
                    ] as [ParedeTipo, string][]}
                    value={form.paredeTipo} onChange={v => set('paredeTipo', v)} cols={3}
                  />
                  {form.paredeTipo && (
                    <div className="flex gap-2 mt-2">
                      {(['fica', 'troca'] as const).map(opt => (
                        <button key={opt} type="button"
                          onClick={() => set('paredeFica', opt === 'fica')}
                          className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all ${
                            (opt === 'fica' ? form.paredeFica === true : form.paredeFica === false)
                              ? 'border-[#6366f1] bg-[#6366f1]/5 text-[#6366f1]'
                              : 'border-[#e5e7eb] text-[#9ca3af] hover:border-[#d1d5db]'
                          }`}>
                          {opt === 'fica' ? 'Vai ficar' : 'Vai trocar'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ceiling */}
                <div>
                  <label className="form-label">Current ceiling</label>
                  <OptGrid
                    options={[
                      ['laje-aparente', 'Exposed concrete'],
                      ['forro-gesso', 'Drywall / plaster'],
                      ['forro-madeira', 'Wood panel'],
                      ['steel-deck', 'Steel deck'],
                      ['outro', 'Other'],
                    ] as [TetoTipo, string][]}
                    value={form.tetoTipo} onChange={v => set('tetoTipo', v)} cols={3}
                  />
                  {form.tetoTipo && (
                    <div className="flex gap-2 mt-2">
                      {(['fica', 'troca'] as const).map(opt => (
                        <button key={opt} type="button"
                          onClick={() => set('tetoFica', opt === 'fica')}
                          className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all ${
                            (opt === 'fica' ? form.tetoFica === true : form.tetoFica === false)
                              ? 'border-[#6366f1] bg-[#6366f1]/5 text-[#6366f1]'
                              : 'border-[#e5e7eb] text-[#9ca3af] hover:border-[#d1d5db]'
                          }`}>
                          {opt === 'fica' ? 'Vai ficar' : 'Vai trocar'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Levantamento CTA + resultado */}
            <div className="px-8 pb-8 space-y-4">
              <div className="rounded-2xl border border-[#e5e7eb] bg-[#0d0d1a] overflow-hidden">
                <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                  <p className="text-[10px] font-bold tracking-[0.15em] text-[#6366f1] uppercase" style={SECTION_STYLE}>3D Space Model</p>
                  <p className="text-[10px] text-white/30">auto-built from your answers</p>
                </div>
                <Suspense fallback={<div className="h-[280px] flex items-center justify-center text-xs text-white/30">Loading 3D viewer…</div>}>
                  <SpaceViewer3D
                    ref={viewerRef}
                    comprimento={form.comprimento}
                    largura={form.largura}
                    area={form.area}
                    alturaPeDireito={form.alturaPeDireito}
                    peDireito={form.peDireito || 'medio'}
                    plantaForma={form.plantaForma || 'retangular'}
                    janelasPos={form.janelasPos || 'so-frente'}
                    entradaPos={form.entradaPos || 'frente'}
                    fachada={form.fachada || 'aberta'}
                    elementosFixos={form.elementosFixos}
                    pisoTipo={form.pisoTipo || 'cimento-queimado'}
                    paredeTipo={form.paredeTipo || 'reboco-pintado'}
                    tetoTipo={form.tetoTipo || 'laje-aparente'}
                  />
                </Suspense>
                <p className="px-4 py-2 text-[10px] text-white/25">
                  This model is captured automatically when you generate your concept.
                </p>
              </div>
            </div>
          </Section>

          {/* Bloco 6 — Renovation */}
          <Section visible={showReforma}>
            <hr className="section-divider" />
            <div className="px-8 py-7">
              <p className={SECTION_LABEL} style={SECTION_STYLE}>Renovation</p>
              <div className="space-y-6">
                <div>
                  <label className="form-label">Budget</label>
                  <OptGrid
                    options={[
                      ['ate50k', 'Under $50k'],
                      ['50k-150k', '$50k – $150k'],
                      ['150k-300k', '$150k – $300k'],
                      ['acima300k', 'Above $300k'],
                    ] as [Budget, string][]}
                    value={form.orcamento} onChange={v => set('orcamento', v)}
                  />
                </div>
                <div>
                  <label className="form-label">Priority</label>
                  <div className="flex flex-col gap-2">
                    {([
                      ['completa', 'Full renovation'],
                      ['moveis-decor', 'Furniture & decor'],
                      ['iluminacao', 'Lighting focus'],
                    ] as [Prioridade, string][]).map(([val, label]) => (
                      <button key={val} type="button" onClick={() => set('prioridade', val)}
                        className={`opt-btn${form.prioridade === val ? ' selected' : ''}`}>{label}</button>
                    ))}
                  </div>
                </div>
                <SectionProgress items={[
                  { label: 'Budget', done: !!form.orcamento },
                  { label: 'Priority', done: !!form.prioridade },
                ]} />
              </div>
            </div>
          </Section>

          {/* Bloco 5 — Identidade */}
          <Section visible={showIdentidade}>
            <hr className="section-divider" />
            <div className="px-8 py-7">
              <p className={SECTION_LABEL} style={SECTION_STYLE}>Identity</p>
              <div className="space-y-6">

                <div>
                  <label className="form-label">Desired style</label>
                  <input type="text" required
                    placeholder={
                      form.tipo === 'cafe' ? 'e.g. cozy Scandinavian, vintage industrial, Japanese minimalist…' :
                      form.tipo === 'bistro' ? 'e.g. romantic Parisian, rustic contemporary, elegant and intimate…' :
                      'e.g. bright and colorful, retro 50s diner, cool minimalist…'
                    }
                    value={form.vibe} onChange={e => set('vibe', e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="form-label">Target audience</label>
                  <OptGrid
                    options={[
                      ['jovem-casual', 'Young / casual'],
                      ['corporativo', 'Corporate'],
                      ['familia', 'Family'],
                      ['turista', 'Tourist'],
                    ] as [PublicoAlvo, string][]}
                    value={form.publicoAlvo} onChange={v => set('publicoAlvo', v)}
                  />
                </div>

                <div>
                  <label className="form-label">
                    Notes <span className="text-[#9ca3af] font-normal normal-case tracking-normal">— optional</span>
                  </label>
                  <textarea rows={3} placeholder="Anything important about the space, brand or audience…"
                    value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
                    className={`${inputCls} resize-none`} />
                </div>

                <div className="rounded-2xl border border-[#6366f1]/20 bg-[#6366f1]/[0.03] p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold tracking-[0.18em] text-[#6366f1] uppercase" style={SECTION_STYLE}>Otelie Eye</span>
                    <span className="text-[9px] text-[#6366f1]/50 font-medium">™</span>
                  </div>
                  <p className="text-xs text-[#9ca3af] mb-3 leading-relaxed">What the AI should preserve, avoid or prioritize in the generated image.</p>
                  <textarea rows={3}
                    placeholder={
                      form.tipo === 'cafe' ? 'e.g. keep the exposed brick, avoid too many plants, counter should be dark wood…' :
                      form.tipo === 'bistro' ? 'e.g. I want mirrors on the walls, avoid a very dark room, tables should have white tablecloths…' :
                      'e.g. vibrant wall colors, well-lit display case, avoid excessive kids decor…'
                    }
                    value={form.olharOtelie} onChange={e => set('olharOtelie', e.target.value)}
                    className="w-full rounded-xl border border-[#6366f1]/20 bg-white px-4 py-3.5 text-[0.9375rem] text-[#1f2937] placeholder-[#9ca3af] focus:outline-none focus:ring-1 focus:ring-[#6366f1] resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="px-8 pb-8">
              {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 mb-4">{error}</p>}
              <button type="submit" disabled={loading || !isFormValid}
                className="w-full py-4 rounded-xl bg-[#6366f1] text-white font-semibold text-base hover:bg-[#4f46e5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {loading ? 'Generating concept…' : 'Generate design concept'}
              </button>
            </div>
          </Section>

        </form>

        <p className="mt-6 text-center text-sm text-[#9ca3af]">Otelie Studio · Powered by OpenAI</p>

      </div>
    </main>
  )
}
