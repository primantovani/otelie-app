import { readFileSync, existsSync } from 'fs'
import { evalRuby, isSketchUpRunning } from '@/lib/sketchup-client'
import { buildRoomRuby } from '@/lib/sketchup-ruby'
import type { BriefFormData } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const PATHS = {
  perspective: '/tmp/otelie_perspective.png',
  topDown:     '/tmp/otelie_topdown.png',
  planta:      '/tmp/otelie_planta.png',
}

function readImageBase64(path: string): string | null {
  if (!existsSync(path)) return null
  const buf = readFileSync(path)
  return `data:image/png;base64,${buf.toString('base64')}`
}

export async function POST(req: Request) {
  try {
    const formData: BriefFormData = await req.json()

    const running = await isSketchUpRunning()
    if (!running) {
      return Response.json({
        error: 'SketchUp não está respondendo. Abra o SketchUp e ative Extensions > SketchUp MCP > Start Server.',
      }, { status: 503 })
    }

    const ruby = buildRoomRuby(formData, PATHS)
    const result = await evalRuby(ruby)

    if (result !== 'ok') {
      return Response.json({ error: `SketchUp retornou: ${result}` }, { status: 500 })
    }

    const perspective = readImageBase64(PATHS.perspective)
    const topDown     = readImageBase64(PATHS.topDown)
    const planta      = readImageBase64(PATHS.planta)

    if (!perspective || !topDown) {
      return Response.json({ error: 'Screenshots não foram geradas. Verifique o SketchUp.' }, { status: 500 })
    }

    return Response.json({ perspective, topDown, planta })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Erro /api/modelo3d:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
