import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

const BASE         = process.env.BLOB_PUBLIC_BASE_URL ?? 'https://hcnovzg9eq621g2w.public.blob.vercel-storage.com'
const NOTION_TOKEN = process.env.NOTION_TOKEN!
const DB_ID        = process.env.NOTION_DATABASE_ID!
const NOTION_HDR   = { 'Authorization': `Bearer ${NOTION_TOKEN}`, 'Notion-Version': '2022-06-28' }

// known photo categories, same as solicitar-projeto
const FOTO_CATS = ['fachada', 'int_fundo', 'int_frente', 'lat_esq', 'lat_dir', 'detalhes']
const FOTO_LABELS: Record<string, string> = {
  fachada: 'Fachada / Entrada', int_fundo: 'Interior → fundo',
  int_frente: 'Interior → entrada', lat_esq: 'Lateral esquerda',
  lat_dir: 'Lateral direita', detalhes: 'Detalhes',
}

// parse "Label: value" blocks from Notion page into a flat map
async function parseNotionBlocks(notionPageId: string): Promise<Record<string, string>> {
  const res = await fetch(
    `https://api.notion.com/v1/blocks/${notionPageId}/children?page_size=100`,
    { headers: NOTION_HDR, cache: 'no-store' },
  )
  if (!res.ok) return {}
  const data = await res.json()
  const map: Record<string, string> = {}
  for (const block of data.results ?? []) {
    const text: string = block?.paragraph?.rich_text?.map((r: any) => r.plain_text ?? r.text?.content ?? '').join('') ?? ''
    const m = text.match(/^([^:]+):\s*(.+)$/)
    if (m) map[m[1].trim().toLowerCase()] = m[2].trim()
  }
  return map
}

// find the Notion page ID for a given OT ID by querying the database
async function findNotionPageId(otId: string): Promise<string | null> {
  try {
    // search by title containing the OT ID
    const res = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
      method: 'POST',
      headers: { ...NOTION_HDR, 'Content-Type': 'application/json' },
      body: JSON.stringify({ filter: { property: 'Name', title: { contains: otId } }, page_size: 1 }),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.results?.[0]?.id ?? null
  } catch {
    return null
  }
}

// probe blob for each known photo category
async function probeFotoUrls(id: string): Promise<Record<string, string>> {
  const results = await Promise.all(
    FOTO_CATS.map(async cat => {
      const url = `${BASE}/briefings/${id}/${cat}.jpg`
      const r = await fetch(url, { method: 'HEAD', cache: 'no-store' }).catch(() => null)
      return r?.ok ? [cat, url] as const : null
    }),
  )
  return Object.fromEntries(results.filter(Boolean) as [string, string][])
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const nid = req.nextUrl.searchParams.get('nid') // Notion page ID passed from admin UI

  // 1. Try blob data.json first (new briefings)
  try {
    const res = await fetch(`${BASE}/briefings/${id}/data.json`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      return NextResponse.json({ exists: true, ...data })
    }
  } catch { /* fall through */ }

  // 2. Reconstruct from Notion blocks (old briefings without data.json)
  try {
    const pageId = nid || await findNotionPageId(id)
    if (!pageId) return NextResponse.json({ exists: false })

    const [fields, fotoUrls] = await Promise.all([
      parseNotionBlocks(pageId),
      probeFotoUrls(id),
    ])

    const userEmail = fields['cliente'] || null

    const necessidades: Record<string, unknown> = {
      tipoUso:         fields['tipo de uso']      || '',
      nomeMarca:       fields['marca']             || '',
      redeSocial:      fields['rede social']       || '',
      primeiraUnidade: fields['primeira unidade'] === 'Sim' ? 'sim' : fields['primeira unidade'] === 'Não' ? 'nao' : '',
      perfilPublico:   fields['perfil do público'] ? fields['perfil do público'].split(',').map(s => s.trim()) : [],
      capacidade:      fields['capacidade']        || '',
      palavrasChave:   fields['conceito desejado'] ? fields['conceito desejado'].split(',').map(s => s.trim()) : [],
      orcamento:       fields['orçamento']         || '',
      prazo:           fields['prazo']             || '',
      restricoes:      fields['restrições']        || '',
    }

    const areaMatch  = (fields['área'] || '').match(/^([\d.]+)/)
    const dimsMatch  = (fields['dimensões'] || '').match(/([\d.]+)\s*×\s*([\d.]+)/)
    const peMatch    = (fields['pé-direito'] || '').match(/^([\d.]+)/)

    const existente: Record<string, unknown> = {
      area:            areaMatch  ? parseFloat(areaMatch[1])  : undefined,
      largura:         dimsMatch  ? parseFloat(dimsMatch[1])  : undefined,
      comprimento:     dimsMatch  ? parseFloat(dimsMatch[2])  : undefined,
      alturaPeDireito: peMatch    ? parseFloat(peMatch[1])    : undefined,
      pisoTipo:        fields['piso']     || '',
      paredeTipo:      fields['paredes']  || '',
      tetoTipo:        fields['teto']     || '',
    }

    return NextResponse.json({
      exists: true,
      id,
      userEmail,
      necessidades,
      existente,
      fotoUrls,
      _reconstructed: true,
    })
  } catch {
    return NextResponse.json({ exists: false })
  }
}
