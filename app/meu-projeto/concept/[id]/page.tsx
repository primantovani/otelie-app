import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'

type ConceptData = {
  titulo?: string; subtitulo?: string; atmosfera?: string
  paleta?: string[]; paletaDescricao?: string; materiais?: string
  iluminacao?: string; layout?: string; mobiliario?: string
  diferenciais?: string; imagensIA?: string[]; imagensOtelie?: string[]
  status?: string; lang?: string
}

async function getConcept(id: string): Promise<ConceptData | null> {
  try {
    const res = await fetch(
      `${process.env.BLOB_PUBLIC_BASE_URL ?? 'https://hcnovzg9eq621g2w.public.blob.vercel-storage.com'}/concepts/${id}/concept.json`,
      { next: { revalidate: 60 } },
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 'published') return null
    return data
  } catch {
    return null
  }
}

const SS = { fontFamily: 'var(--font-mono, Inter, sans-serif)' }

export default async function ClientConceptPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params
  const concept = await getConcept(id)
  if (!concept) notFound()

  const allImages = [...(concept.imagensIA ?? []), ...(concept.imagensOtelie ?? [])]

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      {/* Hero */}
      <div className="bg-[#1a1a1a] text-white px-6 pt-10 pb-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Logo size="sm" className="opacity-90" />
            <Link href="/meu-projeto" className="text-xs text-white/50 hover:text-white/80 transition-colors">
              ← Meus projetos
            </Link>
          </div>
          <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#D1A23A] mb-2" style={SS}>Concept</p>
          <h1 className="text-3xl font-bold leading-tight">{concept.titulo}</h1>
          {concept.subtitulo && (
            <p className="text-white/60 mt-2 text-base">{concept.subtitulo}</p>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Atmosfera */}
        {concept.atmosfera && (
          <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#D1A23A] mb-3" style={SS}>Atmosfera</p>
            <p className="text-sm text-[#374151] leading-relaxed">{concept.atmosfera}</p>
          </div>
        )}

        {/* Palette */}
        {(concept.paleta ?? []).length > 0 && (
          <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#D1A23A] mb-4" style={SS}>Paleta de cores</p>
            <div className="flex gap-3 mb-3">
              {concept.paleta!.map((hex, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div className="w-12 h-12 rounded-xl border border-black/10 shadow-sm" style={{ background: hex }} />
                  <span className="text-[10px] text-[#9ca3af] font-mono">{hex}</span>
                </div>
              ))}
            </div>
            {concept.paletaDescricao && (
              <p className="text-sm text-[#374151] leading-relaxed">{concept.paletaDescricao}</p>
            )}
          </div>
        )}

        {/* Images */}
        {allImages.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#D1A23A] px-1" style={SS}>Imagens do concept</p>
            <div className="grid grid-cols-2 gap-3">
              {allImages.map((url, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={i}
                  src={url}
                  alt=""
                  className={`w-full object-cover rounded-2xl border border-[#e5e7eb] ${i === 0 ? 'col-span-2 h-56' : 'h-36'}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-1 gap-4">
          {[
            ['Materiais', concept.materiais],
            ['Iluminação', concept.iluminacao],
            ['Layout', concept.layout],
            ['Mobiliário', concept.mobiliario],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label as string} className="bg-white rounded-2xl border border-[#e5e7eb] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#D1A23A] mb-2" style={SS}>{label}</p>
              <p className="text-sm text-[#374151] leading-relaxed">{value}</p>
            </div>
          ))}
        </div>

        {/* Diferenciais */}
        {concept.diferenciais && (
          <div className="bg-[#1a1a1a] rounded-2xl p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#D1A23A] mb-3" style={SS}>Diferenciais do projeto</p>
            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">{concept.diferenciais}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-[10px] text-[#9ca3af] tracking-widest uppercase" style={SS}>OTELIE · Design de Interiores</p>
        </div>
      </div>
    </div>
  )
}
