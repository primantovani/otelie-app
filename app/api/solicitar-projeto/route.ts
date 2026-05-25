import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'
import { put } from '@vercel/blob'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const DB_ID  = process.env.NOTION_DATABASE_ID!

function txt(content: string) {
  return { object: 'block' as const, type: 'paragraph' as const, paragraph: { rich_text: [{ type: 'text' as const, text: { content } }] } }
}
function h2(content: string) {
  return { object: 'block' as const, type: 'heading_2' as const, heading_2: { rich_text: [{ type: 'text' as const, text: { content } }] } }
}
function row(label: string, value: string) {
  return txt(`${label}: ${value || '—'}`)
}
function link(label: string, url: string) {
  return { object: 'block' as const, type: 'paragraph' as const, paragraph: { rich_text: [{ type: 'text' as const, text: { content: `${label}: `, } }, { type: 'text' as const, text: { content: 'Ver foto →', link: { url } } }] } }
}

export async function POST(req: NextRequest) {
  try {
    const session  = await auth()
    const userEmail = session?.user?.email ?? null
    const body = await req.json()

    const createdAt = new Date()
    const datePart  = createdAt.toISOString().slice(0, 10).replace(/-/g, '')
    const randPart  = Math.random().toString(36).slice(2, 6).toUpperCase()
    const id        = `OT-${datePart}-${randPart}`
    const ex        = body.existente    ?? {}
    const ne        = body.necessidades ?? {}
    const fotosCats = (body.fotosCategories ?? []) as string[]
    const fotosB64  = (body.fotosBase64 ?? {}) as Record<string, string>

    const orcMap: Record<string, string> = {
      'ate50k': 'Até R$ 50k', '50k-150k': 'R$ 50k – 150k',
      '150k-300k': 'R$ 150k – 300k', 'acima300k': 'Acima de R$ 300k',
    }
    const prazoMap: Record<string, string> = {
      'urgente': 'Urgente (< 1 mês)', '1-3-meses': '1 a 3 meses',
      '3-6-meses': '3 a 6 meses', 'sem-prazo': 'Sem prazo definido',
    }
    const fotoLabels: Record<string, string> = {
      fachada: 'Fachada / Entrada', int_fundo: 'Interior → fundo',
      int_frente: 'Interior → entrada', lat_esq: 'Lateral esquerda',
      lat_dir: 'Lateral direita', detalhes: 'Detalhes',
    }

    // ── upload fotos para Vercel Blob ──────────────────────────────
    const fotoUrls: Record<string, string> = {}
    await Promise.all(
      Object.entries(fotosB64).map(async ([catId, b64]) => {
        const buffer = Buffer.from(b64, 'base64')
        const { url } = await put(`briefings/${id}/${catId}.jpg`, buffer, {
          access: 'public',
          contentType: 'image/jpeg',
          token: process.env.BLOB_PUBLIC_READ_WRITE_TOKEN,
        })
        fotoUrls[catId] = url
      })
    )

    const titulo = `${id} — ${ne.nomeMarca || ne.tipoUso || 'Briefing'}`
    const area   = ex.area ? `${ex.area} m²` : '—'
    const dims   = ex.comprimento && ex.largura ? `${ex.largura} × ${ex.comprimento} m` : '—'
    const pe     = ex.alturaPeDireito ? `${ex.alturaPeDireito} m (${ex.peDireito || ''})` : ex.peDireito || '—'
    const acab   = [ex.pisoTipo, ex.paredeTipo, ex.tetoTipo].filter(Boolean).join(' · ') || '—'
    const kws    = (ne.palavrasChave ?? []).join(', ') || '—'
    const perfil = (ne.perfilPublico ?? []).join(', ') || '—'
    const fotos  = fotosCats.map(c => fotoLabels[c] ?? c).join(', ') || '—'

    // ── blocos de imagem para o Notion ────────────────────────────
    const fotosBlocks = fotosCats.map(catId => {
      const url = fotoUrls[catId]
      if (!url) return row(fotoLabels[catId] ?? catId, '(sem foto)')
      return link(fotoLabels[catId] ?? catId, url)
    })

    await notion.pages.create({
      parent: { database_id: DB_ID },
      properties: {
        Name:  { title: [{ text: { content: titulo } }] },
        ...(userEmail ? { Email: { email: userEmail } } : {}),
      },
      children: [
        h2('Identificação'),
        row('ID', id),
        row('Data', createdAt.toLocaleString('pt-BR')),
        row('Cliente', userEmail ?? '—'),
        row('Status', 'Pendente'),
        txt(''),

        h2('Necessidades'),
        row('Tipo de uso', ne.tipoUso || '—'),
        row('Marca', ne.nomeMarca || '—'),
        row('Rede social', ne.redeSocial || '—'),
        row('Primeira unidade', ne.primeiraUnidade === 'sim' ? 'Sim' : ne.primeiraUnidade === 'nao' ? 'Não' : '—'),
        row('Perfil do público', perfil),
        row('Capacidade', ne.capacidade || '—'),
        row('Conceito desejado', kws),
        row('Orçamento', orcMap[ne.orcamento] ?? ne.orcamento ?? '—'),
        row('Prazo', prazoMap[ne.prazo] ?? ne.prazo ?? '—'),
        row('Restrições', ne.restricoes || '—'),
        txt(''),

        h2('Levantamento do espaço'),
        row('Área', area),
        row('Dimensões', dims),
        row('Pé-direito', pe),
        row('Piso', ex.pisoTipo || '—'),
        row('Paredes', ex.paredeTipo || '—'),
        row('Teto', ex.tetoTipo || '—'),
        row('Acabamentos', acab),
        txt(''),

        h2('Fotos do espaço'),
        row('Categorias enviadas', fotos),
        txt(''),
        ...fotosBlocks,
      ],
    })

    // save full briefing data as JSON for concept generation
    const briefingData = {
      id, createdAt: createdAt.toISOString(), userEmail,
      existente: ex, necessidades: ne,
      fotoUrls, // public blob URLs
    }
    await put(`briefings/${id}/data.json`, JSON.stringify(briefingData), {
      access: 'public', contentType: 'application/json',
      token: process.env.BLOB_PUBLIC_READ_WRITE_TOKEN,
    })

    console.log(`[solicitar-projeto] Notion card criado: ${titulo} (${id}), ${Object.keys(fotoUrls).length} foto(s) no Blob`)
    return NextResponse.json({ id, status: 'pendente', createdAt: createdAt.toISOString() })

  } catch (err) {
    console.error('[solicitar-projeto]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao solicitar projeto' },
      { status: 500 },
    )
  }
}
