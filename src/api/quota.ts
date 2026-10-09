/**
 * GREEN-API's Developer plan gives each metered method a monthly budget (e.g. 100 calls).
 * Past it the API answers HTTP 466 / QUOTE_EXCEEDED until the month changes, so once a method
 * is exhausted we stop calling it instead of burning requests on guaranteed failures.
 */
const STORAGE_KEY = 'tg-chat-quota'

const monthStamp = (now = new Date()) => `${now.getFullYear()}-${now.getMonth() + 1}`

let exhausted = new Map<string, { used: number; total: number }>()
let loadedFor: string | null = null

function load() {
  const month = monthStamp()
  if (loadedFor === month) return
  loadedFor = month
  exhausted = new Map()
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (saved?.month === month && saved.methods) {
      exhausted = new Map(Object.entries(saved.methods))
    }
  } catch {
    /* storage unavailable: in-memory only */
  }
}

function save() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ month: monthStamp(), methods: Object.fromEntries(exhausted) }),
    )
  } catch {
    /* ignore */
  }
}

export interface QuotaInfo {
  used: number
  total: number
}

export function quotaFor(method: string): QuotaInfo | undefined {
  load()
  return exhausted.get(method)
}

export function markExhausted(method: string, info: QuotaInfo) {
  load()
  exhausted.set(method, info)
  save()
}

export function resetQuotaState() {
  exhausted = new Map()
  loadedFor = null
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('tg-chat-budget')
  } catch {
    /* ignore */
  }
}

/** Reads `{"invokeStatus":{"method","used","total","status":"QUOTE_EXCEEDED"}}` from a 466 body. */
export function parseQuotaBody(body: unknown): (QuotaInfo & { method?: string }) | null {
  const s = (body as { invokeStatus?: Record<string, unknown> } | null)?.invokeStatus
  if (!s || typeof s !== 'object') return null
  const used = Number(s.used)
  const total = Number(s.total)
  return {
    method: typeof s.method === 'string' ? s.method : undefined,
    used: Number.isFinite(used) ? used : 0,
    total: Number.isFinite(total) ? total : 0,
  }
}

/**
 * Self-imposed monthly budget for optional, cosmetic lookups (e.g. contact photos), so they can
 * never use up the plan's allowance that real actions (search, add contact) depend on.
 */
const BUDGET_KEY = 'tg-chat-budget'

function readBudget(): { month: string; spent: Record<string, number> } {
  const month = monthStamp()
  try {
    const saved = JSON.parse(localStorage.getItem(BUDGET_KEY) ?? 'null')
    if (saved?.month === month && saved.spent) return saved
  } catch {
    /* storage unavailable */
  }
  return { month, spent: {} }
}

export function budgetLeft(key: string, cap: number) {
  return cap - (readBudget().spent[key] ?? 0)
}

export function spendBudget(key: string) {
  const b = readBudget()
  b.spent[key] = (b.spent[key] ?? 0) + 1
  try {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(b))
  } catch {
    /* ignore */
  }
}
