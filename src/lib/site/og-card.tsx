// src/lib/site/og-card.tsx
//
// SERVER-ONLY. The Hbee Digitals social-preview card: one renderer for the static default image (scripts/build-og-default.cjs) and for
// the generated article / project cards (src/app/og/[kind]/[slug]/route.tsx), so every preview looks like one family.
//
// DESIGN. The approved brand only: the real lockup (derived from public/brand/hbee-digitals-logo-lockup.png, trimmed and scaled, never
// redrawn or recoloured), the site's own module artwork (public/brand/modules/hbee-system.webp) on the default, Manrope and Inter,
// and the --hb-* tokens (Royal Blue structure, Signal Orange accent, Cloud surface). Flat colour only, so the generated PNG stays small.
//
// Assets live in src/assets/og/ and are bundled with the function (next.config.js outputFileTracingIncludes).

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ReactElement } from 'react'
import { fitCardTitle, SOCIAL_IMAGE_HEIGHT, SOCIAL_IMAGE_WIDTH } from '@/lib/site/social-image'

if (typeof window !== 'undefined') {
  throw new Error('og-card.tsx is server-only and must not be imported by client code')
}

/** Mirrors src/styles/site-tokens.css. Do not invent brand colours here. */
const C = { blue: '#0642b3', orange: '#fc5d1c', cloud: '#f7f9fc', ink: '#111827', slate: '#475569', border: '#dde6f2', night: '#061426' } as const

export interface OgAssets {
  fonts: Array<{ name: string; data: ArrayBuffer; weight: 500 | 700 | 800; style: 'normal' }>
  lockup: string
  system: string
}

const toArrayBuffer = (b: Buffer): ArrayBuffer => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer
const dataUri = (mime: string, b: Buffer) => `data:${mime};base64,${b.toString('base64')}`

let cached: Promise<OgAssets> | null = null

/** Read once per server instance. A failed read is NOT cached, so a transient error cannot poison later requests. */
export function loadOgAssets(): Promise<OgAssets> {
  if (!cached) {
    // Literal paths under process.cwd(): the form the file tracer understands.
    cached = Promise.all([
      readFile(join(process.cwd(), 'src/assets/og/Manrope-800.ttf')),
      readFile(join(process.cwd(), 'src/assets/og/Manrope-700.ttf')),
      readFile(join(process.cwd(), 'src/assets/og/Inter-500.ttf')),
      readFile(join(process.cwd(), 'src/assets/og/hbee-lockup.png')),
      readFile(join(process.cwd(), 'src/assets/og/hbee-system.jpg')),
    ])
      .then(([m800, m700, i500, lockup, system]) => ({
        fonts: [
          { name: 'Manrope', data: toArrayBuffer(m800), weight: 800 as const, style: 'normal' as const },
          { name: 'Manrope', data: toArrayBuffer(m700), weight: 700 as const, style: 'normal' as const },
          { name: 'Inter', data: toArrayBuffer(i500), weight: 500 as const, style: 'normal' as const },
        ],
        lockup: dataUri('image/png', lockup),
        system: dataUri('image/jpeg', system),
      }))
      .catch((error) => {
        cached = null
        throw error
      })
  }
  return cached
}

const W = SOCIAL_IMAGE_WIDTH
const H = SOCIAL_IMAGE_HEIGHT
const M = 72 // side margin
const LOCKUP_RATIO = 960 / 217

/** The static default: lockup, one supporting line, the site's module artwork. */
export function renderDefaultCard(assets: OgAssets): ReactElement {
  const lockupW = 470
  return (
    <div style={{ width: W, height: H, display: 'flex', position: 'relative', background: C.cloud, fontFamily: 'Inter' }}>
      <div style={{ position: 'absolute', left: M, top: 84, display: 'flex' }}>
        <img src={assets.lockup} width={lockupW} height={Math.round(lockupW / LOCKUP_RATIO)} alt="" />
      </div>
      <div style={{ position: 'absolute', left: M, top: 262, width: 84, height: 8, borderRadius: 4, background: C.orange, display: 'flex' }} />
      <div style={{ position: 'absolute', left: M, top: 296, width: 470, display: 'flex', fontFamily: 'Manrope', fontWeight: 800, fontSize: 44, lineHeight: 1.14, letterSpacing: '-0.02em', color: C.ink }}>
        Growth works better when everything connects.
      </div>
      <div style={{ position: 'absolute', left: M, bottom: 60, display: 'flex', fontFamily: 'Inter', fontWeight: 500, fontSize: 26, color: C.slate }}>hbeedigitals.com</div>
      <div style={{ position: 'absolute', right: 20, top: 21, display: 'flex' }}>
        <img src={assets.system} width={620} height={588} alt="" />
      </div>
    </div>
  )
}

/** A generated card for an article or project: kicker, fitted title, lockup, a quiet modular accent. */
export function renderTitleCard(assets: OgAssets, opts: { kicker: string; title: string }): ReactElement {
  const { text, fontSize } = fitCardTitle(opts.title)
  const lockupW = 330
  return (
    <div style={{ width: W, height: H, display: 'flex', position: 'relative', background: C.cloud, fontFamily: 'Inter' }}>
      {/* modular accent: a small cluster of the logo's blue and orange blocks, quietly at the bottom right (clear of the title area) */}
      <div style={{ position: 'absolute', right: M, bottom: 52, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex' }}>
          <div style={{ display: 'flex', width: 118, height: 50, borderRadius: 14, background: C.blue }} />
          <div style={{ display: 'flex', width: 50, height: 50, marginLeft: 12, borderRadius: 14, background: C.orange }} />
        </div>
        <div style={{ display: 'flex', marginTop: 12 }}>
          <div style={{ display: 'flex', width: 50, height: 50, borderRadius: 14, background: C.orange }} />
          <div style={{ display: 'flex', width: 118, height: 50, marginLeft: 12, borderRadius: 14, background: C.blue }} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: M, top: 56, display: 'flex' }}>
        <img src={assets.lockup} width={lockupW} height={Math.round(lockupW / LOCKUP_RATIO)} alt="" />
      </div>
      <div style={{ position: 'absolute', left: M, top: 176, display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', width: 14, height: 14, borderRadius: 3, background: C.orange }} />
        <div style={{ display: 'flex', marginLeft: 14, fontFamily: 'Manrope', fontWeight: 700, fontSize: 24, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.blue }}>{opts.kicker}</div>
      </div>
      <div style={{ position: 'absolute', left: M, top: 224, width: 880, height: 300, display: 'flex', alignItems: 'flex-start', overflow: 'hidden', fontFamily: 'Manrope', fontWeight: 800, fontSize, lineHeight: 1.1, letterSpacing: '-0.025em', color: C.ink }}>
        {text}
      </div>
      <div style={{ position: 'absolute', left: M, bottom: 52, display: 'flex', fontFamily: 'Inter', fontWeight: 500, fontSize: 26, color: C.slate }}>hbeedigitals.com</div>
    </div>
  )
}
