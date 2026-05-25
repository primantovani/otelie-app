import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase())

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  pages: { signIn: '/login' },
  callbacks: {
    session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub
        ;(session.user as { isAdmin?: boolean }).isAdmin =
          adminEmails.includes(session.user.email?.toLowerCase() ?? '')
      }
      return session
    },
  },
})
