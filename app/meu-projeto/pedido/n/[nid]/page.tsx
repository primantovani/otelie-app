import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'

const NOTION_TOKEN = process.env.NOTION_TOKEN!
const NOTION_HDR = {
  'Authorization': `Bearer ${NOTION_TOKEN}`,
  'Notion-Version': '2022-06-28',
}
const BASE = process.env.BLOB_PUBLIC_BASE_URL ?? 'https://hcnovzg9eq621g2w.public.blob.vercel-storage.com'

const FOTO_CATS = ['fachada', 'int_fundo', 'int_frente', 'lat_esq', 'lat_dir', 'detalhes']
const FOTO_LABELS: Record<string, string> = {
  fachada: 'Fachada / Entrada', int_fundo: 'Interior → fundo',
  int_frente: 'Interior → entrada', lat_esq: 'Lateral esquerda',
  lat_dir: 'Lateral direita', detalhes: 'Detalhes',
}
const orcMap: Record<string, string> = {
  'ate50k': 'Até R$ 50k', '50k-150k': 'R$ 50k – 150k',
  '150k-300k': 'R$ 150k – 300k', 'acima300k': 'Acima de R$ 300k',
}

async function getNotionPage(nid: string) {
  const res = await fetch(`https://api.notion.com/v1/pages/${nid}`, {
    headers: NOTION_HDR, cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

async function parseNotionBlocks(nid: string): Promise<Record<string, string>> {
  const res = await fetch(`https://api.notion.com/v1/blocks/${nid}/children?page_size=100`, {
    headers: NOTION_HDR, cache: 'no-store',
  })
  if (!res.ok) return {}
  const data = await res.json()
  const map: Record<string, string> = {}
  for (const block of data.results ?? []) {
    const text: string = block?.paragraph?.rich_text
      ?.map((r: any) => r.plain_text ?? r.text?.content ?? '').join('') ?? ''
    const m = text.match(/^([^:]+):\s*(.+)$/)
    if (m) map[m[1].trim().toLowerCase()] = m[2].trim()
  }
  return map
}

async function probeFotoUrls(otId: string): Promise<Record<string, string>> {
  const results = await Promise.all(
    FOTO_CATS.map(async cat => {
      const url = `${BASE}/briefings/${otId}/${cat}.jpg`
      const r = await fetch(url, { method: 'HEAD', cache: 'no-store' }).catch(() => null)
      return r?.ok ? [cat, url] as const : null
    }),
  )
  return Object.fromEntries(results.filter(Boolean) as [string, string][])
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e5e7eb] px-6 py-5 space-y-4">
      <h2 className="text-xs font-bold uppercase tracking-widest text-[#9ca3af]">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[11px] text-[#9ca3af] mb-0.5">{label}</p>
      <p className="text-sm text-[#1a1a1a]">{value}</p>
    </div>
  )
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>
}

export default async function PedidoNotionFallback({ params }: { params: Promise<{ nid: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { nid } = await params
  const page = await getNotionPage(nid)
  if (!page) notFound()

  const pageEmail = page.properties?.Email?.email ?? null
  const isAdmin = (session.user as { isAdmin?: boolean })?.isAdmin ?? false
  if (!isAdmin && pageEmail !== session.user.email) notFound()

  const title: string = page.properties?.Name?.title?.[0]?.plain_text ?? ''
  const otId = title.match(/^(OT-\d{8}-[A-Za-z0-9]+)/i)?.[1] ?? null

  // redirect to blob-based page if data.json exists
  if (otId) {
    try {
      const check = await fetch(`${BASE}/briefings/${otId}/data.json`, { method: 'HEAD', cache: 'no-store' })
      if (check.ok) redirect(`/meu-projeto/pedido/${otId}`)
    } catch { /* fall through */ }
  }

  // parse Notion blocks and probe photos in parallel
  const [fields, fotoUrls] = await Promise.all([
    parseNotionBlocks(nid),
    otId ? probeFotoUrls(otId) : Promise.resolve({} as Record<string, string>),
  ])

  const created = new Date(page.created_time).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const area      = fields['área']?.match(/^([\d.]+)/)?.[1]
  const dims      = fields['dimensões']?.match(/([\d.]+)\s*[×x]\s*([\d.]+)/)
  const pe        = fields['pé-direito']
  const orcamento = orcMap[fields['orçamento']] ?? fields['orçamento']
  const prazo     = fields['prazo']
  const marca     = fields['marca']
  const tipoUso   = fields['tipo de uso']
  const perfil    = fields['perfil do público']
  const conceito  = fields['conceito desejado']
  const restricoes = fields['restrições']
  const capacidade = fields['capacidade']
  const piso      = fields['piso']
  const paredes   = fields['paredes']
  const teto      = fields['teto']

  const hasSpaceData = area || dims || pe || piso || paredes || teto
  const hasProjectData = tipoUso || marca || orcamento || prazo || perfil || conceito

  return (
    <div className="min-h-screen bg-[#f8f9fb] px-4 py-10">
      <div className="max-w-lg mx-auto space-y-5">
        <a href="/meu-projeto" className="flex items-center gap-1.5 text-xs text-[#6b7280] hover:text-[#1a1a1a] transition-colors w-fit">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Meus projetos
        </a>

        {/* Title card */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] px-6 py-5 space-y-2">
          {otId && <p className="text-[11px] font-mono text-[#9ca3af]">{otId}</p>}
          <h1 className="text-base font-semibold text-[#1a1a1a]">{marca || tipoUso || title || 'Projeto'}</h1>
          <p className="text-xs text-[#9ca3af]">Solicitado em {created}</p>
          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Em andamento</span>
        </div>

        {/* Sobre o projeto */}
        {hasProjectData && (
          <Section title="Sobre o projeto">
            <FieldGrid>
              <Field label="Tipo de espaço" value={tipoUso} />
              <Field label="Marca / Nome" value={marca} />
              <Field label="Orçamento" value={orcamento} />
              <Field label="Prazo" value={prazo} />
              <Field label="Capacidade" value={capacidade ? `${capacidade} pessoas` : undefined} />
            </FieldGrid>
            {perfil && (
              <div>
                <p className="text-[11px] text-[#9ca3af] mb-1.5">Perfil do público</p>
                <div className="flex flex-wrap gap-1.5">
                  {perfil.split(',').map(p => (
                    <span key={p} className="text-xs px-2 py-0.5 bg-[#f3f4f6] rounded-full text-[#374151]">{p.trim()}</span>
                  ))}
                </div>
              </div>
            )}
            {conceito && (
              <div>
                <p className="text-[11px] text-[#9ca3af] mb-1.5">Conceito desejado</p>
                <div className="flex flex-wrap gap-1.5">
                  {conceito.split(',').map(p => (
                    <span key={p} className="text-xs px-2 py-0.5 bg-[#D1A23A]/10 text-[#a07d2e] rounded-full">{p.trim()}</span>
                  ))}
                </div>
              </div>
            )}
            {restricoes && (
              <div>
                <p className="text-[11px] text-[#9ca3af] mb-0.5">Restrições</p>
                <p className="text-sm text-[#1a1a1a]">{restricoes}</p>
              </div>
            )}
          </Section>
        )}

        {/* Levantamento do espaço */}
        {hasSpaceData && (
          <Section title="Levantamento do espaço">
            <FieldGrid>
              {area && <Field label="Área" value={`${area} m²`} />}
              {dims && <Field label="Dimensões" value={`${dims[1]} × ${dims[2]} m`} />}
              {pe && <Field label="Pé-direito" value={pe} />}
            </FieldGrid>
            {(piso || paredes || teto) && (
              <div>
                <p className="text-[11px] text-[#9ca3af] mb-1.5">Acabamentos</p>
                <div className="flex flex-wrap gap-1.5">
                  {piso && <span className="text-xs px-2 py-0.5 bg-[#f3f4f6] rounded-full text-[#374151]">Piso: {piso}</span>}
                  {paredes && <span className="text-xs px-2 py-0.5 bg-[#f3f4f6] rounded-full text-[#374151]">Paredes: {paredes}</span>}
                  {teto && <span className="text-xs px-2 py-0.5 bg-[#f3f4f6] rounded-full text-[#374151]">Teto: {teto}</span>}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Fotos */}
        {Object.keys(fotoUrls).length > 0 && (
          <Section title="Fotos enviadas">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(fotoUrls).map(([cat, url]) => (
                <a key={cat} href={url} target="_blank" rel="noopener noreferrer" className="group block">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-[#f3f4f6]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={FOTO_LABELS[cat] ?? cat} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                  </div>
                  <p className="text-[10px] text-[#6b7280] mt-1 truncate">{FOTO_LABELS[cat] ?? cat}</p>
                </a>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}
