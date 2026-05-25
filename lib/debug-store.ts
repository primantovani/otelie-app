import type { RouteDebugPayload } from './ai-costs'

export type DebugEntry = RouteDebugPayload & { id: number; timestamp: number }

let entries: DebugEntry[] = []
let nextId = 1
const listeners = new Set<() => void>()

export function pushDebugEntry(payload: RouteDebugPayload) {
  entries = [...entries, { ...payload, id: nextId++, timestamp: Date.now() }]
  listeners.forEach(fn => fn())
}

export function getDebugEntries(): DebugEntry[] {
  return entries
}

export function clearDebugEntries() {
  entries = []
  nextId = 1
  listeners.forEach(fn => fn())
}

export function subscribeDebug(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function totalDebugCost(): number {
  return entries.reduce((sum, e) => sum + e.totalCostUsd, 0)
}
