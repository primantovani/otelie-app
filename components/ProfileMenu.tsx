'use client'

import { useState, useRef, useEffect } from 'react'
import { signOut } from 'next-auth/react'

interface Props {
  name: string | null
  email: string | null
  image: string | null
  isAdmin: boolean
}

export default function ProfileMenu({ name, email, image, isAdmin }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initials = name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? '?'
  const [imgError, setImgError] = useState(false)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-full hover:opacity-80 transition-opacity"
      >
        {image && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#D1A23A] flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
        )}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`text-[#6b7280] transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-[#e5e7eb] shadow-lg py-1 z-50">
          <div className="px-3 py-2 border-b border-[#f3f4f6]">
            <p className="text-xs font-medium text-[#1a1a1a] truncate">{name}</p>
            <p className="text-[11px] text-[#9ca3af] truncate">{email}</p>
          </div>

          <a
            href="/meu-projeto"
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#374151] hover:bg-[#f8f9fb] transition-colors"
            onClick={() => setOpen(false)}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <rect x="1.5" y="1.5" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M4.5 5.5h6M4.5 7.5h6M4.5 9.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Meus projetos
          </a>

          {isAdmin && (
            <a
              href="/admin"
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#374151] hover:bg-[#f8f9fb] transition-colors"
              onClick={() => setOpen(false)}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M7.5 4v3.5l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Painel admin
            </a>
          )}

          <div className="border-t border-[#f3f4f6] mt-1">
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[#ef4444] hover:bg-[#fef2f2] transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M5.5 13H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M10 10l3-2.5L10 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13 7.5H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
