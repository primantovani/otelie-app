'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import type { BriefResult, BriefFormData } from '@/lib/types'
import { SPACE_LABELS } from '@/lib/types'

function ResultContent() {
  const params = useSearchParams()
  const router = useRouter()
  const raw = params.get('data')

  if (!raw) {
    router.push('/')
    return null
  }

  const { result, form }: { result: BriefResult; form: BriefFormData } = JSON.parse(decodeURIComponent(raw))

  function handleDownload() {
    window.open(`/api/pdf?data=${params.get('data')}`, '_blank')
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

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
          {/* Vibe tags */}
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

          {/* Palette */}
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

          {/* Sections */}
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

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors"
          >
            Baixar PDF
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-600 font-semibold text-sm hover:bg-stone-50 transition-colors"
          >
            Refinar ou recomeçar
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-stone-400">Powered by Claude · Otelie Studio</p>
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
