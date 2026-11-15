// src/lib/projects/project-reference.ts
//
// SERVER-ONLY helper. Collision-safe public project references for projects created from a client request.
//
// The previous client-flow value was `PROJ-` + the last six digits of Date.now(): two requests a million
// milliseconds apart produced the same reference.
//
// This draws 8 characters from a 30-symbol, look-alike-free alphabet using crypto.randomBytes with rejection
// sampling (bytes >= 240 are discarded, so every symbol is exactly equally likely). 30^8 ≈ 6.6 × 10^11 values.
// The caller still checks for an existing row and retries on a unique violation, because the database — not
// this function — is the authority on uniqueness.

import { randomBytes } from 'crypto'

if (typeof window !== 'undefined') {
  throw new Error('project-reference.ts is server-only and must not be imported by client code')
}

/** No 0/O, 1/I/L, or U: nothing that reads ambiguously on a call or an invoice. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ'
const LENGTH = 8
const LIMIT = 240 // 30 * 8: the largest multiple of 30 that fits in a byte

export function generateProjectReference(): string {
  let out = ''
  while (out.length < LENGTH) {
    for (const byte of randomBytes(LENGTH * 2)) {
      if (byte >= LIMIT) continue
      out += ALPHABET[byte % ALPHABET.length]
      if (out.length === LENGTH) break
    }
  }
  return `PROJ-${out}`
}

export const PROJECT_REFERENCE_PATTERN = /^PROJ-[2-9A-HJKMNP-TV-Z]{8}$/
