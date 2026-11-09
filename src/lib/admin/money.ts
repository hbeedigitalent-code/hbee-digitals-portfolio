/**
 * Admin money summaries. Rules (Phase A2 closure):
 *  - an amount is formatted in the currency stored on ITS OWN record, never an assumed one;
 *  - unlike currencies are never added together;
 *  - a record with no trustworthy currency is counted, but never given one and never summed.
 * project_invoices stores `amount` and `currency` per invoice (nothing records a configured default).
 */

export interface MoneyRow {
  amount?: unknown
  currency?: unknown
}

export interface CurrencyTotal {
  currency: string
  total: number
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
    const amount = row.amount === null || row.amount === undefined || row.amount === '' ? NaN : Number(row.amount)
    if (!Number.isFinite(amount)) {
      noAmountCount += 1
      continue
    }
    const currency = normaliseCurrency(row.currency)
    if (!currency) {
      unknownCurrencyCount += 1
      continue
    }
    const entry = byCurrency.get(currency) ?? { currency, total: 0, count: 0 }
    entry.total += amount
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
  const parts = summary.totals.map((t) => formatMoney(t.total, t.currency))
  if (summary.unknownCurrencyCount > 0) {
    parts.push(`${summary.unknownCurrencyCount} with no currency recorded`)
  }
  return parts.length ? parts.join(' · ') : null
}
