import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProfileMenu from '@/components/ProfileMenu'
import Logo from '@/components/Logo'
import { queryDatabase } from '@/lib/notion'

async function getBriefings(email: string) {
  try {
    return await queryDatabase(
      { property: 'Email', email: { equals: email } },
      [{ timestamp: 'created_time', direction: 'descending' }],
    )
  } catch {
    return []
  }
}

async function getConceptIfPublished(id: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${process.env.BLOB_PUBLIC_BASE_URL ?? 'https://hcnovzg9eq621g2w.public.blob.vercel-storage.com'}/concepts/${id}/concept.json`,
      { next: { revalidate: 60 } },
    )
    if (!res.ok) return false
    const data = await res.json()
    return data.status === 'published'
  } catch {
    return false
  }
}

export default async function MeuProjetoPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const email   = session.user.email ?? ''
  const isAdmin = (session.user as { isAdmin?: boolean })?.isAdmin ?? false
  const briefings = await getBriefings(email)

  const rows = await Promise.all(
    briefings.map(async (b: any) => {
      const title   = b.properties?.Name?.title?.[0]?.plain_text ?? 'Projeto'
      const created = new Date(b.created_time).toLocaleDateString('pt-BR')
      const otId    = title.match(/^(OT-\d{8}-[A-Z0-9]+)/)?.[1] ?? null
      const hasPublishedConcept = otId ? await getConceptIfPublished(otId) : false
      return { id: b.id, title, created, otId, hasPublishedConcept }
    }),
  )

  return (
    <div className="min-h-screen bg-[#f8f9fb] px-4 py-10">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Logo size="sm" />
          <ProfileMenu
            name={session.user.name ?? null}
            email={email}
            image={session.user.image ?? null}
            isAdmin={isAdmin}
          />
        </div>

        {/* Briefings */}
        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e5e7eb] px-8 py-12 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#f3f4f6] flex items-center justify-center mx-auto">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="2" width="14" height="14" rx="2.5" stroke="#9ca3af" strokeWidth="1.4"/>
                <path d="M5.5 6.5h7M5.5 9h7M5.5 11.5h4" stroke="#9ca3af" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-[#1a1a1a]">Nenhum projeto ainda</p>
            <p className="text-xs text-[#6b7280]">Solicite seu concept inicial para começar.</p>
            <a href="/" className="inline-block mt-2 text-xs font-medium text-[#D1A23A] hover:underline">
              Iniciar briefing →
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map(row => (
              <div key={row.id} className="bg-white rounded-2xl border border-[#e5e7eb] px-5 py-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#1a1a1a]">{row.title}</p>
                    <p className="text-xs text-[#9ca3af] mt-0.5">{row.created}</p>
                  </div>
                  {row.hasPublishedConcept ? (
                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D1A23A]/10 text-[#D1A23A]">Concept pronto</span>
                  ) : (
                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Em andamento</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={row.otId ? `/meu-projeto/pedido/${row.otId}` : `/meu-projeto/pedido/n/${row.id}`}
                    className="flex items-center justify-center gap-1.5 flex-1 px-4 py-2.5 border border-[#e5e7eb] rounded-xl text-[#374151] text-xs font-medium hover:bg-[#f3f4f6] transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                      <path d="M4 5h6M4 7h6M4 9h3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                    Ver detalhes
                  </Link>
                  {row.hasPublishedConcept && row.otId && (
                    <Link
                      href={`/meu-projeto/concept/${row.otId}`}
                      className="flex items-center justify-between flex-1 px-4 py-2.5 bg-[#D1A23A] rounded-xl text-white text-xs font-medium hover:bg-[#a07d2e] transition-colors"
                    >
                      <span>Ver concept</span>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7h9M8 3.5l3.5 3.5L8 10.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
