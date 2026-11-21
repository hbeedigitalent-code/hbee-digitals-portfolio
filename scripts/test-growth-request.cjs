// Offline regression coverage for the short Free Growth Review request
// (POST /api/growth-review-request, the quick form, its confirmation, analytics
// and the Admin inbox badge). No network, no database: Supabase, Turnstile, the
// rate limiter and Resend are replaced by in-memory fakes.
//
// Run: node scripts/test-growth-request.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { execFileSync } = require('node:child_process')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
// Objects built inside the vm sandbox have another realm's prototypes; compare their JSON form.
const J = (x) => JSON.parse(JSON.stringify(x))
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')
let count = 0
function check(name, fn) {
  const run = async () => {
    try {
      await fn()
      count += 1
    } catch (error) {
      console.error(`FAIL: ${name}`)
      throw error
    }
  }
  return run()
}

/* ── A tiny TS module loader with per-test mocks ───────────────────────────── */
function makeLoader({ mocks = {}, window } = {}) {
  const cache = new Map()
  function load(relative) {
    let file = path.resolve(root, relative)
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = ['.ts', '.tsx', '/index.ts'].map((ext) => file + ext).find((f) => fs.existsSync(f))
    }
    if (cache.has(file)) return cache.get(file).exports
    const mod = { exports: {} }
    cache.set(file, mod)
    const localRequire = (name) => {
      if (name in mocks) return mocks[name]
      if (name.startsWith('@/')) {
        if (name in mocks) return mocks[name]
        return load(`src/${name.slice(2)}`)
      }
      if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file), name)))
      return require(name)
    }
    const code = ts.transpileModule(read(path.relative(root, file)), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
    }).outputText
    vm.runInNewContext(
      code,
      { module: mod, exports: mod.exports, require: localRequire, console, process, URL, URLSearchParams, Date, Promise, window },
      { filename: file },
    )
    return mod.exports
  }
  return load
}

/* ── Fakes ─────────────────────────────────────────────────────────────────── */
function makeWorld(opts = {}) {
  const world = {
    inserts: [],
    tables: [],
    rpcCalls: [],
    recent: opts.recent || [],
    turnstileCalls: 0,
    limitCalls: [],
    acks: [],
    admins: [],
    insertError: opts.insertError || null,
  }
  const nextServer = {
    NextResponse: {
      json(body, init = {}) {
        return { status: init.status || 200, body, headers: init.headers || {} }
      },
    },
  }
  function builder(table) {
    world.tables.push(table)
    const api = {
      select: () => api,
      eq: () => api,
      gte: () => api,
      limit: () => Promise.resolve({ data: world.recent, error: null }),
      insert: (rows) => {
        world.inserts.push({ table, rows })
        return {
          select: () => ({
            single: () =>
              Promise.resolve(
                world.insertError ? { data: null, error: { message: 'boom' } } : { data: { id: 'row-1' }, error: null },
              ),
          }),
        }
      },
    }
    return api
  }
  const supabase = {
    createClient: () => ({
      from: builder,
      rpc: (...args) => {
        world.rpcCalls.push(args)
        throw new Error('rpc must not be called by the quick request')
      },
    }),
  }
  const turnstile = {
    verifyTurnstileToken: async () => {
      world.turnstileCalls += 1
      return opts.turnstileOk === false ? { ok: false, reason: 'failed' } : { ok: true }
    },
    turnstileFailureMessage: () => 'Security check failed.',
  }
  const rateLimit = {
    checkRateLimit: async (name) => {
      world.limitCalls.push(name)
      return opts.limited ? { ok: false, retryAfterSeconds: 60, degraded: false } : { ok: true, degraded: false }
    },
    getClientIp: () => '203.0.113.9',
    rateLimitMessage: () => 'Too many requests.',
  }
  const ackEmail = {
    sendGrowthRequestAcknowledgementEmail: async (data) => {
      world.acks.push(data)
      if (opts.ackThrows) throw new Error('resend down')
      return { ok: !opts.ackFails, outcome: opts.ackFails ? 'failed' : 'sent' }
    },
  }
  const adminEmail = {
    sendAdminContactNotification: async (data) => {
      world.admins.push(data)
      if (opts.adminThrows) throw new Error('resend down')
      return { ok: !opts.adminFails, outcome: opts.adminFails ? 'failed' : 'sent' }
    },
  }
  world.mocks = {
    'next/server': nextServer,
    '@supabase/supabase-js': supabase,
    '@/lib/turnstile': turnstile,
    '@/lib/rate-limit': rateLimit,
    '@/lib/emails/growth-review-request-acknowledgement': ackEmail,
    '@/lib/emails/admin-contact-notification': adminEmail,
  }
  return world
}

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'

async function post(world, body) {
  const load = makeLoader({ mocks: world.mocks })
  const route = load('src/app/api/growth-review-request/route.ts')
  return J(await route.POST({ json: async () => body, headers: { get: () => null } }))
}

const GOOD = {
  website: 'Example.com',
  email: 'Owner@Example.com',
  biggest_challenge: 'Plenty of visitors, but very few first orders.',
  turnstile_token: 'tok',
}

const validator = makeLoader()('src/lib/validators/growth-request-payload.ts')

async function main() {
  /* 1–6: validator */
  await check('1. valid URL/email/challenge accepted', () => {
    const r = validator.validateGrowthRequestPayload(GOOD)
    assert.equal(r.ok, true)
    assert.equal(r.value.email, 'owner@example.com')
    assert.equal(r.value.biggest_challenge, GOOD.biggest_challenge)
  })

  await check('2. URL normalisation', () => {
    const n = validator.normaliseStoreUrl
    assert.equal(n('example.com'), 'https://example.com/')
    assert.equal(n('https://www.Example.com/shop'), 'https://www.example.com/shop')
    assert.equal(n('http://example.com'), 'http://example.com/')
    for (const bad of ['', 'localhost', 'javascript:alert(1)', 'ftp://example.com', 'exa mple.com', 'https://user:pw@example.com', 'data:text/html,x']) {
      assert.equal(n(bad), null, `rejects ${JSON.stringify(bad)}`)
    }
    assert.equal(validator.comparableStoreKey('https://www.example.com/'), validator.comparableStoreKey('http://example.com'))
    assert.equal(validator.storeHostname('https://www.Example.com/x'), 'example.com')
  })

  await check('3. invalid email rejected', () => {
    for (const email of ['', 'nope', 'a@b', 'a b@c.com', 'a@@c.com', 42, null]) {
      const r = validator.validateGrowthRequestPayload({ ...GOOD, email })
      assert.equal(r.ok, false, `rejects ${JSON.stringify(email)}`)
      assert.match(r.error, /valid email/i)
    }
  })

  await check('4. missing URL rejected', () => {
    for (const website of [undefined, '', '   ', 7]) {
      const r = validator.validateGrowthRequestPayload({ ...GOOD, website })
      assert.equal(r.ok, false)
      assert.match(r.error, /store URL/i)
    }
  })

  await check('5. missing challenge rejected (and a too-short one)', () => {
    assert.equal(validator.validateGrowthRequestPayload({ ...GOOD, biggest_challenge: undefined }).ok, false)
    assert.equal(validator.validateGrowthRequestPayload({ ...GOOD, biggest_challenge: '   ' }).ok, false)
    const short = validator.validateGrowthRequestPayload({ ...GOOD, biggest_challenge: 'too short' })
    assert.equal(short.ok, false)
    assert.match(short.error, /more detail/i)
    // Not forced to the full assessment's long answer.
    assert.equal(validator.validateGrowthRequestPayload({ ...GOOD, biggest_challenge: 'Low conversion' }).ok, true)
  })

  await check('6. oversized payload rejected', () => {
    assert.equal(validator.validateGrowthRequestPayload({ ...GOOD, biggest_challenge: 'x'.repeat(1001) }).ok, false)
    assert.equal(validator.validateGrowthRequestPayload({ ...GOOD, biggest_challenge: 'x'.repeat(1000) }).ok, true)
    assert.equal(validator.validateGrowthRequestPayload({ ...GOOD, website: `https://example.com/${'a'.repeat(500)}` }).ok, false)
    assert.equal(validator.validateGrowthRequestPayload({ ...GOOD, email: `${'a'.repeat(320)}@example.com` }).ok, false)
  })

  /* 7: honeypot */
  await check('7. honeypot: success-shaped answer, nothing stored, nothing sent, no Turnstile call', async () => {
    const w = makeWorld()
    const res = await post(w, { ...GOOD, hb_extra: 'http://spam.example' })
    assert.equal(res.status, 200)
    assert.deepEqual(res.body, { success: true, duplicate: false })
    assert.equal(w.inserts.length, 0)
    assert.equal(w.acks.length + w.admins.length, 0)
    assert.equal(w.turnstileCalls, 0)
    // An empty honeypot is the normal case and proceeds.
    const ok = await post(makeWorld(), { ...GOOD, hb_extra: '' })
    assert.equal(ok.body.success, true)
  })

  /* 8: rate-limit wiring */
  await check('8. rate limit: dedicated growth_request key, 429 before Turnstile/DB/email', async () => {
    const limits = read('src/lib/rate-limit.ts')
    assert.match(limits, /growth_request:\s*\{\s*requests:\s*5,\s*window:\s*'10 m'\s*\}/)
    const w = makeWorld({ limited: true })
    const res = await post(w, GOOD)
    assert.equal(res.status, 429)
    assert.equal(res.headers['Retry-After'], '60')
    assert.deepEqual(w.limitCalls, ['growth_request'])
    assert.equal(w.turnstileCalls, 0)
    assert.equal(w.inserts.length, 0)
    assert.equal(w.acks.length + w.admins.length, 0)
  })

  await check('8b. failed Turnstile costs nothing', async () => {
    const w = makeWorld({ turnstileOk: false })
    const res = await post(w, GOOD)
    assert.equal(res.status, 400)
    assert.equal(w.inserts.length, 0)
    assert.equal(w.acks.length + w.admins.length, 0)
  })

  await check('8c. invalid payload is a 400 with a visitor-friendly message and no write', async () => {
    const w = makeWorld()
    const res = await post(w, { ...GOOD, email: 'nope' })
    assert.equal(res.status, 400)
    assert.match(res.body.error, /valid email/i)
    assert.equal(w.inserts.length, 0)
  })

  /* 9: duplicates */
  await check('9. duplicate (same email + same store, even www/scheme variants) creates no second row or email', async () => {
    const w = makeWorld({ recent: [{ id: 'old', website: 'https://www.example.com/' }] })
    const res = await post(w, { ...GOOD, website: 'http://example.com' })
    assert.deepEqual(res.body, { success: true, duplicate: true })
    assert.equal(w.inserts.length, 0)
    assert.equal(w.acks.length + w.admins.length, 0)
    // A different store from the same email is NOT a duplicate.
    const other = makeWorld({ recent: [{ id: 'old', website: 'https://other-shop.com/' }] })
    const res2 = await post(other, GOOD)
    assert.deepEqual(res2.body, { success: true, duplicate: false })
    assert.equal(other.inserts.length, 1)
    // The duplicate lookup is bounded to ten minutes and to campaign rows.
    const route = read('src/app/api/growth-review-request/route.ts')
    assert.match(route, /DUPLICATE_WINDOW_MS = 10 \* 60_000/)
    assert.match(route, /\.eq\('service', GROWTH_REQUEST_SERVICE\)/)
  })

  /* 10–11: attribution */
  await check('10. UTM fields are sanitised', () => {
    const r = validator.validateGrowthRequestPayload({
      ...GOOD,
      utm_source: '  linkedin\nutm_medium: forged  ',
      utm_medium: 'x'.repeat(500),
      utm_campaign: '\u0000bfcm_readiness_2026\u0007',
      utm_content: 42,
      referrer: 'l.facebook.com/' + 'p'.repeat(600),
      cta: '',
      unknown_field: 'dropped',
    })
    assert.equal(r.ok, true)
    const a = r.value.attribution
    assert.equal(a.utm_source, 'linkedin utm_medium: forged', 'newlines collapse so a value cannot forge a row')
    assert.equal(a.utm_medium.length, 120)
    assert.equal(a.utm_campaign, 'bfcm_readiness_2026')
    assert.equal('utm_content' in a, false)
    assert.equal('cta' in a, false)
    assert.equal(a.referrer.length, 300)
    assert.equal('unknown_field' in a, false)
  })

  await check('11. attribution is stored only in the message block; columns are exactly the existing ones', async () => {
    const w = makeWorld()
    const res = await post(w, {
      ...GOOD,
      utm_source: 'linkedin',
      utm_medium: 'social',
      utm_campaign: 'bfcm_readiness_2026',
      utm_content: 'flyer-01',
      referrer: 'lnkd.in/abc',
      cta: 'hero',
      submission_key: '11111111-1111-4111-8111-111111111111',
      is_read: true,
      status: 'archived',
      service: 'something else',
    })
    assert.deepEqual(res.body, { success: true, duplicate: false })
    assert.equal(w.inserts.length, 1)
    const row = w.inserts[0].rows[0]
    assert.equal(w.inserts[0].table, 'contact_submissions')
    assert.deepEqual(Object.keys(row).sort(), ['company', 'created_at', 'email', 'form_type', 'full_name', 'is_read', 'message', 'phone', 'service', 'source', 'status', 'website'])
    assert.equal(row.full_name, 'Growth Review — example.com')
    assert.equal(row.email, 'owner@example.com')
    assert.equal(row.website, 'https://example.com/')
    assert.equal(row.service, 'Free Growth Review (campaign)')
    assert.equal(row.form_type, 'contact')
    assert.equal(row.source, 'website_contact_form')
    assert.equal(row.status, 'new')
    assert.equal(row.is_read, false, 'a caller cannot pre-mark a lead as read')
    assert.equal(row.company, null)
    assert.equal(row.phone, null)
    assert.equal(
      row.message,
      `${GOOD.biggest_challenge}\n\n--- Campaign attribution ---\nutm_source: linkedin\nutm_medium: social\nutm_campaign: bfcm_readiness_2026\nutm_content: flyer-01\nreferrer: lnkd.in/abc\ncta: hero`,
    )
    assert.ok(!JSON.stringify(row).includes('tok'), 'the Turnstile token never reaches a column')
    // Round-trips for the admin inbox.
    const parsed = validator.parseStoredMessage(row.message)
    assert.equal(parsed.challenge, GOOD.biggest_challenge)
    assert.equal(parsed.attribution.utm_source, 'linkedin')
    // No attribution → no block at all.
    const bare = makeWorld()
    await post(bare, GOOD)
    assert.equal(bare.inserts[0].rows[0].message, GOOD.biggest_challenge)
  })

  /* 12–13: isolation from the assessment system */
  await check('12. no Growth Assessment / HGRI scoring is invoked', async () => {
    const w = makeWorld()
    await post(w, GOOD)
    assert.equal(w.rpcCalls.length, 0, 'submit_growth_assessment is never called')
    const sources = [read('src/app/api/growth-review-request/route.ts'), read('src/lib/validators/growth-request-payload.ts')].join('\n')
    assert.ok(!/hgri|scoring|growth-assessment|submit_growth_assessment|calculate\w*Score/i.test(sources.replace(/\/\/.*$/gm, '')), 'quick-request code does not reference scoring or the assessment API')
  })

  await check('13. no merchant / portal / Growth Profile is created', async () => {
    const w = makeWorld()
    await post(w, GOOD)
    assert.deepEqual([...new Set(w.tables)], ['contact_submissions'], 'only contact_submissions is touched')
    assert.deepEqual([...new Set(w.inserts.map((i) => i.table))], ['contact_submissions'])
    const route = read('src/app/api/growth-review-request/route.ts').replace(/\/\/.*$/gm, '')
    assert.ok(!/merchants|growth_profiles|growth_reviews|portal_invitations|clients|createNotification/.test(route))
  })

  /* 14–15: best-effort email */
  await check('14. admin notification is best-effort (failure or throw never fails the lead)', async () => {
    for (const opts of [{ adminFails: true }, { adminThrows: true }]) {
      const w = makeWorld(opts)
      const res = await post(w, GOOD)
      assert.equal(res.status, 200)
      assert.deepEqual(res.body, { success: true, duplicate: false })
      assert.equal(w.inserts.length, 1, 'the lead is kept')
    }
    const w = makeWorld()
    await post(w, { ...GOOD, utm_source: 'instagram', utm_campaign: 'bfcm_readiness_2026' })
    const n = w.admins[0]
    assert.equal(n.growthReview.source, 'instagram · bfcm_readiness_2026')
    assert.equal(n.website, 'https://example.com/')
    assert.equal(n.email, 'owner@example.com')
    assert.equal(n.message, GOOD.biggest_challenge, 'the notification carries the challenge, not the attribution block')
  })

  await check('15. visitor acknowledgement is best-effort', async () => {
    for (const opts of [{ ackFails: true }, { ackThrows: true }, { ackThrows: true, adminThrows: true }]) {
      const w = makeWorld(opts)
      const res = await post(w, GOOD)
      assert.equal(res.status, 200)
      assert.deepEqual(res.body, { success: true, duplicate: false })
      assert.equal(w.inserts.length, 1)
    }
    const w = makeWorld()
    await post(w, { ...GOOD, submission_key: '11111111-1111-4111-8111-111111111111' })
    assert.equal(w.acks[0].email, 'owner@example.com')
    assert.equal(w.acks[0].idempotencyKey, '11111111-1111-4111-8111-111111111111')
    const failedSave = makeWorld({ insertError: true })
    const res = await post(failedSave, GOOD)
    assert.equal(res.status, 500, 'a failed save is an honest error')
    assert.equal(failedSave.acks.length + failedSave.admins.length, 0, 'no email for a lead that was not saved')
  })

  /* Email content */
  await check('15b. email templates: Growth Review wording, no echo of the visitor answer', () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.NEXT_PUBLIC_SITE_URL = 'https://hbeedigitals.com'
    const load = makeLoader()
    const ack = load('src/lib/emails/growth-review-request-acknowledgement.ts')
    const built = ack.renderGrowthRequestAcknowledgementEmail({ website: 'https://example.com/' })
    assert.match(built.subject, /Growth Review/)
    assert.match(built.html, /Your Growth Review request is in\./)
    assert.match(built.html, /Within 24 hours/)
    assert.match(built.html, /top 3/)
    assert.match(built.html, /example\.com/)
    assert.ok(!/contact form|your message/i.test(built.text), 'does not read like a generic contact acknowledgement')
    const admin = load('src/lib/emails/admin-contact-notification.ts')
    const rendered = admin.renderAdminContactNotification({
      fullName: 'Growth Review — example.com',
      email: 'owner@example.com',
      phone: null,
      company: null,
      website: 'https://example.com/',
      service: 'Free Growth Review (campaign)',
      message: 'Low <b>conversion</b>',
      isConsultation: false,
      submissionId: 'row-1',
      growthReview: { source: 'linkedin · bfcm_readiness_2026', submittedAt: '20 Nov 2026 UTC' },
    })
    assert.match(rendered.subject, /Growth Review request/)
    for (const needle of ['https://example.com/', 'owner@example.com', 'linkedin', 'bfcm_readiness_2026', 'Biggest challenge']) {
      assert.ok(rendered.html.includes(needle) || rendered.text.includes(needle), `admin email shows ${needle}`)
    }
    assert.ok(!rendered.html.includes('<b>conversion</b>'), 'visitor text is escaped')
    // Existing notification shapes are unchanged.
    const legacy = admin.renderAdminContactNotification({
      fullName: 'A B', email: 'a@b.co', phone: null, company: null, website: null, service: 'X', message: 'hello there', isConsultation: false, submissionId: null,
    })
    assert.equal(legacy.subject, 'New Inquiry from A B')
  })

  /* 16: analytics without PII */
  await check('16. analytics: separate events, consent-gated, no PII', () => {
    const calls = []
    const local = new Map()
    const store = (m) => ({ getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) })
    const win = { localStorage: store(local), sessionStorage: store(new Map()), gtag: (...a) => calls.push(a) }
    const analytics = makeLoader({ window: win })('src/lib/analytics.ts')
    const ctx = { utm_source: 'linkedin', utm_medium: 'social', utm_campaign: 'bfcm_readiness_2026', utm_content: 'flyer-01', cta_location: 'hero', email: 'owner@example.com', website: 'https://example.com/' }
    const key = '11111111-1111-4111-8111-111111111111'
    const ack = { responseOk: true, success: true, duplicate: false }

    assert.equal(analytics.trackGrowthReviewRequestStarted(ctx), false, 'no consent → nothing sent')
    assert.equal(analytics.trackGrowthReviewRequestSubmitted(ack, key, ctx), false)
    assert.equal(calls.length, 0)

    local.set('hbee_cookie_consent', 'accepted')
    assert.equal(analytics.trackGrowthReviewRequestStarted(ctx), true)
    assert.equal(analytics.trackGrowthReviewRequestStarted(ctx), false, 'started fires once per page view')
    assert.equal(analytics.trackGrowthReviewRequestSubmitted({ ...ack, duplicate: true }, key, ctx), false, 'a duplicate is not a new lead')
    assert.equal(analytics.trackGrowthReviewRequestSubmitted({ responseOk: false, success: true }, key, ctx), false)
    assert.equal(analytics.trackGrowthReviewRequestSubmitted(ack, key, ctx), true)
    assert.equal(analytics.trackGrowthReviewRequestSubmitted(ack, key, ctx), false, 'same submission is counted once')

    assert.deepEqual(J(calls.map((c) => c[1])), ['growth_review_request_started', 'growth_review_request_submitted'])
    const allowed = new Set(['form_name', 'conversion_type', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'cta_location'])
    for (const [, , params] of calls) {
      for (const k of Object.keys(params)) assert.ok(allowed.has(k), `unexpected analytics parameter ${k}`)
      assert.ok(!JSON.stringify(params).match(/owner@example|example\.com|@/), 'no email or store URL')
      assert.equal(params.utm_campaign, 'bfcm_readiness_2026')
      assert.equal(params.cta_location, 'hero')
    }
    // The full-assessment event is untouched and separate.
    assert.equal(analytics.trackGrowthReviewSubmission(ack, '22222222-2222-4222-8222-222222222222'), true)
    assert.equal(calls[calls.length - 1][1], 'growth_review_submitted')
    assert.equal(analytics.trackGrowthReviewSubmission.length, 2)
  })

  /* 17: the full assessment is unchanged */
  await check('17. the Growth Assessment route, scoring, validator and full form are unchanged', () => {
    const watched = [
      'src/app/api/growth-assessment',
      'src/lib/scoring',
      'src/lib/validators/assessment-payload.ts',
      'src/lib/validators/assessment-validation.ts',
      'src/components/site/growth-review/GrowthReviewForm.tsx',
      'src/components/site/growth-review/form-model.ts',
    ]
    let base = 'origin/main'
    try {
      execFileSync('git', ['rev-parse', '--verify', '--quiet', base], { cwd: root, stdio: 'ignore' })
    } catch {
      base = '2a82dca038fc8ccbdccc8323c788eb6a386c7e0e'
    }
    const diff = execFileSync('git', ['diff', '--name-only', base, '--', ...watched], { cwd: root, encoding: 'utf8' }).trim()
    assert.equal(diff, '', `watched assessment files changed: ${diff}`)
    // The quick form never posts to the assessment endpoint, and the full form never to the quick one.
    assert.ok(!/growth-assessment/.test(read('src/components/site/growth-review/GrowthReviewQuickForm.tsx') + read('src/components/site/growth-review/quick-form-model.ts')))
    assert.match(read('src/components/site/growth-review/GrowthReviewForm.tsx'), /SUBMIT_URL = '\/api\/growth-assessment'/)
  })

  /* UI / page contract */
  await check('18. quick form: exactly three visitor fields, correct labels and CTA, honeypot', () => {
    const form = read('src/components/site/growth-review/GrowthReviewQuickForm.tsx')
    const model = read('src/components/site/growth-review/quick-form-model.ts')
    assert.match(model, /urlLabel: 'Store URL'/)
    assert.match(model, /emailLabel: 'Email'/)
    assert.match(model, /challengeLabel: 'What’s the biggest challenge with your store right now\?'/)
    assert.match(model, /cta: 'Get My Free Growth Review'/)
    assert.equal((form.match(/\{field\('/g) || []).length, 3, 'three labelled fields')
    assert.match(form, /name="hb_extra"[^>]*tabIndex=\{-1\}/)
    assert.match(form, /hb_extra: ''/)
    assert.match(form, /TurnstileWidget/)
  })

  await check('18b. quick-form model: validation and attribution capture', () => {
    const m = makeLoader()('src/components/site/growth-review/quick-form-model.ts')
    assert.deepEqual(J(m.validateQuick({ website: 'example.com', email: 'a@b.co', biggest_challenge: 'Low conversion rate' }, 'tok')), {})
    const errs = m.validateQuick(m.EMPTY_QUICK, null)
    assert.deepEqual(J(Object.keys(errs)), ['website', 'email', 'biggest_challenge', 'turnstile'])
    assert.deepEqual(
      J(m.readAttribution('?utm_source=linkedin&utm_medium=social&utm_campaign=bfcm_readiness_2026&utm_content=a&other=1', 'https://l.instagram.com/out?u=secret', 'hbeedigitals.com')),
      { utm_source: 'linkedin', utm_medium: 'social', utm_campaign: 'bfcm_readiness_2026', utm_content: 'a', referrer: 'l.instagram.com/out' },
    )
    assert.deepEqual(J(m.readAttribution('', 'https://hbeedigitals.com/services', 'hbeedigitals.com')), {}, 'own-site referrer is not attribution')
    // UTMs from the landing URL survive in-tab navigation.
    const mem = {}
    const store = { get: () => mem.v ?? null, set: (v) => { mem.v = v } }
    m.resolveAttribution('?utm_source=instagram&utm_campaign=bfcm_readiness_2026', '', 'hbeedigitals.com', store)
    const later = m.resolveAttribution('', '', 'hbeedigitals.com', store)
    assert.equal(later.utm_source, 'instagram')
    assert.equal(later.utm_campaign, 'bfcm_readiness_2026')
  })

  await check('19. page copy and structure', () => {
    const page = read('src/app/(site)/growth-review/page.tsx')
    const sections = read('src/components/site/growth-review/GrowthReviewSections.tsx')
    const copy = load2('src/components/site/growth-review/growth-review-campaign-content.ts')
    const bfcm = load2('src/components/site/growth-review/bfcm-context.ts')
    assert.equal(copy.GR_OFFER_HERO.eyebrow, 'FREE SHOPIFY GROWTH REVIEW')
    assert.equal(`${copy.GR_OFFER_HERO.headline} ${copy.GR_OFFER_HERO.headlineAccent}`, 'Find What to Fix First')
    assert.equal(copy.GR_OFFER_HERO.lede, 'Within 24 hours, we’ll review your store and send you the top 3 things we’d fix first.')
    assert.equal(copy.GR_OFFER_HERO.trust, 'Free. No account needed. No obligation.')
    assert.deepEqual(Array.from(copy.GR_LOOK.items), ['Mobile experience', 'Product clarity', 'Trust', 'Checkout', 'Delivery', 'Tracking'])
    assert.deepEqual(Array.from(copy.GR_RECEIVE.items.map((i) => i.title)), ['Your top 3 priorities', 'Why they matter', 'What to do next'])
    assert.deepEqual(Array.from(copy.GR_HOW.steps.map((s) => s.title)), ['Share your store', 'We review the buying experience', 'Receive your top 3 priorities within 24 hours'])
    assert.equal(copy.GR_FINAL.title, 'Not sure what’s costing your store sales?')
    assert.equal(copy.GR_FINAL.cta, 'Get My Free Growth Review')
    assert.equal(bfcm.GR_BFCM.title, 'Black Friday traffic can expose problems that normal traffic hides.')
    assert.equal(bfcm.GR_BFCM.points.length, 5)
    const allCopy = read('src/components/site/growth-review/growth-review-campaign-content.ts') + read('src/components/site/growth-review/bfcm-context.ts') + read('src/components/site/growth-review/growth-review-content.ts')
    assert.ok(!/not a sales call/i.test(allCopy.replace(/Is the Growth Review a sales call\?/g, '')), 'banned phrase is not used')
    assert.match(page, /<GrowthReviewHero \/>[\s\S]*<GrowthReviewReceive \/>[\s\S]*<GrowthReviewLook \/>[\s\S]*<GrowthReviewHow \/>[\s\S]*<GrowthReviewBfcm \/>[\s\S]*<GrowthReviewFinalCta \/>[\s\S]*<GrowthReviewAssessment \/>/)
    assert.ok(sections.indexOf('<GrowthReviewQuickForm') < sections.indexOf('export function GrowthReviewReceive'), 'the short form is in the hero, before everything else')
    assert.match(sections, /if \(!BFCM_CONTEXT_ACTIVE\) return null/, 'BFCM block can be retired with one flag')
    assert.match(sections, /<GrowthReviewForm \/>/, 'the full assessment is still on the page')
    assert.match(copy.GR_DEEPER.title, /deeper Growth Profile/)
    assert.equal(fs.existsSync(path.join(root, 'src/components/site/growth-review/GrowthReviewForm.tsx')), true)
  })

  await check('20. confirmation: marker kind selects copy; direct visits stay neutral', () => {
    const received = read('src/components/site/growth-review/ReceivedState.tsx')
    const form = read('src/components/site/growth-review/GrowthReviewQuickForm.tsx')
    const copy = load2('src/components/site/growth-review/growth-review-campaign-content.ts')
    assert.equal(copy.GR_REQUEST_RECEIVED.title, 'Your Growth Review request is in.')
    assert.equal(copy.GR_REQUEST_RECEIVED.body, 'We’ll review your store and send you the top 3 things we’d fix first within 24 hours.')
    assert.match(copy.GR_REQUEST_RECEIVED.steps[0], /check the email address you submitted/i)
    assert.equal(copy.GR_REQUEST_RECEIVED.deeperCta, 'Build Your Full Growth Profile')
    // The receipt gate is intact: valid marker required for either success state.
    assert.match(received, /receiptIsValid\(raw\)/)
    assert.match(received, /setState\(!valid \? 'neutral'/)
    assert.match(form, /sessionStorage\.setItem\(RECEIPT_KEY, JSON\.stringify\(\{ at: Date\.now\(\), kind: QUICK_RECEIPT_KIND \}\)\)/)
    // The marker is only written after the server confirmed.
    assert.ok(form.indexOf('json?.success === true') < form.indexOf('setItem(RECEIPT_KEY'))
    const model = makeLoader()('src/components/site/growth-review/form-model.ts')
    assert.equal(model.receiptIsValid(null), false)
    assert.equal(model.receiptIsValid(JSON.stringify({ at: Date.now(), kind: 'request' })), true)
  })

  await check('21. Admin inbox: Growth Review badge and campaign source', () => {
    const inbox = makeLoader()('src/lib/admin/inquiries.ts')
    assert.equal(inbox.isGrowthReviewRequest({ service: 'Free Growth Review (campaign)' }), true)
    assert.equal(inbox.isGrowthReviewRequest({ service: 'Brand strategy' }), false)
    assert.equal(inbox.isGrowthReviewRequest({ service: null }), false)
    const message = 'Low conversion\n\n--- Campaign attribution ---\nutm_source: linkedin\nutm_campaign: bfcm_readiness_2026'
    assert.equal(inbox.growthReviewSource(message), 'LinkedIn')
    assert.equal(inbox.growthReviewSource('Low conversion\n\n--- Campaign attribution ---\nutm_source: instagram'), 'Instagram')
    assert.equal(inbox.growthReviewSource('Low conversion\n\n--- Campaign attribution ---\nutm_source: newsletter'), 'newsletter')
    assert.equal(inbox.growthReviewSource('Low conversion'), null)
    assert.equal(inbox.growthReviewSource(null), null)
    assert.equal(inbox.inquiryPreview(message), 'Low conversion', 'the list preview hides the attribution block')
    assert.equal(inbox.GROWTH_REVIEW_SERVICE, validator.GROWTH_REQUEST_SERVICE, 'inbox marker matches what the endpoint stores')
    const page = read('src/app/admin/inquiries/page.tsx')
    assert.match(page, /isGrowthReviewRequest\(msg\)[\s\S]*Growth Review/)
  })

  console.log(`growth-request: ${count} checks passed`)
}

let load2
load2 = makeLoader()

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
