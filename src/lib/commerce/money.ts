// src/lib/commerce/money.ts
//
// Exact money for the commercial workflow. The DATABASE is authoritative (numeric(14,2) columns and generated line amounts);
// this module exists so the application never does money arithmetic with floating-point numbers. Amounts are handled as
// integer MINOR UNITS (cents / kobo / pence) in BigInt, and as plain decimal strings at the edges.
//
// Supported currencies are the four Hbee realistically invoices in. All four have two minor-unit digits, which the schema
// relies on (numeric(14,2)). Adding a currency with a different minor unit (e.g. JPY) is NOT a one-line change.

export const CURRENCIES = ['USD', 'NGN', 'GBP', 'EUR'] as const
export type Currency = (typeof CURRENCIES)[number]

export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value)
}

const MONEY_RE = /^[0-9]{1,12}(\.[0-9]{1,2})?$/
const QTY_RE = /^[0-9]{1,9}(\.[0-9]{1,3})?$/

/** A plain, non-negative decimal with at most two decimals, as the database accepts it. */
export function isPlainMoney(value: unknown): value is string {
  return typeof value === 'string' && MONEY_RE.test(value)
}

export function isPlainQuantity(value: unknown): value is string {
  return typeof value === 'string' && QTY_RE.test(value) && Number(value) > 0
}

/**
 * Decimal string (or a JSON number as PostgREST returns it) -> minor units. Returns null for anything that is not an
 * exact amount with at most two decimals: exponent notation, a sign, thousands separators, NaN.
 */
export function toMinor(value: unknown): bigint | null {
  let s: string
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    s = String(value)
  } else if (typeof value === 'string') {
    s = value.trim()
  } else return null
  if (!/^-?[0-9]{1,14}(\.[0-9]{1,2})?$/.test(s)) return null
  const negative = s.startsWith('-')
  const [whole, frac = ''] = (negative ? s.slice(1) : s).split('.')
  const minor = BigInt(whole) * 100n + BigInt((frac + '00').slice(0, 2))
  return negative ? -minor : minor
}

/** Minor units -> "1234.50" (always two decimals). */
export function minorToString(minor: bigint): string {
  const negative = minor < 0n
  const abs = negative ? -minor : minor
  const whole = abs / 100n
  const cents = abs % 100n
  return `${negative ? '-' : ''}${whole.toString()}.${cents.toString().padStart(2, '0')}`
}

export function sumMinor(values: Array<bigint | null | undefined>): bigint {
  let total = 0n
  for (const v of values) if (typeof v === 'bigint') total += v
  return total
}

/**
 * quantity x unit price, rounded half-up to the cent — the same rule as the database's generated column
 * `round(quantity * unit_price, 2)` for the non-negative values the schema allows. quantity has up to 3 decimals.
 */
export function lineAmountMinor(quantity: string, unitPrice: string): bigint | null {
  if (!isPlainQuantity(quantity) || !isPlainMoney(unitPrice)) return null
  const [qw, qf = ''] = quantity.split('.')
  const qtyMilli = BigInt(qw) * 1000n + BigInt((qf + '000').slice(0, 3))
  const price = toMinor(unitPrice)
  if (price === null) return null
  return (qtyMilli * price + 500n) / 1000n
}

export interface LineInput {
  quantity: string
  unit_price: string
}

/** Subtotal of a set of lines in minor units, or null if any line is not exact. */
export function subtotalMinor(lines: LineInput[]): bigint | null {
  let total = 0n
  for (const l of lines) {
    const a = lineAmountMinor(l.quantity, l.unit_price)
    if (a === null) return null
    total += a
  }
  return total
}

/** Display only (never used for arithmetic). ISO code first: no currency glyph that a PDF font could not encode. */
export function formatMoney(amount: unknown, currency: string, opts: { symbol?: boolean } = {}): string {
  const minor = toMinor(amount)
  if (minor === null) return '—'
  const text = minorToString(minor)
  const [whole, frac] = text.replace('-', '').split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const sign = minor < 0n ? '-' : ''
  if (opts.symbol) {
    try {
      return new Intl.NumberFormat('en', { style: 'currency', currency }).format(Number(minor) / 100)
    } catch {
      /* fall through to the ISO-code form */
    }
  }
  return `${sign}${currency} ${grouped}.${frac}`
}
