'use client'

import Link from 'next/link'

type BriefingRow = {
  id: string
  title: string
  email: string
  created: string
  otId: string | null
  conceptStatus: string | null
  rawTitle?: string
}

export default function AdminBriefingCards({ rows }: { rows: BriefingRow[] }) {
  return (
    <div className="space-y-3">
      {rows.map(row => {
        const inner = (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1a1a1a] truncate">{row.title}</p>
                <p className="text-xs text-[#6b7280] mt-0.5">{row.email}</p>
                {row.otId && (
                  <p className="text-[10px] text-[#9ca3af] font-mono mt-0.5">{row.otId}</p>
                )}
                <p className="text-xs text-[#9ca3af]">{row.created}</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {row.conceptStatus === 'published' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D1A23A]/10 text-[#D1A23A]">Publicado</span>
                ) : row.conceptStatus === 'draft' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Rascunho</span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pendente</span>
                )}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[#d1d5db]">
                  <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <div className="pt-1">
              <a
                href={`https://notion.so/${row.id.replace(/-/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-xs text-[#9ca3af] hover:text-[#6b7280] transition-colors"
              >
                Notion →
              </a>
            </div>
          </>
        )

        if (row.otId) {
          return (
            <Link
              key={row.id}
              href={`/admin/concept/${row.otId}?nid=${row.id}`}
              className="block bg-white rounded-2xl border border-[#e5e7eb] px-5 py-4 space-y-2 hover:border-[#D1A23A]/40 hover:shadow-sm transition-all"
            >
              {inner}
            </Link>
          )
        }

        // no OT ID found even in blocks — show as non-interactive
        return (
          <div key={row.id} className="bg-white rounded-2xl border border-[#e5e7eb] px-5 py-4 space-y-2 opacity-50">
            {inner}
          </div>
        )
      })}
    </div>
  )
}
