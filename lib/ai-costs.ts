// Approximate pricing as of 2025 — actual billing may vary
export const TOKEN_RATES: Record<string, { input: number; output: number }> = {
  'gpt-4o':          { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
  'claude-opus-4-5': { input: 3.00 / 1_000_000, output: 15.00 / 1_000_000 },
}

// Per-image cost by "model:quality:size"
export const IMAGE_RATES: Record<string, number> = {
  'gpt-image-1:high:1536x1024':   0.190,
  'gpt-image-1:medium:1024x1024': 0.070,
}

export function calcTokenCost(model: string, input: number | undefined, output: number | undefined): number {
  const r = TOKEN_RATES[model]
  if (!r) return 0
  return r.input * (input ?? 0) + r.output * (output ?? 0)
}

export type DebugCall = {
  label: string
  model: string
  inputTokens?: number
  outputTokens?: number
  estimatedCostUsd: number
  durationMs: number
}

export type RouteDebugPayload = {
  endpoint: string
  calls: DebugCall[]
  totalCostUsd: number
  totalDurationMs: number
}
