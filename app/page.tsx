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

  const inputCls = 'w-full rounded-xl border border-[#e5e0d8] bg-[#faf9f7] px-4 py-3 text-sm text-[#1a1714] placeholder-[#c4bdb3] focus:outline-none focus:ring-1 focus:ring-[#1a1714]'

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">

        <div className="mb-10 text-center">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-[#9c9289] uppercase mb-4">Otelie Studio</p>
          <h1 className="text-[2rem] font-bold text-[#1a1714] leading-tight">
            Conceito de design<br />para o seu espaço
          </h1>
          <p className="mt-3 text-[#9c9289] text-sm">Responda as perguntas e receba um conceito completo em segundos.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#ede9e3] p-8 space-y-7">

          {/* Tipo */}
          <div>
            <label className="form-label">Tipo de espaço</label>
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

          {/* Área */}
          <div>
            <label className="form-label">Área aproximada</label>
            <div className="flex items-center gap-4">
              <input
                type="range" min={15} max={300} step={5}
                value={form.area}
                onChange={e => set('area', Number(e.target.value))}
                className="flex-1 accent-[#1a1714]"
              />
              <span className="text-sm font-semibold text-[#1a1714] w-16 text-right tabular-nums">{form.area} m²</span>
            </div>
          </div>

          {/* Medidas exatas */}
          <div>
            <label className="form-label">
              Medidas do ambiente{' '}
              <span className="text-[#c4bdb3] font-normal normal-case tracking-normal">— opcional</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'comprimento' as const, label: 'Comprimento' },
                { key: 'largura' as const, label: 'Largura' },
                { key: 'alturaPeDireito' as const, label: 'Pé-direito' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <p className="text-[11px] text-[#9c9289] mb-1.5">{label}</p>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1} max={200} step={0.5}
                      placeholder="—"
                      value={form[key] ?? ''}
                      onChange={e => set(key, e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full rounded-xl border border-[#e5e0d8] bg-[#faf9f7] px-3 py-2.5 text-sm text-[#1a1714] placeholder-[#c4bdb3] focus:outline-none focus:ring-1 focus:ring-[#1a1714]"
                    />
                    <span className="text-xs text-[#9c9289] shrink-0">m</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pé-direito + Luz */}
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

          {/* Estado atual */}
          <div>
            <label className="form-label">Estado atual do espaço</label>
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

          {/* Capacidade */}
          <div>
            <label className="form-label">Capacidade desejada</label>
            <div className="flex items-center gap-4">
              <input
                type="range" min={5} max={150} step={5}
                value={form.capacidade}
                onChange={e => set('capacidade', Number(e.target.value))}
                className="flex-1 accent-[#1a1714]"
              />
              <span className="text-sm font-semibold text-[#1a1714] w-24 text-right tabular-nums">{form.capacidade} lugares</span>
            </div>
          </div>

          {/* Orçamento */}
          <div>
            <label className="form-label">Orçamento para reforma</label>
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

          {/* Prioridade */}
          <div>
            <label className="form-label">Prioridade da reforma</label>
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

          {/* Estilo */}
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

          {/* Público-alvo */}
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

          {/* Localização */}
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

          {/* Foto */}
          <div>
            <label className="form-label">
              Foto do espaço atual{' '}
              <span className="text-[#c4bdb3] font-normal normal-case tracking-normal">— opcional</span>
            </label>
            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-[#e5e0d8]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="Espaço atual" className="w-full h-40 object-cover" />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 bg-white/90 rounded-full px-3 py-1 text-xs text-[#5c5449] hover:text-[#1a1714] transition-colors border border-[#e5e0d8]"
                >
                  Remover
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-20 rounded-xl border border-dashed border-[#c4bdb3] bg-[#faf9f7] text-[#9c9289] text-sm hover:border-[#1a1714] hover:text-[#1a1714] transition-all flex items-center justify-center gap-2"
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

          {/* Observações */}
          <div>
            <label className="form-label">
              Observações{' '}
              <span className="text-[#c4bdb3] font-normal normal-case tracking-normal">— opcional</span>
            </label>
            <textarea
              rows={2}
              placeholder="Algo importante sobre o espaço, marca ou público…"
              value={form.observacoes}
              onChange={e => set('observacoes', e.target.value)}
              className={`${inputCls} resize-none`}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !form.vibe.trim()}
            className="w-full py-3.5 rounded-xl bg-[#1a1714] text-white font-semibold text-sm hover:bg-[#2d2a26] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Gerando conceito…' : 'Gerar conceito de design'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#c4bdb3]">Otelie Studio · Powered by GPT-4o</p>
      </div>
    </main>
  )
}
