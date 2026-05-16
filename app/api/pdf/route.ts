import { renderToBuffer } from '@react-pdf/renderer'
import { BriefPDF } from '@/components/BriefPDF'
import type { BriefResult, BriefFormData } from '@/lib/types'
import { SPACE_LABELS } from '@/lib/types'
import React from 'react'

export async function POST(req: Request) {
  try {
    const { result, form, imageBase64 }: {
      result: BriefResult
      form: BriefFormData
      imageBase64?: string
    } = await req.json()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(
      React.createElement(BriefPDF, {
        result,
        spaceLabel: SPACE_LABELS[form.tipo],
        area: form.area,
        imageBase64,
      }) as any
    )

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="conceito-otelie.pdf"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Erro /api/pdf:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
