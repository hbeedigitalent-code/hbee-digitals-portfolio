// src/lib/rate-limit.ts
//
// Distributed rate limiting for public endpoints, backed by Upstash Redis.
//
// WHY REDIS AND NOT AN IN-PROCESS COUNTER
// Vercel runs each route as many short-lived instances. An in-memory map is
// per-instance, so the effective limit is (configured limit × instance count)
// and it resets on every cold start. That is close enough to no limit to be
// misleading, so the counter lives in Redis where every instance shares it.
//
// FAIL-OPEN, DELIBERATELY — AND THIS IS THE ONE PLACE IN THIS CODEBASE THAT DOES
// Every other guard here fails closed: turnstile.ts denies when unconfigured,
// the cron routes refuse without CRON_SECRET, admin-2fa-cookie.ts never treats a
// missing secret as "not required". This module is the deliberate exception.
//
// The reasoning: those are authentication and authorization boundaries, where
// failing open grants access. A rate limiter is an abuse *dampener*. If Upstash
// is unreachable and this failed closed, an Upstash outage would take down the
// public contact form and client onboarding entirely — converting a third-party
// availability problem into a total loss of inbound leads. The endpoints it
// protects are independently guarded by Turnstile, which DOES fail closed, so an
// attacker cannot reach them by waiting for a Redis outage.
//
// Every fail-open decision is logged at error level so the outage is visible
// rather than silent.
//
// CONFIGURATION
// UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN. When either is absent the
// limiter is disabled and says so once at startup — intended for local
// development, never for production.

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/** Outcome of a limit check. `ok: false` means the caller should return 429. */
export interface RateLimitResult {
  ok: boolean
  /** Seconds the caller should wait before retrying. Undefined when allowed. */
  retryAfterSeconds?: number
  /** True when the check could not run (unconfigured or Redis unreachable). */
  degraded: boolean
}

/**
 * Named limits, one per public surface.
 *
 * Values are sized for human use, not for convenience of testing. A person
 * submitting a contact form does so once or twice; five in ten minutes from one
 * IP is already unusual. Onboarding is stricter because each submission also
 * writes files to storage.
 */
export const RATE_LIMITS = {
  contact: { requests: 5, window: '10 m' },
  onboarding: { requests: 3, window: '10 m' },
} as const

export type RateLimitName = keyof typeof RATE_LIMITS

let redis: Redis | null = null
let redisResolved = false
const limiters = new Map<RateLimitName, Ratelimit>()

function getRedis(): Redis | null {
  if (redisResolved) return redis
  redisResolved = true

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    console.error(
      '[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — ' +
        'rate limiting is DISABLED. This is acceptable locally and is not ' +
        'acceptable in production.',
    )
    redis = null
    return null
  }

  redis = new Redis({ url, token })
  return redis
}

function getLimiter(name: RateLimitName): Ratelimit | null {
  const existing = limiters.get(name)
  if (existing) return existing

  const client = getRedis()
  if (!client) return null

  const { requests, window } = RATE_LIMITS[name]
  const limiter = new Ratelimit({
    redis: client,
    // Sliding window rather than fixed: a fixed window lets a caller send the
    // full quota at 09:59:59 and the full quota again at 10:00:00.
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix: `hbee:rl:${name}`,
    analytics: false,
  })

  limiters.set(name, limiter)
  return limiter
}

/**
 * The caller's IP address.
 *
 * Order matters. `cf-connecting-ip` is set by Cloudflare and `x-forwarded-for`
 * by Vercel's proxy; the FIRST entry of x-forwarded-for is the original client,
 * later entries are proxies. Both headers are spoofable by anyone who can reach
 * the origin directly, so this is an abuse-control identifier and must never be
 * used as an authentication or authorization input.
 *
 * Mirrors the extraction already used in /api/growth-assessment.
 */
export function getClientIp(request: Request): string | null {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  )
}

/**
 * Check one request against a named limit.
 *
 * Never throws: a Redis failure is reported as `{ ok: true, degraded: true }`
 * so the caller proceeds. See the fail-open rationale at the top of this file.
 */
export async function checkRateLimit(
  name: RateLimitName,
  identifier: string | null,
): Promise<RateLimitResult> {
  const limiter = getLimiter(name)
  if (!limiter) {
    return { ok: true, degraded: true }
  }

  // A caller with no resolvable IP shares one bucket. That is intentional: it
  // is a small shared allowance rather than an unlimited bypass for anyone who
  // can strip the headers.
  const key = identifier || 'unknown-ip'

  try {
    const { success, reset } = await limiter.limit(`${name}:${key}`)
    if (success) return { ok: true, degraded: false }

    const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    return { ok: false, retryAfterSeconds, degraded: false }
  } catch (error) {
    console.error(
      `[rate-limit] check failed for "${name}" — allowing request: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
    )
    return { ok: true, degraded: true }
  }
}

/** Visitor-facing 429 message. Never exposes the configured limit. */
export function rateLimitMessage(retryAfterSeconds?: number): string {
  if (!retryAfterSeconds) {
    return 'Too many submissions. Please wait a few minutes and try again.'
  }
  const minutes = Math.ceil(retryAfterSeconds / 60)
  return minutes <= 1
    ? 'Too many submissions. Please wait a minute and try again.'
    : `Too many submissions. Please wait about ${minutes} minutes and try again.`
}
