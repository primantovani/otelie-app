import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import ProfileMenu from '@/components/ProfileMenu'
import Logo from '@/components/Logo'

const BASE = process.env.BLOB_PUBLIC_BASE_URL ?? 'https://hcnovzg9eq621g2w.public.blob.vercel-storage.com'

const orcMap: Record<string, string> = {
  'ate50k': 'Até R$ 50k',
  '50k-150k': 'R$ 50k – 150k',
  '150k-300k': 'R$ 150k – 300k',
  'acima300k': 'Acima de R$ 300k',
}
const prazoMap: Record<string, string> = {
  'urgente': 'Urgente (< 1 mês)',
  '1-3-meses': '1 a 3 meses',
  '3-6-meses': '3 a 6 meses',
  'sem-prazo': 'Sem prazo definido',
}
const fotoLabels: Record<string, string> = {
  fachada: 'Fachada / Entrada',
  int_fundo: 'Interior → fundo',
  int_frente: 'Interior → entrada',
  lat_esq: 'Lateral esquerda',
  lat_dir: 'Lateral direita',
  detalhes: 'Detalhes',
}

async function getBriefingData(id: string) {
  try {
    const res = await fetch(`${BASE}/briefings/${id}/data.json`, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function getConceptStatus(id: string): Promise<'published' | 'draft' | 'none'> {
  try {
    const res = await fetch(`${BASE}/concepts/${id}/concept.json`, { next: { revalidate: 60 } })
    if (!res.ok) return 'none'
    const data = await res.json()
    return data.status === 'published' ? 'published' : 'draft'
  } catch {
    return 'none'
  }
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

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params
  const data = await getBriefingData(id)

  if (!data) notFound()

  // ensure this briefing belongs to the logged-in user (admins can see all)
  const isAdmin = (session.user as { isAdmin?: boolean })?.isAdmin ?? false
  if (!isAdmin && data.userEmail !== session.user.email) notFound()

  const email = session.user.email ?? ''
  const ne = data.necessidades ?? {}
  const ex = data.existente ?? {}
  const fotoUrls: Record<string, string> = data.fotoUrls ?? {}
  const conceptStatus = await getConceptStatus(id)

  const createdAt = data.createdAt ? new Date(data.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  }) : null

  return (
    <div className="min-h-screen bg-[#f8f9fb] px-4 py-10">
      <div className="max-w-lg mx-auto space-y-5">
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

        {/* Back link */}
        <Link
          href="/meu-projeto"
          className="flex items-center gap-1.5 text-xs text-[#6b7280] hover:text-[#1a1a1a] transition-colors w-fit"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Meus projetos
        </Link>

        {/* Title card */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-mono text-[#9ca3af]">{id}</p>
              <h1 className="text-base font-semibold text-[#1a1a1a] mt-0.5">
                {ne.nomeMarca || ne.tipoUso || 'Projeto'}
              </h1>
              {createdAt && (
                <p className="text-xs text-[#9ca3af] mt-0.5">Solicitado em {createdAt}</p>
              )}
            </div>
            {conceptStatus === 'published' ? (
              <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D1A23A]/10 text-[#D1A23A]">
                Concept pronto
              </span>
            ) : (
              <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                Em andamento
              </span>
            )}
          </div>

          {conceptStatus === 'published' && (
            <Link
              href={`/meu-projeto/concept/${id}`}
              className="mt-4 flex items-center justify-between w-full px-4 py-3 bg-[#D1A23A] rounded-xl text-white text-sm font-medium hover:bg-[#a07d2e] transition-colors"
            >
              <span>Ver meu concept</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          )}
        </div>

        {/* Necessidades */}
        <Section title="Sobre o projeto">
          <FieldGrid>
            <Field label="Tipo de espaço" value={ne.tipoUso} />
            <Field label="Marca / Nome" value={ne.nomeMarca} />
            <Field label="Orçamento" value={orcMap[ne.orcamento] ?? ne.orcamento} />
            <Field label="Prazo" value={prazoMap[ne.prazo] ?? ne.prazo} />
            <Field label="Rede social" value={ne.redeSocial} />
            <Field
              label="Primeira unidade"
              value={ne.primeiraUnidade === 'sim' ? 'Sim' : ne.primeiraUnidade === 'nao' ? 'Não' : undefined}
            />
          </FieldGrid>
          {ne.perfilPublico?.length > 0 && (
            <div>
              <p className="text-[11px] text-[#9ca3af] mb-1.5">Perfil do público</p>
              <div className="flex flex-wrap gap-1.5">
                {(ne.perfilPublico as string[]).map(p => (
                  <span key={p} className="text-xs px-2 py-0.5 bg-[#f3f4f6] rounded-full text-[#374151]">{p}</span>
                ))}
              </div>
            </div>
          )}
          {ne.palavrasChave?.length > 0 && (
            <div>
              <p className="text-[11px] text-[#9ca3af] mb-1.5">Conceito desejado</p>
              <div className="flex flex-wrap gap-1.5">
                {(ne.palavrasChave as string[]).map(p => (
                  <span key={p} className="text-xs px-2 py-0.5 bg-[#D1A23A]/10 text-[#a07d2e] rounded-full">{p}</span>
                ))}
              </div>
            </div>
          )}
          {ne.restricoes && (
            <div>
              <p className="text-[11px] text-[#9ca3af] mb-0.5">Restrições</p>
              <p className="text-sm text-[#1a1a1a]">{ne.restricoes}</p>
            </div>
          )}
          <Field label="Capacidade" value={ne.capacidade ? `${ne.capacidade} pessoas` : undefined} />
        </Section>

        {/* Espaço existente */}
        {(ex.area || ex.comprimento || ex.alturaPeDireito || ex.pisoTipo) && (
          <Section title="Levantamento do espaço">
            <FieldGrid>
              {ex.area && <Field label="Área" value={`${ex.area} m²`} />}
              {ex.comprimento && ex.largura && (
                <Field label="Dimensões" value={`${ex.largura} × ${ex.comprimento} m`} />
              )}
              {ex.alturaPeDireito && (
                <Field
                  label="Pé-direito"
                  value={`${ex.alturaPeDireito} m${ex.peDireito ? ` (${ex.peDireito})` : ''}`}
                />
              )}
            </FieldGrid>
            {(ex.pisoTipo || ex.paredeTipo || ex.tetoTipo) && (
              <div>
                <p className="text-[11px] text-[#9ca3af] mb-1.5">Acabamentos</p>
                <div className="flex flex-wrap gap-1.5">
                  {ex.pisoTipo && (
                    <span className="text-xs px-2 py-0.5 bg-[#f3f4f6] rounded-full text-[#374151]">Piso: {ex.pisoTipo}</span>
                  )}
                  {ex.paredeTipo && (
                    <span className="text-xs px-2 py-0.5 bg-[#f3f4f6] rounded-full text-[#374151]">Paredes: {ex.paredeTipo}</span>
                  )}
                  {ex.tetoTipo && (
                    <span className="text-xs px-2 py-0.5 bg-[#f3f4f6] rounded-full text-[#374151]">Teto: {ex.tetoTipo}</span>
                  )}
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
                    <img
                      src={url}
                      alt={fotoLabels[cat] ?? cat}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <p className="text-[10px] text-[#6b7280] mt-1 truncate">{fotoLabels[cat] ?? cat}</p>
                </a>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}
