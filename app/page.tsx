'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { BriefFormData, SpaceType, Budget, Location, EstadoAtual, LuzNatural, PeDireito, PublicoAlvo, Prioridade } from '@/lib/types'

function OptGrid<T extends string>({
  options,
  value,
  onChange,
  cols = 2,
}: {
  options: [T, string][]
  value: T
  onChange: (v: T) => void
  cols?: number
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {options.map(([val, label]) => (
        <button
          key={val}
          type="button"
          onClick={() => onChange(val)}
          className={`opt-btn${value === val ? ' selected' : ''}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest text-[#9ca3af] mb-4 mt-1">
      {children}
    </p>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<BriefFormData>({
    tipo: 'cafe',
    area: 40,
    orcamento: '50k-150k',
    vibe: '',
    localizacao: 'terreo-urbano',
    estadoAtual: 'precisa-refresh',
    luzNatural: 'moderada',
    peDireito: 'medio',
    publicoAlvo: 'jovem-casual',
    prioridade: 'completa',
    capacidade: 20,
    comprimento: undefined,
    largura: undefined,
    alturaPeDireito: undefined,
    observacoes: '',
  })

  function set<K extends keyof BriefFormData>(key: K, val: BriefFormData[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string
      setPhotoBase64(base64)
      setPhotoPreview(base64)
    }
    reader.readAsDataURL(file)
  }

  function removePhoto() {
    setPhotoBase64(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, photoBase64 }),
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error ?? 'Erro ao gerar conceito.')
        setLoading(false)
        return
      }
      if (photoBase64) sessionStorage.setItem('otelie_photo', photoBase64)
      else sessionStorage.removeItem('otelie_photo')
      const encoded = encodeURIComponent(JSON.stringify({ result, form }))
      router.push(`/resultado?data=${encoded}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido.')
      setLoading(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-[#e5e7eb] bg-[#f8f9fb] px-4 py-3.5 text-[0.9375rem] text-[#1f2937] placeholder-[#c4bdb3] focus:outline-none focus:ring-1 focus:ring-[#6366f1]'

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">

        <div className="mb-10 text-center">
          <p className="text-[10px] font-bold tracking-[0.25em] text-[#9ca3af] uppercase mb-5">Otelie Studio</p>
          <h1 className="text-[2rem] font-bold text-[#1f2937] leading-tight">
            Conceito de design<br />para o seu espaço
          </h1>
          <p className="mt-4 text-[#9ca3af] text-base">Responda as perguntas e receba um conceito completo em segundos.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden">

          {/* Bloco 1 — O espaço */}
          <div className="px-8 pt-8 pb-7">
            <SectionTitle>O espaço</SectionTitle>

            <div className="space-y-6">
              <div>
                <label className="form-label">Tipo</label>
                <div className="grid grid-cols-5 gap-2">
                  {([
                    ['cafe', 'Café'],
                    ['loja', 'Loja'],
                    ['bar', 'Bar'],
                    ['restaurante', 'Restaurante'],
                    ['studio', 'Studio'],
                  ] as [SpaceType, string][]).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => set('tipo', val)}
                      className={`opt-btn text-center${form.tipo === val ? ' selected' : ''}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">Estado atual</label>
                <OptGrid
                  options={[
                    ['obra-bruta', 'Obra bruta'],
                    ['ja-funciona', 'Já em funcionamento'],
                    ['precisa-refresh', 'Precisa de atualização'],
                  ] as [EstadoAtual, string][]}
                  value={form.estadoAtual}
                  onChange={v => set('estadoAtual', v)}
                  cols={3}
                />
              </div>

              <div>
                <label className="form-label">Localização</label>
                <OptGrid
                  options={[
                    ['terreo-urbano', 'Térreo urbano'],
                    ['shopping', 'Shopping'],
                    ['rua-bairro', 'Rua de bairro'],
                    ['outro', 'Outro'],
                  ] as [Location, string][]}
                  value={form.localizacao}
                  onChange={v => set('localizacao', v)}
                />
              </div>
            </div>
          </div>

          <hr className="section-divider" />

          {/* Bloco 2 — Dimensões */}
          <div className="px-8 py-7">
            <SectionTitle>Dimensões</SectionTitle>

            <div className="space-y-6">
              <div>
                <label className="form-label">Área aproximada</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range" min={15} max={300} step={5}
                    value={form.area}
                    onChange={e => set('area', Number(e.target.value))}
                    className="flex-1 accent-[#6366f1]"
                  />
                  <span className="text-base font-semibold text-[#1f2937] w-16 text-right tabular-nums">{form.area} m²</span>
                </div>
              </div>

              <div>
                <label className="form-label">
                  Medidas exatas <span className="text-[#9ca3af] font-normal normal-case tracking-normal">— opcional</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'comprimento' as const, label: 'Comprimento' },
                    { key: 'largura' as const, label: 'Largura' },
                    { key: 'alturaPeDireito' as const, label: 'Pé-direito' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <p className="text-xs text-[#9ca3af] mb-1.5">{label}</p>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1} max={200} step={0.5}
                          placeholder="—"
                          value={form[key] ?? ''}
                          onChange={e => set(key, e.target.value ? Number(e.target.value) : undefined)}
                          className="w-full rounded-xl border border-[#e5e7eb] bg-[#f8f9fb] px-3 py-3 text-[0.9375rem] text-[#1f2937] placeholder-[#c4bdb3] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                        />
                        <span className="text-sm text-[#9ca3af] shrink-0">m</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Pé-direito</label>
                  <div className="flex flex-col gap-2">
                    {([
                      ['baixo', 'Até 2,5 m'],
                      ['medio', '2,5 a 3,5 m'],
                      ['alto', 'Acima de 3,5 m'],
                    ] as [PeDireito, string][]).map(([val, label]) => (
                      <button key={val} type="button" onClick={() => set('peDireito', val)}
                        className={`opt-btn${form.peDireito === val ? ' selected' : ''}`}>{label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="form-label">Luz natural</label>
                  <div className="flex flex-col gap-2">
                    {([
                      ['muita', 'Muita'],
                      ['moderada', 'Moderada'],
                      ['pouca', 'Pouca ou nenhuma'],
                    ] as [LuzNatural, string][]).map(([val, label]) => (
                      <button key={val} type="button" onClick={() => set('luzNatural', val)}
                        className={`opt-btn${form.luzNatural === val ? ' selected' : ''}`}>{label}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label">Capacidade desejada</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range" min={5} max={150} step={5}
                    value={form.capacidade}
                    onChange={e => set('capacidade', Number(e.target.value))}
                    className="flex-1 accent-[#6366f1]"
                  />
                  <span className="text-base font-semibold text-[#1f2937] w-24 text-right tabular-nums">{form.capacidade} lugares</span>
                </div>
              </div>
            </div>
          </div>

          <hr className="section-divider" />

          {/* Bloco 3 — Reforma */}
          <div className="px-8 py-7">
            <SectionTitle>Reforma</SectionTitle>

            <div className="space-y-6">
              <div>
                <label className="form-label">Orçamento</label>
                <OptGrid
                  options={[
                    ['ate50k', 'Até R$ 50k'],
                    ['50k-150k', 'R$ 50k – 150k'],
                    ['150k-300k', 'R$ 150k – 300k'],
                    ['acima300k', 'Acima de R$ 300k'],
                  ] as [Budget, string][]}
                  value={form.orcamento}
                  onChange={v => set('orcamento', v)}
                />
              </div>

              <div>
                <label className="form-label">Prioridade</label>
                <OptGrid
                  options={[
                    ['completa', 'Reforma completa'],
                    ['moveis-decor', 'Móveis e decor'],
                    ['iluminacao', 'Foco em iluminação'],
                  ] as [Prioridade, string][]}
                  value={form.prioridade}
                  onChange={v => set('prioridade', v)}
                  cols={3}
                />
              </div>
            </div>
          </div>

          <hr className="section-divider" />

          {/* Bloco 4 — Identidade */}
          <div className="px-8 py-7">
            <SectionTitle>Identidade</SectionTitle>

            <div className="space-y-6">
              <div>
                <label className="form-label">Estilo desejado</label>
                <input
                  type="text"
                  required
                  placeholder="ex: aconchegante, industrial, minimalista japonês…"
                  value={form.vibe}
                  onChange={e => set('vibe', e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="form-label">Público-alvo</label>
                <OptGrid
                  options={[
                    ['jovem-casual', 'Jovem / casual'],
                    ['corporativo', 'Corporativo'],
                    ['familia', 'Família'],
                    ['turista', 'Turista'],
                  ] as [PublicoAlvo, string][]}
                  value={form.publicoAlvo}
                  onChange={v => set('publicoAlvo', v)}
                />
              </div>

              <div>
                <label className="form-label">
                  Foto do espaço atual <span className="text-[#9ca3af] font-normal normal-case tracking-normal">— opcional</span>
                </label>
                {photoPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-[#e5e7eb]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoPreview} alt="Espaço atual" className="w-full h-44 object-cover" />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute top-3 right-3 bg-white/90 rounded-full px-3 py-1 text-sm text-[#6b7280] hover:text-[#1f2937] transition-colors border border-[#e5e7eb]"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-24 rounded-xl border border-dashed border-[#d1d5db] bg-[#f8f9fb] text-[#9ca3af] text-sm hover:border-[#1a1714] hover:text-[#1f2937] transition-all flex items-center justify-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                    Adicionar foto do espaço
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </div>

              <div>
                <label className="form-label">
                  Observações <span className="text-[#9ca3af] font-normal normal-case tracking-normal">— opcional</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Algo importante sobre o espaço, marca ou público…"
                  value={form.observacoes}
                  onChange={e => set('observacoes', e.target.value)}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="px-8 pb-8">
            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 mb-4">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !form.vibe.trim()}
              className="w-full py-4 rounded-xl bg-[#6366f1] text-white font-semibold text-base hover:bg-[#4f46e5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Gerando conceito…' : 'Gerar conceito de design'}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-[#9ca3af]">Otelie Studio · Powered by GPT-4o</p>
      </div>
    </main>
  )
}
