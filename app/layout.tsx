import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'Otelie Studio — Conceito de Design para Pequenos Negócios',
  description: 'Gere um conceito de design para seu café, loja ou restaurante em minutos.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-stone-50 text-stone-900 antialiased">{children}</body>
    </html>
  )
}
