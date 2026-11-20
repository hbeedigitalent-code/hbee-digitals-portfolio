/**
 * Admin money summaries. Rules (Phase A2 closure):
 *  - an amount is formatted in the currency stored on ITS OWN record, never an assumed one;
 *  - unlike currencies are never added together;
 *  - a record with no trustworthy currency is counted, but never given one and never summed.
 * project_invoices stores `amount` and `currency` per invoice (nothing records a configured default).
 *  - (S6.4) AGGREGATION IS EXACT: amounts are summed as integer minor units (BigInt), never as JavaScript floating-point numbers,
 *    so 0.10 + 0.20 is exactly 0.30. Floating point is used only AFTER the exact sum, to render a display string.
 */

// Exact two-decimal parsing / printing, kept local so this module has no imports (it mirrors src/lib/commerce/money.ts).
function toMinor(value: unknown): bigint | null {
  let s: string
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    s = String(value)
  } else if (typeof value === 'string') s = value.trim()
  else return null
  if (!/^-?[0-9]{1,14}(.[0-9]{1,2})?$/.test(s)) return null
  const negative = s.startsWith('-')
  const [whole, frac = ''] = (negative ? s.slice(1) : s).split('.')
  const minor = BigInt(whole) * 100n + BigInt((frac + '00').slice(0, 2))
  return negative ? -minor : minor
}

function minorToString(minor: bigint): string {
  const negative = minor < 0n
  const abs = negative ? -minor : minor
  return `${negative ? '-' : ''}${(abs / 100n).toString()}.${(abs % 100n).toString().padStart(2, '0')}`
}

export interface MoneyRow {
  amount?: unknown
  currency?: unknown
}

export interface CurrencyTotal {
  currency: string
  /** Exact decimal string with two decimals, e.g. "0.30". */
  total: string
  count: number
}

export interface MoneySummary {
  /** One total per distinct, valid ISO-4217-shaped currency code. */
  totals: CurrencyTotal[]
  /** Rows with an amount but no usable currency: counted, never summed. */
  unknownCurrencyCount: number
  /** Rows with no readable amount at all. */
  noAmountCount: number
}

const CODE = /^[A-Z]{3}$/

export function normaliseCurrency(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const code = value.trim().toUpperCase()
  if (!CODE.test(code)) return null
  try {
    // Throws RangeError for a well-shaped but unknown code, so formatting can never break a row.
    new Intl.NumberFormat('en', { style: 'currency', currency: code })
    return code
  } catch {
    return null
  }
}

export function summariseMoney(rows: MoneyRow[]): MoneySummary {
  const byCurrency = new Map<string, CurrencyTotal>()
  let unknownCurrencyCount = 0
  let noAmountCount = 0

  for (const row of rows) {
    // an amount that is not an exact two-decimal figure cannot be added exactly, so it is counted as unreadable, never rounded in
    const minor = row.amount === null || row.amount === undefined || row.amount === '' ? null : toMinor(row.amount)
    if (minor === null) {
      noAmountCount += 1
      continue
    }
    const currency = normaliseCurrency(row.currency)
    if (!currency) {
      unknownCurrencyCount += 1
      continue
    }
    const entry = byCurrency.get(currency) ?? { currency, total: '0.00', count: 0 }
    entry.total = minorToString((toMinor(entry.total) ?? 0n) + minor)
    entry.count += 1
    byCurrency.set(currency, entry)
  }

  return { totals: [...byCurrency.values()].sort((a, b) => a.currency.localeCompare(b.currency)), unknownCurrencyCount, noAmountCount }
}

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
}

/**
 * A short, honest line for a tile hint, or null when no meaningful monetary figure exists
 * (the caller then falls back to a count/status).
 */
export function describeMoney(summary: MoneySummary): string | null {
  // formatting happens only after the exact aggregate: the exact minor-unit figure is turned into a display number here
  const parts = summary.totals.map((t) => formatMoney(Number(t.total), t.currency))
  if (summary.unknownCurrencyCount > 0) {
    parts.push(`${summary.unknownCurrencyCount} with no currency recorded`)
  }
  return parts.length ? parts.join(' · ') : null
}
