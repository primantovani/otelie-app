import type { Metadata } from 'next'
import { Nunito, Inter } from 'next/font/google'
import './globals.css'
import DebugPanel from '@/components/DebugPanel'

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Otelie — Design de Interiores',
  description: 'Concept de design para o seu negócio em minutos.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={`${nunito.variable} ${inter.variable} h-full`}>
      <body className="min-h-full h-full antialiased">
        {children}
        <DebugPanel />
      </body>
    </html>
  )
}
