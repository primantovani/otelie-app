import type { Metadata } from 'next'
import { DM_Sans, DM_Mono } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-sans',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Otelie Studio — Conceito de Design para Pequenos Negócios',
  description: 'Gere um conceito de design para seu café, loja ou restaurante em minutos.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${dmSans.variable} ${dmMono.variable} h-full`}>
      <body className="min-h-full h-full antialiased">{children}</body>
    </html>
  )
}
