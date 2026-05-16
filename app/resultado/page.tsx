'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import type { BriefResult, BriefFormData } from '@/lib/types'
import { SPACE_LABELS } from '@/lib/types'

function ResultContent() {
  const params = useSearchParams()
  const router = useRouter()
  const raw = params.get('data')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  const parsed = raw ? JSON.parse(decodeURIComponent(raw)) : null
  const result: BriefResult = parsed?.result
  const form: BriefFormData = parsed?.form
  const photoBase64: string | undefined = typeof window !== 'undefined'
    ? sessionStorage.getItem('otelie_photo') ?? undefined
    : undefined
  const spaceAnalysis: string | undefined = result?.spaceAnalysis

  useEffect(() => {
    if (!result || !form) return

    fetch('/api/imagem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result, form, spaceAnalysis }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.url) setImageUrl(data.url)
        else setImageError(data.error ?? 'Sem URL na resposta')
      })
      .catch(e => setImageError(e.message))
      .finally(() => setImageLoading(false))
  }, [])

  if (!result || !form) {
    router.push('/')
    return null
  }

  async function handleDownload() {
    setPdfLoading(true)
    try {
      const res = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, form, imageBase64: imageUrl }),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'conceito-otelie.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <main className="min-h-screen px-4 py-16">
      <div className="max-w-xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-indigo-500 uppercase mb-1">Otelie Studio</p>
            <h1 className="text-2xl font-bold text-stone-900">Conceito de Design</h1>
            <p className="text-sm text-stone-400 mt-0.5">
              {SPACE_LABELS[form.tipo]} · {form.area} m²
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            ← Novo conceito
          </button>
        </div>

        {/* Before / After */}
        {photoBase64 ? (
          <div className="mb-6 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="relative rounded-2xl overflow-hidden bg-stone-100 aspect-video">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoBase64} alt="Antes" className="w-full h-full object-cover" />
                <span className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">Antes</span>
              </div>
              <div className="relative rounded-2xl overflow-hidden bg-stone-100 aspect-video flex items-center justify-center">
                {imageLoading ? (
                  <div className="flex flex-col items-center gap-2 text-stone-400">
                    <div className="w-5 h-5 border-2 border-stone-300 border-t-indigo-400 rounded-full animate-spin" />
                    <p className="text-[10px]">Gerando…</p>
                  </div>
                ) : imageUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="Depois" className="w-full h-full object-cover" />
                    <span className="absolute bottom-2 left-2 bg-indigo-600/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">Depois</span>
                  </>
                ) : (
                  <p className="text-[10px] text-red-400 px-2 text-center">{imageError ?? 'Indisponível'}</p>
                )}
              </div>
            </div>
            {spaceAnalysis && (
              <details className="text-xs text-stone-400 cursor-pointer">
                <summary className="hover:text-stone-600 transition-colors">Ver análise do espaço real</summary>
                <p className="mt-2 leading-relaxed bg-stone-50 rounded-xl p-3">{spaceAnalysis}</p>
              </details>
            )}
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden mb-6 bg-stone-100 aspect-video flex items-center justify-center">
            {imageLoading ? (
              <div className="flex flex-col items-center gap-2 text-stone-400">
                <div className="w-6 h-6 border-2 border-stone-300 border-t-indigo-400 rounded-full animate-spin" />
                <p className="text-xs">Gerando imagem do ambiente…</p>
              </div>
            ) : imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Render do ambiente" className="w-full h-full object-cover" />
            ) : (
              <p className="text-xs text-red-400 px-4 text-center">{imageError ?? 'Imagem não disponível'}</p>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
          <div className="px-8 pt-8 pb-6 border-b border-stone-100">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Atmosfera</p>
            <div className="flex flex-wrap gap-2">
              {result.vibe.map(v => (
                <span key={v} className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium">
                  {v}
                </span>
              ))}
            </div>
          </div>

          <div className="px-8 py-6 border-b border-stone-100">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Paleta de cores</p>
            <div className="flex gap-3 items-center">
              {result.palette.map(color => (
                <div key={color} className="flex flex-col items-center gap-1.5">
                  <div
                    className="w-10 h-10 rounded-full border border-stone-100 shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[10px] text-stone-400 font-mono">{color}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="divide-y divide-stone-100">
            {[
              { icon: '💡', label: 'Iluminação', text: result.lighting },
              { icon: '🪵', label: 'Materiais', text: result.materials },
              { icon: '🔇', label: 'Acústica', text: result.acoustics },
              { icon: '📐', label: 'Layout', text: result.layout },
            ].map(({ icon, label, text }) => (
              <div key={label} className="px-8 py-5">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
                  {icon} {label}
                </p>
                <p className="text-sm text-stone-700 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleDownload}
            disabled={imageLoading || pdfLoading}
            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {pdfLoading ? 'Gerando PDF…' : 'Baixar PDF'}
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-600 font-semibold text-sm hover:bg-stone-50 transition-colors"
          >
            Novo conceito
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-stone-400">Powered by GPT-4o · Otelie Studio</p>
      </div>
    </main>
  )
}

export default function ResultadoPage() {
  return (
    <Suspense>
      <ResultContent />
    </Suspense>
  )
}
