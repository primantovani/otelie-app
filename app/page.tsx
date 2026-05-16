'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { BriefFormData, SpaceType, Budget, Location } from '@/lib/types'

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
    observacoes: '',
  })

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

      if (photoBase64) {
        sessionStorage.setItem('otelie_photo', photoBase64)
      } else {
        sessionStorage.removeItem('otelie_photo')
      }
      const encoded = encodeURIComponent(JSON.stringify({ result, form }))
      router.push(`/resultado?data=${encoded}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold tracking-widest text-indigo-500 uppercase mb-3">Otelie Studio</p>
          <h1 className="text-3xl font-bold text-stone-900 leading-snug">
            Conceito de design<br />para o seu espaço
          </h1>
          <p className="mt-3 text-stone-500 text-sm">Responda 5 perguntas e receba um conceito completo em segundos.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8 space-y-6">
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Tipo de espaço</label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {([
                ['cafe', '☕ Café'],
                ['loja', '🛍 Loja'],
                ['bar', '🍻 Bar'],
                ['restaurante', '🍽 Restaurante'],
                ['studio', '🎨 Studio'],
              ] as [SpaceType, string][]).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, tipo: val }))}
                  className={`py-2 px-1 rounded-xl text-sm font-medium border transition-all ${
                    form.tipo === val
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
              Área aproximada
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={15}
                max={300}
                step={5}
                value={form.area}
                onChange={e => setForm(f => ({ ...f, area: Number(e.target.value) }))}
                className="flex-1 accent-indigo-500"
              />
              <span className="text-sm font-semibold text-stone-700 w-16 text-right">{form.area} m²</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Orçamento para reforma</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['ate50k', 'Até R$ 50k'],
                ['50k-150k', 'R$ 50k – 150k'],
                ['150k-300k', 'R$ 150k – 300k'],
                ['acima300k', 'Acima de R$ 300k'],
              ] as [Budget, string][]).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, orcamento: val }))}
                  className={`py-2 px-3 rounded-xl text-sm font-medium border transition-all text-left ${
                    form.orcamento === val
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
              Estilo desejado
            </label>
            <input
              type="text"
              required
              placeholder="ex: aconchegante, industrial, minimalista japonês…"
              value={form.vibe}
              onChange={e => setForm(f => ({ ...f, vibe: e.target.value }))}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Localização</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['terreo-urbano', '🏙 Térreo urbano'],
                ['shopping', '🏬 Shopping'],
                ['rua-bairro', '🌿 Rua de bairro'],
                ['outro', '📍 Outro'],
              ] as [Location, string][]).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, localizacao: val }))}
                  className={`py-2 px-3 rounded-xl text-sm font-medium border transition-all text-left ${
                    form.localizacao === val
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Photo upload */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
              Foto do espaço atual{' '}
              <span className="text-stone-300 font-normal normal-case">(opcional — a IA mantém a estrutura real)</span>
            </label>

            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-stone-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="Espaço atual" className="w-full h-40 object-cover" />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-0.5 text-xs text-stone-500 hover:text-red-500 transition-colors"
                >
                  remover
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-24 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 text-stone-400 text-sm hover:border-indigo-300 hover:text-indigo-400 transition-all flex flex-col items-center justify-center gap-1"
              >
                <span className="text-xl">📷</span>
                <span>Adicionar foto do espaço</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
              Observações <span className="text-stone-300 font-normal normal-case">(opcional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Algo importante sobre o espaço, marca ou público…"
              value={form.observacoes}
              onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !form.vibe.trim()}
            className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Gerando conceito…' : 'Gerar conceito de design →'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-stone-400">Powered by GPT-4o · Otelie Studio</p>
      </div>
    </main>
  )
}
