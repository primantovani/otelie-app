import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

const TOKEN = process.env.BLOB_PUBLIC_READ_WRITE_TOKEN

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const ext  = file.name.split('.').pop() ?? 'jpg'
  const name = `otelie-${Date.now()}.${ext}`
  const buf  = await file.arrayBuffer()

  const { url } = await put(`concepts/${id}/${name}`, Buffer.from(buf), {
    access: 'public', contentType: file.type, token: TOKEN,
  })

  return NextResponse.json({ url })
}
