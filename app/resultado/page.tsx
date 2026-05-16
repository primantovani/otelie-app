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

  const sections = [
    { label: 'Iluminação', text: result.lighting },
    { label: 'Materiais', text: result.materials },
    { label: 'Acústica', text: result.acoustics },
    { label: 'Layout', text: result.layout },
  ]

  return (
    <main className="min-h-screen px-4 py-16" style={{ background: '#f8f6f3' }}>
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-[#9c9289] uppercase mb-1">Otelie Studio</p>
            <h1 className="text-2xl font-bold text-[#1a1714]">Conceito de Design</h1>
            <p className="text-sm text-[#9c9289] mt-0.5">
              {SPACE_LABELS[form.tipo]} · {form.area} m²
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-xs text-[#9c9289] hover:text-[#1a1714] transition-colors mt-1"
          >
            ← Novo conceito
          </button>
        </div>

        {/* Image — Before / After or single */}
        {photoBase64 ? (
          <div className="mb-6 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="relative rounded-xl overflow-hidden bg-[#ede9e3] aspect-video">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoBase64} alt="Antes" className="w-full h-full object-cover" />
                <span className="absolute bottom-2 left-2 bg-black/40 text-white text-[10px] font-medium px-2 py-0.5 rounded-full tracking-wide">Antes</span>
              </div>
              <div className="relative rounded-xl overflow-hidden bg-[#ede9e3] aspect-video flex items-center justify-center">
                {imageLoading ? (
                  <div className="flex flex-col items-center gap-2 text-[#9c9289]">
                    <div className="w-4 h-4 border border-[#c4bdb3] border-t-[#1a1714] rounded-full animate-spin" />
                    <p className="text-[10px]">Gerando…</p>
                  </div>
                ) : imageUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="Proposta" className="w-full h-full object-cover" />
                    <span className="absolute bottom-2 left-2 bg-[#1a1714]/70 text-white text-[10px] font-medium px-2 py-0.5 rounded-full tracking-wide">Proposta</span>
                  </>
                ) : (
                  <p className="text-[10px] text-red-400 px-2 text-center">{imageError}</p>
                )}
              </div>
            </div>
            {spaceAnalysis && (
              <details className="text-xs text-[#9c9289] cursor-pointer group">
                <summary className="hover:text-[#1a1714] transition-colors select-none">Ver análise do espaço real</summary>
                <p className="mt-2 leading-relaxed bg-white rounded-xl p-4 border border-[#ede9e3]">{spaceAnalysis}</p>
              </details>
            )}
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden mb-6 bg-[#ede9e3] aspect-video flex items-center justify-center">
            {imageLoading ? (
              <div className="flex flex-col items-center gap-2 text-[#9c9289]">
                <div className="w-5 h-5 border border-[#c4bdb3] border-t-[#1a1714] rounded-full animate-spin" />
                <p className="text-xs">Gerando imagem…</p>
              </div>
            ) : imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Proposta" className="w-full h-full object-cover" />
            ) : (
              <p className="text-xs text-red-400 px-4 text-center">{imageError ?? 'Imagem não disponível'}</p>
            )}
          </div>
        )}

        {/* Concept card */}
        <div className="bg-white rounded-2xl border border-[#ede9e3] overflow-hidden">

          {/* Vibe + Palette */}
          <div className="px-8 pt-8 pb-6 border-b border-[#ede9e3]">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="form-label mb-3">Atmosfera</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.vibe.map(v => (
                    <span key={v} className="px-3 py-1 rounded-full border border-[#e5e0d8] text-[#5c5449] text-xs font-medium">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
              <div className="shrink-0">
                <p className="form-label mb-3 text-right">Paleta</p>
                <div className="flex gap-2">
                  {result.palette.map(color => (
                    <div key={color} title={color} className="flex flex-col items-center gap-1">
                      <div
                        className="w-7 h-7 rounded-full border border-[#ede9e3] shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="divide-y divide-[#ede9e3]">
            {sections.map(({ label, text }) => (
              <div key={label} className="px-8 py-5">
                <p className="form-label mb-1.5">{label}</p>
                <p className="text-sm text-[#3d3830] leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          <button
            onClick={handleDownload}
            disabled={imageLoading || pdfLoading}
            className="flex-1 py-3 rounded-xl bg-[#1a1714] text-white font-semibold text-sm hover:bg-[#2d2a26] transition-colors disabled:opacity-40"
          >
            {pdfLoading ? 'Gerando PDF…' : 'Baixar PDF'}
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex-1 py-3 rounded-xl border border-[#e5e0d8] text-[#5c5449] font-semibold text-sm hover:bg-[#faf9f7] hover:border-[#c4bdb3] transition-colors"
          >
            Novo conceito
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-[#c4bdb3]">Otelie Studio · Powered by GPT-4o</p>
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
