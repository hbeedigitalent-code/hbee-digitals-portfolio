// src/lib/commerce/pdf-response.ts
//
// SERVER-ONLY. The one way a generated PDF leaves the server: an authenticated route builds it, on demand, from authoritative
// records, and streams it with headers that forbid caching and sniffing. There is no stored file and no URL to share.

import { NextResponse } from 'next/server'

export function pdfResponse(bytes: Uint8Array, fileName: string, opts: { inline?: boolean } = {}): Response {
  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': String(bytes.byteLength),
      'Content-Disposition': `${opts.inline ? 'inline' : 'attachment'}; filename="${fileName}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export function pdfFailure(): NextResponse {
  return NextResponse.json({ error: 'The PDF could not be generated. Please try again.' }, { status: 500 })
}
