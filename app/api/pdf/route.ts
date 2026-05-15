import { renderToBuffer } from '@react-pdf/renderer'
import { BriefPDF } from '@/components/BriefPDF'
import type { BriefResult, BriefFormData } from '@/lib/types'
import { SPACE_LABELS } from '@/lib/types'
import React from 'react'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const raw = searchParams.get('data')
  if (!raw) return new Response('Missing data', { status: 400 })

  const { result, form }: { result: BriefResult; form: BriefFormData } = JSON.parse(
    decodeURIComponent(raw)
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(
    React.createElement(BriefPDF, { result, spaceLabel: SPACE_LABELS[form.tipo], area: form.area }) as any
  )

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="conceito-otelie.pdf"`,
    },
  })
}
