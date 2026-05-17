import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { plantaPrompt }: { plantaPrompt: string } = await req.json()

    const client = new OpenAI()
    const image = await client.images.generate({
      model: 'gpt-image-1',
      prompt: plantaPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'medium',
    })

    const b64 = image.data?.[0]?.b64_json
    if (!b64) return Response.json({ error: 'Sem imagem na resposta' }, { status: 500 })

    return Response.json({ url: `data:image/png;base64,${b64}` })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Erro /api/planta:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
