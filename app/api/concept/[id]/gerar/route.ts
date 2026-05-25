import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { auth } from '@/auth'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const TOKEN  = process.env.BLOB_PUBLIC_READ_WRITE_TOKEN

const tipoLabels: Record<string, string> = {
  cafeteria: 'Cafeteria', restaurante: 'Small restaurant',
  sorveteria: 'Ice cream shop', bar: 'Bar',
}

type ImageMsg = { type: 'image_url'; image_url: { url: string; detail: 'low' | 'high' } }
type TextMsg  = { type: 'text'; text: string }

function imgUrl(url: string, detail: 'low' | 'high' = 'low'): ImageMsg {
  return { type: 'image_url', image_url: { url, detail } }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { briefing, lang = 'pt', imagensOtelie: existingOtelieImgs = [] } = await req.json()

  const ne = briefing.necessidades ?? {}
  const ex = briefing.existente   ?? {}

  const isPt   = lang === 'pt'
  const tipo   = tipoLabels[ne.tipoUso] ?? ne.tipoUso ?? 'commercial space'
  const marca  = ne.nomeMarca  ? `Brand: ${ne.nomeMarca}.` : ''
  const social = ne.redeSocial ? `Social: ${ne.redeSocial}.` : ''
  const kws    = (ne.palavrasChave ?? []).join(', ')
  const perfil = (ne.perfilPublico ?? []).join(', ')
  const area   = ex.area ? `${ex.area} m²` : ''
  const pe     = ex.alturaPeDireito ? `${ex.alturaPeDireito}m ceiling.` : ''

  // collect all photos available for vision analysis
  const clientPhotoUrls: string[] = Object.values(briefing.fotoUrls ?? {}) as string[]
  const oteliePhotoUrls: string[] = existingOtelieImgs as string[]
  const hasPhotos = clientPhotoUrls.length > 0 || oteliePhotoUrls.length > 0

  const systemPrompt = isPt
    ? `Você é um designer de interiores sênior da OTELIE, especializado em pequenos negócios. ${hasPhotos ? 'Analise cuidadosamente as fotos do espaço atual fornecidas — elas mostram as condições reais: estrutura, pé-direito, acabamentos, iluminação natural. Use o que vê para fundamentar cada decisão de projeto.' : ''} Escreva em português brasileiro, com tom profissional e inspirador. Seja específico e prático.`
    : `You are a senior interior designer at OTELIE, specialized in small businesses. ${hasPhotos ? 'Carefully analyze the space photos provided — they show real conditions: structure, ceiling height, finishes, natural light. Use what you observe to ground every design decision.' : ''} Write in English, professional and inspiring tone. Be specific and practical.`

  // build vision content array for the user message
  const visionContent: (TextMsg | ImageMsg)[] = []

  if (clientPhotoUrls.length > 0) {
    visionContent.push({
      type: 'text',
      text: `EXISTING SPACE PHOTOS (${clientPhotoUrls.length} photos from client survey — analyze the real conditions: structure, surfaces, light, proportions):`,
    })
    clientPhotoUrls.slice(0, 6).forEach(url => visionContent.push(imgUrl(url, 'high')))
  }

  if (oteliePhotoUrls.length > 0) {
    visionContent.push({
      type: 'text',
      text: `OTELIE TEAM REFERENCE IMAGES (${oteliePhotoUrls.length} images selected by the design team as direction/inspiration):`,
    })
    oteliePhotoUrls.slice(0, 4).forEach(url => visionContent.push(imgUrl(url, 'high')))
  }

  visionContent.push({
    type: 'text',
    text: `
Create a complete interior design concept for this ${tipo}.
${marca} ${social}
Space: ${area} ${pe}
Existing finishes — Floor: ${ex.pisoTipo || 'unknown'}, Walls: ${ex.paredeTipo || 'unknown'}, Ceiling: ${ex.tetoTipo || 'unknown'}
Style keywords: ${kws || 'not specified'}
Target audience: ${perfil || 'general'}
Budget: ${ne.orcamento || 'not specified'}
First location: ${ne.primeiraUnidade === 'sim' ? 'Yes' : 'No'}
${hasPhotos ? '\nIMPORTANT: Your recommendations must be grounded in the actual photos. Reference specific observed elements (e.g. "the existing concrete slab can be polished", "the brick wall should be highlighted"). Do not suggest changes that conflict with the visible fixed structure.' : ''}

Return a JSON object with these exact keys:
{
  "titulo": "short evocative concept title (4-6 words)",
  "subtitulo": "one line tagline",
  "atmosfera": "2-3 sentences describing the emotional atmosphere, referencing what you see in the photos",
  "paleta": ["#hex1","#hex2","#hex3","#hex4"],
  "paletaDescricao": "one sentence on the color story and how it relates to existing materials",
  "materiais": "2-3 sentences on materials — specify what to keep, transform or add based on what is visible",
  "iluminacao": "2-3 sentences on lighting — reference natural light sources visible in the photos",
  "layout": "2-3 sentences on spatial organization based on the real floor plan and dimensions",
  "mobiliario": "2-3 sentences on furniture adapted to the space proportions and brand",
  "diferenciais": "2 bullet points (max 20 words each) that make this concept unique for the brand",
  "dallePrompt": "Detailed English prompt for DALL-E 3 to generate a photorealistic interior render of this ${tipo} after the renovation. Include: specific materials observed (${ex.pisoTipo || 'floor'}, ${ex.paredeTipo || 'walls'}), lighting mood, color palette, furniture style, atmosphere. No people. Architectural photography style, 35mm lens."
}

Return only the JSON, no markdown.`,
  })

  // generate concept text via GPT-4o vision
  const textRes = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: hasPhotos ? visionContent : visionContent.filter(c => c.type === 'text') },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.8,
    max_tokens: 2000,
  })

  const concept = JSON.parse(textRes.choices[0].message.content ?? '{}')

  // generate DALL-E images — wide establishing shot
  const imageUrls: string[] = []
  try {
    const imgRes = await openai.images.generate({
      model: 'dall-e-3',
      prompt: concept.dallePrompt ?? `Photorealistic interior of a ${tipo}, ${kws}, warm lighting, architectural photography`,
      n: 1,
      size: '1792x1024',
      quality: 'hd',
    })
    const tempUrl = imgRes.data?.[0]?.url
    if (tempUrl) {
      const buf = await fetch(tempUrl).then(r => r.arrayBuffer())
      const { url } = await put(`concepts/${id}/img-1.jpg`, Buffer.from(buf), {
        access: 'public', contentType: 'image/jpeg', token: TOKEN,
      })
      imageUrls.push(url)
    }
  } catch (e) {
    console.error('[gerar-concept] DALL-E img1 error:', e)
  }

  // detail / materials shot
  try {
    const img2Res = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `${concept.dallePrompt ?? `Photorealistic interior of a ${tipo}`} — close-up detail shot highlighting materials, textures and lighting. No people. Architectural photography.`,
      n: 1,
      size: '1024x1024',
      quality: 'hd',
    })
    const tempUrl2 = img2Res.data?.[0]?.url
    if (tempUrl2) {
      const buf2 = await fetch(tempUrl2).then(r => r.arrayBuffer())
      const { url } = await put(`concepts/${id}/img-2.jpg`, Buffer.from(buf2), {
        access: 'public', contentType: 'image/jpeg', token: TOKEN,
      })
      imageUrls.push(url)
    }
  } catch (e) {
    console.error('[gerar-concept] DALL-E img2 error:', e)
  }

  const result = {
    ...concept,
    imagensIA: imageUrls,
    imagensOtelie: existingOtelieImgs, // preserve team images across regenerations
    status: 'draft',
    lang,
    geradoEm: new Date().toISOString(),
  }

  await put(`concepts/${id}/concept.json`, JSON.stringify(result), {
    access: 'public', contentType: 'application/json', token: TOKEN,
  })

  return NextResponse.json(result)
}
