import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import ProfileMenu from '@/components/ProfileMenu'
import AdminBriefingCards from '@/components/AdminBriefingCards'
import Logo from '@/components/Logo'
import { queryDatabase } from '@/lib/notion'

async function getAllBriefings() {
  try {
    return await queryDatabase(
      undefined,
      [{ timestamp: 'created_time', direction: 'descending' }],
    )
  } catch {
    return []
  }
}

async function getOtIdFromBlocks(notionPageId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.notion.com/v1/blocks/${notionPageId}/children?page_size=10`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
        },
        cache: 'no-store',
      },
    )
    if (!res.ok) return null
    const data = await res.json()
    for (const block of data.results ?? []) {
      const text: string = block?.paragraph?.rich_text?.[0]?.text?.content ?? ''
      const match = text.match(/^ID:\s*(OT-\d{8}-[A-Z0-9]+)/)
      if (match) return match[1]
    }
    return null
  } catch {
    return null
  }
}

async function getConceptStatus(id: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${process.env.BLOB_PUBLIC_BASE_URL ?? 'https://hcnovzg9eq621g2w.public.blob.vercel-storage.com'}/concepts/${id}/concept.json`,
      { next: { revalidate: 30 } },
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.status ?? 'draft'
  } catch {
    return null
  }
}

export default async function AdminPage() {
  const session = await auth()
  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin
  if (!isAdmin) redirect('/meu-projeto')

  const briefings = await getAllBriefings()

  // extract OT IDs and fetch concept statuses in parallel
  const rows = await Promise.all(
    briefings.map(async (b: any) => {
      const rawTitle = b.properties?.Name?.title?.[0]?.plain_text ?? ''
      const email    = b.properties?.Email?.email ?? '—'
      const created  = new Date(b.created_time).toLocaleString('pt-BR')
      const otIdFromTitle = rawTitle.match(/^(OT-\d{8}-[A-Z0-9]+)/)?.[1] ?? null
      const otId     = otIdFromTitle ?? await getOtIdFromBlocks(b.id)
      // display name: extract everything after "OT-XXXX — ", or fall back to raw title
      const title    = rawTitle.replace(/^OT-\d{8}-[A-Z0-9]+ — /, '').trim() || rawTitle || 'Sem nome'
      const conceptStatus = otId ? await getConceptStatus(otId) : null
      return { id: b.id, title, email, created, otId, conceptStatus, rawTitle }
    }),
  )

  const SS = { fontFamily: 'var(--font-mono, Inter, sans-serif)' }

  return (
    <div className="min-h-screen bg-[#f8f9fb] px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Logo size="sm" />
            <p className="text-xs text-[#6b7280] font-medium">Briefings recebidos</p>
          </div>
          <ProfileMenu
            name={session?.user?.name ?? null}
            email={session?.user?.email ?? null}
            image={session?.user?.image ?? null}
            isAdmin={true}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-[#e5e7eb] px-4 py-3">
            <p className="text-xs text-[#6b7280]">Total</p>
            <p className="text-2xl font-bold text-[#1a1a1a]">{rows.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-[#e5e7eb] px-4 py-3">
            <p className="text-xs text-[#6b7280]">Publicados</p>
            <p className="text-2xl font-bold text-[#D1A23A]">{rows.filter(r => r.conceptStatus === 'published').length}</p>
          </div>
          <div className="bg-white rounded-xl border border-[#e5e7eb] px-4 py-3">
            <p className="text-xs text-[#6b7280]">Pendentes</p>
            <p className="text-2xl font-bold text-amber-500">{rows.filter(r => !r.conceptStatus).length}</p>
          </div>
        </div>

        {/* List */}
        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e5e7eb] px-8 py-12 text-center">
            <p className="text-sm text-[#6b7280]">Nenhum briefing recebido ainda.</p>
          </div>
        ) : (
          <AdminBriefingCards rows={rows} />
        )}
      </div>
    </div>
  )
}
