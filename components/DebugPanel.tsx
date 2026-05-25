'use client'
import { useEffect, useRef, useState } from 'react'
import {
  getDebugEntries,
  clearDebugEntries,
  subscribeDebug,
  totalDebugCost,
  type DebugEntry,
} from '@/lib/debug-store'

function fmt(usd: number) {
  if (usd === 0) return '—'
  if (usd < 0.001) return `~$${(usd * 1000).toFixed(3)}m`
  return `~$${usd.toFixed(4)}`
}

function fmtMs(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
}

function fmtTokens(n?: number) {
  if (n == null) return '—'
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

function EntryRow({ entry, open, onToggle }: {
  entry: DebugEntry
  open: boolean
  onToggle: () => void
}) {
  const time = new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer hover:bg-white/5 transition-colors"
        title="Expandir chamadas"
      >
        <td className="py-1 pr-3 font-mono text-[10px] text-white/40 whitespace-nowrap">{time}</td>
        <td className="py-1 pr-3 font-mono text-[10px] text-white/80 whitespace-nowrap">
          {entry.endpoint.replace('/api/', '')}
        </td>
        <td className="py-1 pr-3 font-mono text-[10px] text-white/50 whitespace-nowrap">
          {fmtMs(entry.totalDurationMs)}
        </td>
        <td className="py-1 font-mono text-[10px] text-[#86efac] font-semibold whitespace-nowrap text-right">
          {fmt(entry.totalCostUsd)}
        </td>
        <td className="py-1 pl-1.5 text-white/30 text-[9px]">{open ? '▲' : '▼'}</td>
      </tr>
      {open && entry.calls.map((call, i) => (
        <tr key={i} className="bg-white/[0.03]">
          <td />
          <td colSpan={2} className="py-0.5 pl-3 pr-2">
            <div className="font-mono text-[9px] text-white/50 leading-relaxed">
              <span className="text-white/70">{call.label}</span>
              {' · '}
              <span className="text-[#a5b4fc]">{call.model}</span>
              {call.inputTokens != null && (
                <span className="text-white/30 ml-1.5">
                  {fmtTokens(call.inputTokens)} in · {fmtTokens(call.outputTokens)} out
                </span>
              )}
              <span className="text-white/25 ml-1.5">{fmtMs(call.durationMs)}</span>
            </div>
          </td>
          <td className="py-0.5 font-mono text-[9px] text-[#86efac]/70 text-right">{fmt(call.estimatedCostUsd)}</td>
          <td />
        </tr>
      ))}
    </>
  )
}

export default function DebugPanel() {
  const [visible, setVisible] = useState(false)
  const [entries, setEntries] = useState<DebugEntry[]>([])
  const [total, setTotal] = useState(0)
  const [openId, setOpenId] = useState<number | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const refresh = () => {
      setEntries([...getDebugEntries()])
      setTotal(totalDebugCost())
    }
    refresh()
    const unsub = subscribeDebug(refresh)

    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        setVisible(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      unsub()
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        title="Debug de custos IA (Ctrl+Shift+D)"
        className="fixed bottom-4 right-4 z-50 w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-black/80 transition-all text-[10px] font-mono"
      >
        ¢
      </button>
    )
  }

  return (
    <div
      ref={panelRef}
      className="fixed bottom-4 right-4 z-50 w-[400px] max-h-[480px] rounded-2xl overflow-hidden flex flex-col"
      style={{ background: 'rgba(10,10,15,0.96)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
    >
      {/* header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.07] shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold text-white/50 uppercase tracking-widest">Debug · Custos IA</span>
          {entries.length > 0 && (
            <span className="font-mono text-[10px] text-[#86efac] font-semibold">
              total {fmt(total)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {entries.length > 0 && (
            <button
              onClick={() => { clearDebugEntries(); setOpenId(null) }}
              className="font-mono text-[9px] text-white/25 hover:text-white/50 transition-colors uppercase"
            >
              limpar
            </button>
          )}
          <button
            onClick={() => setVisible(false)}
            className="text-white/30 hover:text-white/60 transition-colors text-sm leading-none"
          >
            ✕
          </button>
        </div>
      </div>

      {/* body */}
      <div className="overflow-y-auto flex-1 px-4 py-3">
        {entries.length === 0 ? (
          <p className="font-mono text-[10px] text-white/25 text-center py-8">
            Nenhuma chamada registrada ainda.<br />
            <span className="text-white/15">Faça uma chamada de IA para ver os custos.</span>
          </p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="pb-2 text-left font-mono text-[8px] text-white/25 uppercase tracking-wider pr-3">hora</th>
                <th className="pb-2 text-left font-mono text-[8px] text-white/25 uppercase tracking-wider pr-3">endpoint</th>
                <th className="pb-2 text-left font-mono text-[8px] text-white/25 uppercase tracking-wider pr-3">tempo</th>
                <th className="pb-2 text-right font-mono text-[8px] text-white/25 uppercase tracking-wider" colSpan={2}>custo est.</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  open={openId === entry.id}
                  onToggle={() => setOpenId(id => id === entry.id ? null : entry.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* footer */}
      <div className="px-4 py-2 border-t border-white/[0.07] shrink-0 flex items-center justify-between">
        <span className="font-mono text-[8px] text-white/15">Ctrl+Shift+D para ocultar · valores estimados</span>
        {entries.length > 0 && (
          <span className="font-mono text-[10px] text-white/40">
            {entries.length} {entries.length === 1 ? 'chamada' : 'chamadas'}
          </span>
        )}
      </div>
    </div>
  )
}
