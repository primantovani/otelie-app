import { auth } from '@/auth'
import { NextResponse } from 'next/server'

const handler = auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  if (!session) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const isAdmin = (session.user as { isAdmin?: boolean })?.isAdmin
  if (pathname.startsWith('/admin') && !isAdmin) {
    return NextResponse.redirect(new URL('/meu-projeto', req.url))
  }
})

export { handler as proxy }

export const config = {
  matcher: ['/admin/:path*', '/meu-projeto/:path*'],
}
