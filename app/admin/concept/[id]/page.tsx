'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Logo from '@/components/Logo'

type ConceptData = {
  titulo?: string; subtitulo?: string; atmosfera?: string
  paleta?: string[]; paletaDescricao?: string; materiais?: string
  iluminacao?: string; layout?: string; mobiliario?: string
  diferenciais?: string; imagensIA?: string[]; imagensOtelie?: string[]
  status?: string; lang?: string
}

type BriefingData = {
  id: string; createdAt: string; userEmail?: string
  existente?: Record<string, unknown>; necessidades?: Record<string, unknown>
  fotoUrls?: Record<string, string>
}

const SL = 'text-[10px] font-bold uppercase tracking-[0.15em] text-[#D1A23A] mb-3'
const SS = { fontFamily: 'var(--font-mono, Inter, sans-serif)' }

export default function AdminConceptPageWrapper() {
  return <Suspense><AdminConceptPage /></Suspense>
}

function AdminConceptPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const searchParams = useSearchParams()
  const nid      = searchParams.get('nid') ?? ''
  const [brief,   setBrief]   = useState<BriefingData | null>(null)
  const [concept, setConcept] = useState<ConceptData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')
  const [lang,    setLang]    = useState<'pt' | 'en'>('pt')

  useEffect(() => {
    fetch(`/api/briefing/${id}${nid ? `?nid=${nid}` : ''}`)
      .then(r => r.json()).then(d => { if (d.exists) setBrief(d) })
    fetch(`/api/concept/${id}`)
      .then(r => r.json()).then(d => { if (d.exists) setConcept(d) })
  }, [id, nid])

  async function gerar() {
    if (!brief) return
    setLoading(true); setMsg('')
    try {
      const res = await fetch(`/api/concept/${id}/gerar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefing: brief, lang, imagensOtelie: concept?.imagensOtelie ?? [] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setConcept(data)
      setMsg('Concept gerado com sucesso.')
    } catch (e) {
      setMsg(`Erro: ${e instanceof Error ? e.message : 'Falha ao gerar'}`)
    } finally { setLoading(false) }
  }

  async function uploadImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const form = new FormData(); form.append('file', file)
    const res  = await fetch(`/api/concept/${id}/imagem`, { method: 'POST', body: form })
    const { url } = await res.json()
    setConcept(c => ({ ...c, imagensOtelie: [...(c?.imagensOtelie ?? []), url] }))
  }

  function removeImg(type: 'imagensIA' | 'imagensOtelie', idx: number) {
    setConcept(c => {
      if (!c) return c
      const arr = [...(c[type] ?? [])]
      arr.splice(idx, 1)
      return { ...c, [type]: arr }
    })
  }

  async function publicar() {
    setSaving(true)
    try {
      await fetch(`/api/concept/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...concept, status: 'published' }),
      })
      setConcept(c => c ? { ...c, status: 'published' } : c)
      setMsg('Concept publicado para o cliente.')
    } catch { setMsg('Erro ao publicar.') }
    finally { setSaving(false) }
  }

  async function salvar() {
    setSaving(true)
    try {
      await fetch(`/api/concept/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(concept),
      })
      setMsg('Salvo.')
    } catch { setMsg('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  const ne = brief?.necessidades as Record<string, unknown> | undefined
  const ex = brief?.existente   as Record<string, unknown> | undefined

  return (
    <div className="min-h-screen bg-[#f8f9fb] px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Logo size="sm" />
            <button onClick={() => router.push('/admin')} className="text-xs text-[#9ca3af] hover:text-[#6b7280]">← Admin · {id}</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(l => l === 'pt' ? 'en' : 'pt')}
              className="text-[10px] font-bold tracking-widest border border-[#e5e7eb] rounded-lg px-2.5 py-1.5 text-[#6b7280] hover:border-[#D1A23A] hover:text-[#D1A23A] transition-colors" style={SS}>
              {lang === 'pt' ? 'EN' : 'PT'}
            </button>
            {concept && (
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${concept.status === 'published' ? 'bg-[#D1A23A]/10 text-[#D1A23A]' : 'bg-amber-100 text-amber-700'}`}>
                {concept.status === 'published' ? 'Publicado' : 'Rascunho'}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left — Briefing data */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6">
              <p className={SL} style={SS}>Dados do briefing</p>
              {!brief ? (
                <p className="text-sm text-[#9ca3af]">Carregando…</p>
              ) : (
                <div className="space-y-2 text-sm">
                  <p><span className="text-[#9ca3af] text-xs">Tipo</span><br /><span className="font-medium">{String(ne?.tipoUso ?? '—')}</span></p>
                  <p><span className="text-[#9ca3af] text-xs">Marca</span><br /><span className="font-medium">{String(ne?.nomeMarca ?? '—')}</span></p>
                  <p><span className="text-[#9ca3af] text-xs">Rede social</span><br /><span className="font-medium">{String(ne?.redeSocial ?? '—')}</span></p>
                  <p><span className="text-[#9ca3af] text-xs">Conceito</span><br /><span className="font-medium">{(ne?.palavrasChave as string[] ?? []).join(', ') || '—'}</span></p>
                  <p><span className="text-[#9ca3af] text-xs">Público</span><br /><span className="font-medium">{(ne?.perfilPublico as string[] ?? []).join(', ') || '—'}</span></p>
                  <p><span className="text-[#9ca3af] text-xs">Área</span><br /><span className="font-medium">{ex?.area ? `${ex.area} m²` : '—'}</span></p>
                  <p><span className="text-[#9ca3af] text-xs">Orçamento</span><br /><span className="font-medium">{String(ne?.orcamento ?? '—')}</span></p>
                  <p><span className="text-[#9ca3af] text-xs">Cliente</span><br /><span className="font-medium">{brief.userEmail ?? '—'}</span></p>
                </div>
              )}
            </div>

            {/* Client photos */}
            {brief?.fotoUrls && Object.keys(brief.fotoUrls).length > 0 && (
              <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6">
                <p className={SL} style={SS}>Fotos do cliente</p>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(brief.fotoUrls).map(([cat, url]) => (
                    <div key={cat}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={cat} className="w-full h-20 object-cover rounded-lg border border-[#e5e7eb]" />
                      <p className="text-[10px] text-[#9ca3af] mt-1 truncate">{cat}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vision context summary */}
            {brief && (
              <div className="bg-white rounded-2xl border border-[#e5e7eb] p-4">
                <p className={SL} style={SS}>Contexto visual para a IA</p>
                <div className="flex items-center gap-3 text-xs text-[#6b7280]">
                  <span className={`px-2 py-1 rounded-lg ${Object.keys(brief.fotoUrls ?? {}).length > 0 ? 'bg-[#D1A23A]/10 text-[#D1A23A]' : 'bg-[#f3f4f6] text-[#9ca3af]'}`}>
                    {Object.keys(brief.fotoUrls ?? {}).length} foto(s) do cliente
                  </span>
                  <span className={`px-2 py-1 rounded-lg ${(concept?.imagensOtelie ?? []).length > 0 ? 'bg-[#D1A23A]/10 text-[#D1A23A]' : 'bg-[#f3f4f6] text-[#9ca3af]'}`}>
                    {(concept?.imagensOtelie ?? []).length} imagem(ns) da equipe
                  </span>
                </div>
                <p className="text-[10px] text-[#9ca3af] mt-2">
                  {Object.keys(brief.fotoUrls ?? {}).length > 0
                    ? 'GPT-4o vai analisar as fotos reais do espaço para fundamentar cada decisão.'
                    : 'Sem fotos do cliente — concept será gerado apenas com os dados do briefing.'}
                </p>
              </div>
            )}

            {/* Generate button */}
            <button onClick={gerar} disabled={loading || !brief}
              className="w-full py-4 rounded-2xl bg-[#D1A23A] text-white font-semibold text-sm hover:bg-[#a07d2e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analisando fotos e gerando concept…
                </>
              ) : concept ? 'Regenerar concept' : 'Gerar concept'}
            </button>
            {msg && <p className="text-xs text-center text-[#6b7280]">{msg}</p>}
          </div>

          {/* Right — Concept editor */}
          <div className="space-y-4">
            {concept ? (
              <>
                {/* Texts */}
                <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6 space-y-4">
                  <p className={SL} style={SS}>Textos do concept</p>
                  {([
                    ['titulo',          'Título'],
                    ['subtitulo',       'Subtítulo'],
                    ['atmosfera',       'Atmosfera'],
                    ['paletaDescricao', 'Paleta — descrição'],
                    ['materiais',       'Materiais'],
                    ['iluminacao',      'Iluminação'],
                    ['layout',          'Layout'],
                    ['mobiliario',      'Mobiliário'],
                    ['diferenciais',    'Diferenciais'],
                  ] as [keyof ConceptData, string][]).map(([key, label]) => (
                    <div key={key}>
                      <label className="text-[10px] text-[#9ca3af] font-medium uppercase tracking-wider">{label}</label>
                      {(concept[key] as string ?? '').length > 80 ? (
                        <textarea rows={3} value={concept[key] as string ?? ''} onChange={e => setConcept(c => ({ ...c, [key]: e.target.value }))}
                          className="w-full mt-1 rounded-xl border border-[#e5e7eb] bg-[#f8f9fb] px-3 py-2 text-sm text-[#1a1a1a] focus:outline-none focus:ring-1 focus:ring-[#D1A23A] resize-none" />
                      ) : (
                        <input type="text" value={concept[key] as string ?? ''} onChange={e => setConcept(c => ({ ...c, [key]: e.target.value }))}
                          className="w-full mt-1 rounded-xl border border-[#e5e7eb] bg-[#f8f9fb] px-3 py-2 text-sm text-[#1a1a1a] focus:outline-none focus:ring-1 focus:ring-[#D1A23A]" />
                      )}
                    </div>
                  ))}

                  {/* Palette */}
                  <div>
                    <label className="text-[10px] text-[#9ca3af] font-medium uppercase tracking-wider">Paleta</label>
                    <div className="flex gap-2 mt-2">
                      {(concept.paleta ?? []).map((c, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <input type="color" value={c} onChange={e => {
                            const arr = [...(concept.paleta ?? [])]
                            arr[i] = e.target.value
                            setConcept(cp => ({ ...cp, paleta: arr }))
                          }} className="w-10 h-10 rounded-lg border border-[#e5e7eb] cursor-pointer" />
                          <span className="text-[9px] text-[#9ca3af] font-mono">{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI Images */}
                <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6 space-y-3">
                  <p className={SL} style={SS}>Imagens IA (DALL-E)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(concept.imagensIA ?? []).map((url, i) => (
                      <div key={i} className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-32 object-cover rounded-xl border border-[#e5e7eb]" />
                        <button onClick={() => removeImg('imagensIA', i)}
                          className="absolute top-1 right-1 w-6 h-6 bg-white/90 rounded-full text-xs text-red-400 hidden group-hover:flex items-center justify-center shadow-sm">✕</button>
                      </div>
                    ))}
                    {(concept.imagensIA ?? []).length === 0 && (
                      <p className="text-xs text-[#9ca3af] col-span-2">Nenhuma imagem gerada ainda.</p>
                    )}
                  </div>
                </div>

                {/* OTELIE images */}
                <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6 space-y-3">
                  <p className={SL} style={SS}>Imagens da equipe OTELIE</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(concept.imagensOtelie ?? []).map((url, i) => (
                      <div key={i} className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-32 object-cover rounded-xl border border-[#e5e7eb]" />
                        <button onClick={() => removeImg('imagensOtelie', i)}
                          className="absolute top-1 right-1 w-6 h-6 bg-white/90 rounded-full text-xs text-red-400 hidden group-hover:flex items-center justify-center shadow-sm">✕</button>
                      </div>
                    ))}
                  </div>
                  <label className="flex items-center justify-center gap-2 border border-dashed border-[#e5e7eb] rounded-xl py-3 cursor-pointer hover:border-[#D1A23A]/40 transition-colors">
                    <input type="file" accept="image/*" onChange={uploadImagem} className="hidden" multiple />
                    <span className="text-sm text-[#6b7280]">+ Adicionar imagem da equipe</span>
                  </label>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button onClick={salvar} disabled={saving}
                    className="flex-1 py-3 border border-[#e5e7eb] rounded-xl text-sm text-[#6b7280] font-medium hover:bg-[#f8f9fb] transition-colors disabled:opacity-40">
                    {saving ? 'Salvando…' : 'Salvar rascunho'}
                  </button>
                  <button onClick={publicar} disabled={saving}
                    className="flex-1 py-3 bg-[#1a1a1a] text-white rounded-xl text-sm font-semibold hover:bg-[#333333] transition-colors disabled:opacity-40">
                    {concept.status === 'published' ? 'Republicar' : 'Publicar para cliente'}
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-[#e5e7eb] p-12 text-center">
                <p className="text-sm text-[#9ca3af]">Clique em "Gerar concept" para começar.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
