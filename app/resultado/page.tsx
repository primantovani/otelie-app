'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import type { BriefResult, BriefFormData } from '@/lib/types'
import { SPACE_LABELS } from '@/lib/types'
import { pushDebugEntry } from '@/lib/debug-store'

function ImagePlaceholder({ step, palette, elapsed, small }: {
  step: string
  palette: string[]
  elapsed: number
  small?: boolean
}) {
  const colors = palette.length >= 2 ? palette : ['#6366f1', '#a5b4fc', '#e0e7ff']
  const gradient = `linear-gradient(135deg, ${colors[0]}22, ${colors[1] ?? colors[0]}44, ${colors[2] ?? colors[0]}22)`

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 relative overflow-hidden" style={{ background: gradient }}>
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 2s infinite linear',
      }} />
      <div className="flex gap-1.5 z-10">
        {colors.slice(0, 3).map((c, i) => (
          <div key={i} className="rounded-full animate-bounce" style={{
            width: small ? 6 : 8,
            height: small ? 6 : 8,
            backgroundColor: c,
            animationDelay: `${i * 0.15}s`,
          }} />
        ))}
      </div>
      <div className="z-10 flex flex-col items-center gap-1.5">
        <p className={`font-semibold text-[#111827] ${small ? 'text-xs' : 'text-sm'}`}>{step}</p>
        <p className={`tabular-nums font-medium text-[#6b7280] ${small ? 'text-[10px]' : 'text-xs'}`}>{elapsed}s</p>
      </div>
    </div>
  )
}

function ResultContent() {
  const params = useSearchParams()
  const router = useRouter()
  const raw = params.get('data')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState<string | null>(null)
  const [imageStep, setImageStep] = useState('Analisando conceito…')
  const [elapsed, setElapsed] = useState(0)
  const [plantaUrl, setPlantaUrl] = useState<string | null>(null)
  const [plantaLoading, setPlantaLoading] = useState(true)
  const [plantaError, setPlantaError] = useState<string | null>(null)
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

    const STEPS = [
      'Analyzing concept…',
      'Building the scene…',
      'Applying materials…',
      'Rendering lighting…',
      'Finishing details…',
    ]
    const STEP_INTERVAL = 8000
    let stepIndex = 0
    let tick = 0
    let timer: ReturnType<typeof setInterval> | null = null

    timer = setInterval(() => {
      tick += 1
      setElapsed(tick)
      const nextStep = Math.min(Math.floor((tick * 1000) / STEP_INTERVAL), STEPS.length - 1)
      if (nextStep !== stepIndex) {
        stepIndex = nextStep
        setImageStep(STEPS[stepIndex])
      }
    }, 1000)

    const stopTimer = () => { if (timer) { clearInterval(timer); timer = null } }

    // Perspectiva + planta em paralelo
    fetch('/api/imagem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result, form, spaceAnalysis }),
    })
      .then(async res => {
        const data = await res.json()
        stopTimer()
        if (data._debug) pushDebugEntry(data._debug)
        if (!res.ok || data.error) {
          setImageError(data.error ?? 'Erro ao gerar imagem')
        } else {
          setImageUrl(data.url)
          const a = document.createElement('a')
          a.href = data.url
          a.download = `otelie-${form.tipo}-${Date.now()}.png`
          a.click()
        }
        setImageLoading(false)
      })
      .catch(e => {
        stopTimer()
        setImageError(e.message)
        setImageLoading(false)
      })

    fetch('/api/planta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plantaPrompt: result.plantaPrompt }),
    })
      .then(async res => {
        const data = await res.json()
        if (data._debug) pushDebugEntry(data._debug)
        if (!res.ok || data.error) setPlantaError(data.error ?? 'Erro ao gerar planta')
        else setPlantaUrl(data.url)
        setPlantaLoading(false)
      })
      .catch(e => {
        setPlantaError(e.message)
        setPlantaLoading(false)
      })

    return () => { if (timer) clearInterval(timer) }
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
    { label: 'Lighting', text: result.lighting },
    { label: 'Materials', text: result.materials },
    { label: 'Acoustics', text: result.acoustics },
    { label: 'Layout', text: result.layout },
  ]

  return (
    <main className="min-h-screen px-4 py-16" style={{ background: '#f8f9fb' }}>
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-[#9ca3af] uppercase mb-1">Otelie Studio</p>
            <h1 className="text-2xl font-bold text-[#1f2937]">Design Concept</h1>
            <p className="text-sm text-[#9ca3af] mt-0.5">
              {SPACE_LABELS[form.tipo]} · {form.area} sq ft
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-xs text-[#9ca3af] hover:text-[#1f2937] transition-colors mt-1"
          >
            ← New concept
          </button>
        </div>

        {/* Otelie Eye badge */}
        <div className="mb-5 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6366f1]/8 border border-[#6366f1]/15 text-[10px] font-bold tracking-[0.15em] text-[#6366f1] uppercase" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <circle cx="4" cy="4" r="3" stroke="#6366f1" strokeWidth="1.5"/>
              <circle cx="4" cy="4" r="1" fill="#6366f1"/>
            </svg>
            Otelie Eye™
          </span>
          <span className="text-xs text-[#9ca3af]">AI-curated space visualization</span>
        </div>

        {/* Image */}
        {photoBase64 ? (
          <div className="mb-6 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="relative rounded-xl overflow-hidden bg-[#f3f4f6] aspect-video">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoBase64} alt="Antes" className="w-full h-full object-cover" />
                <span className="absolute bottom-2 left-2 bg-black/40 text-white text-[10px] font-medium px-2 py-0.5 rounded-full tracking-wide">Before</span>
              </div>
              <div className="relative rounded-xl overflow-hidden bg-[#f3f4f6] aspect-video flex items-center justify-center">
                {imageLoading ? (
                  <ImagePlaceholder step={imageStep} palette={result.palette} elapsed={elapsed} small />
                ) : imageUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="Proposta" className="w-full h-full object-cover image-fadein" />
                    <span className="absolute bottom-2 left-2 bg-[#6366f1]/70 text-white text-[10px] font-medium px-2 py-0.5 rounded-full tracking-wide">Proposal</span>
                  </>
                ) : (
                  <p className="text-[10px] text-red-400 px-2 text-center">{imageError}</p>
                )}
              </div>
            </div>
            {spaceAnalysis && (
              <details className="text-xs text-[#9ca3af] cursor-pointer group">
                <summary className="hover:text-[#1f2937] transition-colors select-none">View real space analysis</summary>
                <p className="mt-2 leading-relaxed bg-white rounded-xl p-4 border border-[#e5e7eb]">{spaceAnalysis}</p>
              </details>
            )}
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden mb-6 bg-[#f3f4f6] aspect-video flex items-center justify-center">
            {imageLoading ? (
              <ImagePlaceholder step={imageStep} palette={result.palette} elapsed={elapsed} />
            ) : imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Proposta" className="w-full h-full object-cover image-fadein" />
            ) : (
              <p className="text-xs text-red-400 px-4 text-center">{imageError ?? 'Imagem não disponível'}</p>
            )}
          </div>
        )}

        {/* Planta baixa */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#9ca3af]" style={{ fontFamily: 'var(--font-mono, monospace)' }}>Floor plan</p>
            {plantaUrl && (
              <a href={plantaUrl} download={`otelie-planta-${form.tipo}-${Date.now()}.png`}
                className="text-[10px] text-[#6366f1] hover:underline">
                Baixar
              </a>
            )}
          </div>
          <div className="rounded-xl overflow-hidden border border-[#e5e7eb] bg-white aspect-square flex items-center justify-center">
            {plantaLoading ? (
              <ImagePlaceholder step="Generating floor plan…" palette={['#e5e7eb', '#d1d5db', '#9ca3af']} elapsed={0} />
            ) : plantaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={plantaUrl} alt="Planta esquemática" className="w-full h-full object-contain image-fadein" />
            ) : (
              <p className="text-xs text-red-400 px-4 text-center">{plantaError ?? 'Planta não disponível'}</p>
            )}
          </div>
        </div>

        {/* Concept card */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden">

          {/* Vibe + Palette */}
          <div className="px-8 pt-8 pb-6 border-b border-[#e5e7eb]">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="form-label mb-3">Atmosphere</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.vibe.map(v => (
                    <span key={v} className="px-3 py-1 rounded-full border border-[#e5e7eb] text-[#6b7280] text-xs font-medium">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
              <div className="shrink-0">
                <p className="form-label mb-3 text-right">Palette</p>
                <div className="flex gap-2">
                  {result.palette.map(color => (
                    <div key={color} title={color} className="flex flex-col items-center gap-1">
                      <div
                        className="w-7 h-7 rounded-full border border-[#e5e7eb] shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="divide-y divide-[#e5e7eb]">
            {sections.map(({ label, text }) => (
              <div key={label} className="px-8 py-5">
                <p className="form-label mb-1.5">{label}</p>
                <p className="text-sm text-[#4b5563] leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          <button
            onClick={handleDownload}
            disabled={imageLoading || pdfLoading}
            className="flex-1 py-3 rounded-xl bg-[#6366f1] text-white font-semibold text-sm hover:bg-[#4f46e5] transition-colors disabled:opacity-40"
          >
            {pdfLoading ? 'Generating PDF…' : 'Download PDF'}
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex-1 py-3 rounded-xl border border-[#e5e7eb] text-[#6b7280] font-semibold text-sm hover:bg-[#f8f9fb] hover:border-[#d1d5db] transition-colors"
          >
            New concept
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-[#9ca3af]">Otelie Studio · Powered by OpenAI</p>
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
