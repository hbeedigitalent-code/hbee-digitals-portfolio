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

/** 410 page for a client who opens the PDF link of an invoice that has since been voided. Static text only; nothing is interpolated. */
export function invoiceUnavailablePage(): Response {
  const html =
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Invoice unavailable</title></head>' +
    '<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1.25rem;color:#0b1e33;line-height:1.6">' +
    '<h1 style="font-size:1.25rem">This invoice is no longer available</h1>' +
    '<p>It has been withdrawn by Hbee Digitals. If you have a question, please contact us.</p>' +
    '<p><a href="/client-portal/invoices">Back to your invoices</a></p></body></html>'
  return new Response(html, {
    status: 410,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' },
  })
}

export function pdfFailure(): NextResponse {
  return NextResponse.json({ error: 'The PDF could not be generated. Please try again.' }, { status: 500 })
}
