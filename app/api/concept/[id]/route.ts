import { NextRequest, NextResponse } from 'next/server'
import { put, head } from '@vercel/blob'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

const TOKEN = process.env.BLOB_PUBLIC_READ_WRITE_TOKEN

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const url = `${process.env.BLOB_PUBLIC_BASE_URL ?? 'https://hcnovzg9eq621g2w.public.blob.vercel-storage.com'}/concepts/${id}/concept.json`
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return NextResponse.json({ exists: false })
    const data = await res.json()
    return NextResponse.json({ exists: true, ...data })
  } catch {
    return NextResponse.json({ exists: false })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  await put(`concepts/${id}/concept.json`, JSON.stringify({ ...body, updatedAt: new Date().toISOString() }), {
    access: 'public', contentType: 'application/json', token: TOKEN,
  })

  return NextResponse.json({ ok: true })
}
