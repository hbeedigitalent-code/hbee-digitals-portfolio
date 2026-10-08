// src/app/api/portal-invitation/open/route.ts
//
// GET ?token=… — the link in the Portal Invitation email.
//
// Moves the token out of the URL into an httpOnly, same-site cookie and
// redirects to /portal-invitation, so the token survives sign-in / sign-up
// without being passed through query strings, Referer headers or page history.
// It links NOTHING: linking needs a signed-in, verified account and a POST to
// /api/portal-invitation/accept.

import { NextRequest, NextResponse } from 'next/server'
import { INVITE_COOKIE, INVITE_TTL_DAYS, TOKEN_RE } from '@/lib/portal-invitations'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? ''
  const target = new URL('/portal-invitation', request.nextUrl.origin)
  const response = NextResponse.redirect(target, { status: 303 })
  response.headers.set('Referrer-Policy', 'no-referrer')
  response.headers.set('Cache-Control', 'no-store')

  if (TOKEN_RE.test(token)) {
    response.cookies.set(INVITE_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: INVITE_TTL_DAYS * 86_400,
    })
  } else {
    // A malformed link never leaves an older token in place to be mistaken for this one.
    response.cookies.delete(INVITE_COOKIE)
  }
  return response
}
