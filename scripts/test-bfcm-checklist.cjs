// Offline regression coverage for the Free 15-Point BFCM Readiness Checklist
// (/bfcm-readiness-checklist, POST /api/bfcm-checklist-request, the PDF, the
// emails, analytics and the Admin inbox badge). No network, no database.
//
// Run: node scripts/test-bfcm-checklist.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { execFileSync } = require('node:child_process')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')
const J = (x) => JSON.parse(JSON.stringify(x)) // sandbox objects have another realm's prototypes
let count = 0
async function check(name, fn) {
  try {
    await fn()
    count += 1
  } catch (error) {
    console.error(`FAIL: ${name}`)
    throw error
  }
}

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
      if (name.startsWith('@/')) return load(`src/${name.slice(2)}`)
      if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file), name)))
      return require(name)
    }
    const code = ts.transpileModule(read(path.relative(root, file)), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
    }).outputText
    vm.runInNewContext(code, { module: mod, exports: mod.exports, require: localRequire, console, process, URL, URLSearchParams, Date, Promise, window }, { filename: file })
    return mod.exports
  }
  return load
}

function makeWorld(opts = {}) {
  const w = { inserts: [], tables: [], rpcCalls: [], recent: opts.recent || [], turnstileCalls: 0, limitCalls: [], acks: [], admins: [] }
  function builder(table) {
    w.tables.push(table)
    const api = {
      select: () => api,
      eq: () => api,
      gte: () => api,
      limit: () => Promise.resolve({ data: w.recent, error: null }),
      insert: (rows) => {
        w.inserts.push({ table, rows })
        return { select: () => ({ single: () => Promise.resolve(opts.insertError ? { data: null, error: { message: 'boom' } } : { data: { id: 'row-1' }, error: null }) }) }
      },
    }
    return api
  }
  w.mocks = {
    'next/server': { NextResponse: { json: (body, init = {}) => ({ status: init.status || 200, body, headers: init.headers || {} }) } },
    '@supabase/supabase-js': { createClient: () => ({ from: builder, rpc: (...a) => { w.rpcCalls.push(a); throw new Error('rpc must not be called') } }) },
    '@/lib/turnstile': {
      verifyTurnstileToken: async () => { w.turnstileCalls += 1; return opts.turnstileOk === false ? { ok: false, reason: 'failed' } : { ok: true } },
      turnstileFailureMessage: () => 'Security check failed.',
    },
    '@/lib/rate-limit': {
      checkRateLimit: async (name) => { w.limitCalls.push(name); return opts.limited ? { ok: false, retryAfterSeconds: 60, degraded: false } : { ok: true, degraded: false } },
      getClientIp: () => '203.0.113.9',
      rateLimitMessage: () => 'Too many requests.',
    },
    '@/lib/emails/bfcm-checklist-acknowledgement': {
      sendChecklistAcknowledgementEmail: async (d) => { w.acks.push(d); if (opts.ackThrows) throw new Error('down'); return { ok: !opts.ackFails, outcome: opts.ackFails ? 'failed' : 'sent' } },
    },
    '@/lib/emails/admin-contact-notification': {
      sendAdminContactNotification: async (d) => { w.admins.push(d); if (opts.adminThrows) throw new Error('down'); return { ok: !opts.adminFails, outcome: opts.adminFails ? 'failed' : 'sent' } },
    },
  }
  return w
}

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'

async function post(w, body) {
  const route = makeLoader({ mocks: w.mocks })('src/app/api/bfcm-checklist-request/route.ts')
  return J(await route.POST({ json: async () => body, headers: { get: () => null } }))
}

const GOOD = { email: 'Owner@Example.com', turnstile_token: 'tok' }
const content = makeLoader()('src/components/site/bfcm-checklist/checklist-content.ts')
const model = makeLoader()('src/components/site/bfcm-checklist/checklist-model.ts')
const validator = makeLoader()('src/lib/validators/checklist-request-payload.ts')

async function main() {
  /* 1–3: content */
  await check('1–3. exactly 15 items in exactly five groups of three, numbered 01–15 in order', () => {
    assert.equal(content.CHECKLIST_ITEMS.length, 15)
    assert.equal(content.CHECKLIST_GROUPS.length, 5)
    for (const g of content.CHECKLIST_GROUPS) assert.equal(g.items.length, 3, `${g.name} has three checks`)
    assert.deepEqual(J(content.CHECKLIST_ITEMS.map((i) => i.number)), Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(2, '0')))
    assert.deepEqual(J(content.CHECKLIST_GROUPS.map((g) => g.name)), ['Mobile & Speed', 'Product Pages', 'Shipping, Delivery & Trust', 'Checkout', 'Offer, Recovery & Tracking'])
    assert.deepEqual(
      J(content.CHECKLIST_ITEMS.map((i) => i.title)),
      ['Mobile load experience', 'Product discovery', 'Tap and navigation usability', 'First-screen clarity', 'Decision-making details', 'Trust proof', 'Shipping cost clarity', 'Delivery expectations', 'Policies & business trust', 'Guest checkout', 'Payment options', 'End-to-end checkout test', 'One clear BFCM offer', 'Abandoned-cart recovery', 'Conversion tracking'],
    )
  })

  await check('1b. approved page copy', () => {
    assert.equal(content.CL_HERO.eyebrow, 'FREE BFCM READINESS CHECKLIST')
    assert.equal(`${content.CL_HERO.headline} ${content.CL_HERO.headlineAccent}`, 'Is Your Store Ready for Black Friday Traffic?')
    assert.equal(content.CL_HERO.lede, 'Use this 15-point checklist to catch common conversion problems before more visitors arrive.')
    assert.equal(content.CL_HERO.trust, 'Free. Practical. Built for Shopify and e-commerce stores.')
    assert.equal(content.CL_HERO.cta, 'Get the Free Checklist')
    assert.equal(content.CL_HERO.secondaryCta, 'Get a Free Growth Review')
    assert.equal(content.CL_FORM.cta, 'Send Me the Checklist')
    assert.equal(content.CL_READY.title, 'Your BFCM Readiness Checklist is ready.')
    assert.equal(content.CL_READY.download, 'Download Checklist')
    assert.equal(content.CL_READY.growthReview, 'Get My Free Growth Review')
    assert.equal(content.CL_FINAL.title, 'Not sure which of these is costing your store sales?')
    assert.equal(content.CL_FINAL.copy, 'Get a Free Growth Review and we’ll identify the top 3 things we’d fix first — within 24 hours.')
    assert.equal(content.CL_LIST.progress(9, 15), '9 of 15 checks completed')
    const page = read('src/app/(site)/bfcm-readiness-checklist/page.tsx')
    assert.match(page, /<ChecklistHero \/>[\s\S]*<ChecklistList \/>[\s\S]*<ChecklistFinalCta \/>/)
    assert.match(page, /path: '\/bfcm-readiness-checklist'/)
  })

  /* 4: interactive state, no DB */
  await check('4. tick state: toggles, persists locally, reports progress — and never touches a server', () => {
    let t = []
    t = J(model.toggleTick(t, '03')); t = J(model.toggleTick(t, '01'))
    assert.deepEqual(t, ['01', '03'], 'kept in checklist order')
    assert.deepEqual(J(model.toggleTick(t, '03')), ['01'], 'a second tap unticks')
    assert.deepEqual(J(model.toggleTick(t, '99')), t, 'unknown ids are ignored')
    assert.deepEqual(J(model.normaliseTicks(['01', '01', 'x', 7, '15'])), ['01', '15'])
    assert.deepEqual(J(model.readTicks('not json')), [])
    assert.deepEqual(J(model.readTicks(null)), [])
    assert.deepEqual(J(model.readTicks(JSON.stringify(['02', '14']))), ['02', '14'])
    assert.deepEqual(J(model.progress(['01', '02', '03', '04', '05', '06', '07', '08', '09'])), { done: 9, total: 15, percent: 60 })
    assert.deepEqual(J(model.progress([])), { done: 0, total: 15, percent: 0 })
    const src = read('src/components/site/bfcm-checklist/ChecklistInteractive.tsx') + read('src/components/site/bfcm-checklist/checklist-model.ts').split('export const CHECKLIST_SUBMIT_URL')[0]
    assert.ok(!/fetch\(|supabase|XMLHttpRequest|sendBeacon|\/api\//.test(src), 'the tick UI makes no network or database call')
    assert.match(src, /localStorage/)
    assert.match(src, /type="checkbox"/)
    assert.match(src, /role="progressbar"/)
  })

  /* 5–8: validation + endpoint */
  await check('5. email validation', () => {
    for (const email of ['', 'nope', 'a@b', 'a b@c.com', 42, null, undefined]) {
      const r = validator.validateChecklistRequestPayload({ email })
      assert.equal(r.ok, false, JSON.stringify(email))
      assert.match(r.error, /valid email/i)
    }
    const ok = validator.validateChecklistRequestPayload(GOOD)
    assert.equal(ok.ok, true)
    assert.equal(ok.value.email, 'owner@example.com')
    assert.equal(ok.value.website, null)
    assert.equal(validator.validateChecklistRequestPayload({ email: `${'a'.repeat(320)}@example.com` }).ok, false)
  })

  await check('6. optional store URL: blank is fine, a valid one is normalised, junk is refused', () => {
    assert.equal(validator.validateChecklistRequestPayload({ ...GOOD, website: '' }).value.website, null)
    assert.equal(validator.validateChecklistRequestPayload({ ...GOOD, website: '   ' }).value.website, null)
    assert.equal(validator.validateChecklistRequestPayload({ ...GOOD, website: 'Example.com' }).value.website, 'https://example.com/')
    assert.equal(validator.validateChecklistRequestPayload({ ...GOOD, website: 'http://www.shop.example.com/x' }).value.website, 'http://www.shop.example.com/x')
    for (const bad of ['javascript:alert(1)', 'localhost', 'ftp://example.com', 'exa mple.com', 7]) {
      assert.equal(validator.validateChecklistRequestPayload({ ...GOOD, website: bad }).ok, false, JSON.stringify(bad))
    }
    assert.equal(validator.checklistIdentity('a@shop.co', 'https://www.example.com/'), 'example.com')
    assert.equal(validator.checklistIdentity('a@shop.co', null), 'shop.co')
  })

  await check('7. duplicate protection: same email inside ten minutes is acknowledged without a second row or email', async () => {
    const dup = makeWorld({ recent: [{ id: 'old', website: null }] })
    const res = await post(dup, GOOD)
    assert.deepEqual(res.body, { success: true, duplicate: true })
    assert.equal(dup.inserts.length, 0)
    assert.equal(dup.acks.length + dup.admins.length, 0)
    // The same email asking about a different store is a different request.
    const other = makeWorld({ recent: [{ id: 'old', website: 'https://other.com/' }] })
    assert.deepEqual((await post(other, { ...GOOD, website: 'example.com' })).body, { success: true, duplicate: false })
    assert.equal(other.inserts.length, 1)
    const route = read('src/app/api/bfcm-checklist-request/route.ts')
    assert.match(route, /DUPLICATE_WINDOW_MS = 10 \* 60_000/)
    assert.match(route, /\.eq\('service', CHECKLIST_REQUEST_SERVICE\)/)
  })

  await check('8. UTM sanitisation and exact storage mapping', async () => {
    const r = validator.validateChecklistRequestPayload({ ...GOOD, utm_source: ' linkedin\nutm_medium: forged ', utm_medium: 'x'.repeat(400), utm_campaign: '\u0000bfcm_readiness_2026', utm_content: 5, cta: 'checklist_form', stray: 'dropped' })
    assert.equal(r.value.attribution.utm_source, 'linkedin utm_medium: forged')
    assert.equal(r.value.attribution.utm_medium.length, 120)
    assert.equal(r.value.attribution.utm_campaign, 'bfcm_readiness_2026')
    assert.ok(!('utm_content' in r.value.attribution) && !('stray' in r.value.attribution))

    const w = makeWorld()
    const res = await post(w, { ...GOOD, website: 'Example.com', utm_source: 'instagram', utm_medium: 'organic_social', utm_campaign: 'bfcm_readiness_2026', utm_content: 'day2_shipping', referrer: 'l.instagram.com/out', cta: 'checklist_form', is_read: true, status: 'archived', service: 'x' })
    assert.deepEqual(res.body, { success: true, duplicate: false })
    const row = w.inserts[0].rows[0]
    assert.equal(w.inserts[0].table, 'contact_submissions')
    assert.deepEqual(Object.keys(row).sort(), ['company', 'created_at', 'email', 'form_type', 'full_name', 'is_read', 'message', 'phone', 'service', 'source', 'status', 'website'])
    assert.equal(row.full_name, 'BFCM Checklist — example.com')
    assert.equal(row.email, 'owner@example.com')
    assert.equal(row.website, 'https://example.com/')
    assert.equal(row.service, 'Free 15-Point BFCM Readiness Checklist')
    assert.equal(row.form_type, 'contact')
    assert.equal(row.source, 'website_contact_form')
    assert.equal(row.status, 'new')
    assert.equal(row.is_read, false)
    assert.equal(row.company, null)
    assert.equal(row.phone, null)
    assert.equal(row.message, 'Requested the Free 15-Point BFCM Readiness Checklist.\n\n--- Campaign attribution ---\nutm_source: instagram\nutm_medium: organic_social\nutm_campaign: bfcm_readiness_2026\nutm_content: day2_shipping\nreferrer: l.instagram.com/out\ncta: checklist_form')
    assert.ok(!JSON.stringify(row).includes('tok'), 'the Turnstile token never reaches a column')
    // No store URL and no attribution: identity falls back to the email domain, message has no block.
    const bare = makeWorld()
    await post(bare, GOOD)
    assert.equal(bare.inserts[0].rows[0].full_name, 'BFCM Checklist — example.com')
    assert.equal(bare.inserts[0].rows[0].website, null)
    assert.equal(bare.inserts[0].rows[0].message, 'Requested the Free 15-Point BFCM Readiness Checklist.')
  })

  await check('8b. guards: rate limit key, honeypot, Turnstile, invalid input cost nothing', async () => {
    assert.match(read('src/lib/rate-limit.ts'), /checklist_request:\s*\{\s*requests:\s*5,\s*window:\s*'10 m'\s*\}/)
    const limited = makeWorld({ limited: true })
    const r1 = await post(limited, GOOD)
    assert.equal(r1.status, 429)
    assert.deepEqual(limited.limitCalls, ['checklist_request'])
    assert.equal(limited.turnstileCalls + limited.inserts.length + limited.acks.length, 0)

    const trap = makeWorld()
    const r2 = await post(trap, { ...GOOD, hb_extra: 'http://spam' })
    assert.deepEqual(r2.body, { success: true, duplicate: false })
    assert.equal(trap.turnstileCalls + trap.inserts.length + trap.acks.length + trap.admins.length, 0)

    const ts1 = makeWorld({ turnstileOk: false })
    assert.equal((await post(ts1, GOOD)).status, 400)
    assert.equal(ts1.inserts.length + ts1.acks.length, 0)

    const bad = makeWorld()
    const r3 = await post(bad, { email: 'nope', turnstile_token: 't' })
    assert.equal(r3.status, 400)
    assert.match(r3.body.error, /valid email/i)
    assert.equal(bad.inserts.length, 0)
  })

  /* 9: analytics */
  await check('9. analytics: five events, consent-gated, once-only where stated, no PII', () => {
    const calls = []
    const local = new Map()
    const store = (m) => ({ getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) })
    const win = { localStorage: store(local), sessionStorage: store(new Map()), gtag: (...a) => calls.push(a) }
    const a = makeLoader({ window: win })('src/lib/analytics.ts')
    const ctx = { utm_source: 'linkedin', utm_medium: 'organic_social', utm_campaign: 'bfcm_readiness_2026', utm_content: 'day2_shipping', cta_location: 'hero', email: 'owner@example.com', website: 'https://example.com/', ticks: ['01', '02'] }
    const key = '11111111-1111-4111-8111-111111111111'
    const ack = { responseOk: true, success: true, duplicate: false }
    assert.equal(a.trackChecklistEvent('bfcm_checklist_viewed', ctx), false, 'no consent → nothing sent')
    assert.equal(a.trackChecklistRequested(ack, key, ctx), false)
    local.set('hbee_cookie_consent', 'accepted')
    assert.equal(a.trackChecklistEvent('bfcm_checklist_viewed', ctx), true)
    assert.equal(a.trackChecklistEvent('bfcm_checklist_viewed', ctx), false, 'viewed once per page view')
    assert.equal(a.trackChecklistEvent('bfcm_checklist_started', ctx), true)
    assert.equal(a.trackChecklistEvent('bfcm_checklist_started', ctx), false, 'started once per page view')
    assert.equal(a.trackChecklistRequested({ ...ack, duplicate: true }, key, ctx), false, 'a duplicate is not a new lead')
    assert.equal(a.trackChecklistRequested(ack, key, ctx), true)
    assert.equal(a.trackChecklistRequested(ack, key, ctx), false, 'counted once')
    assert.equal(a.trackChecklistEvent('bfcm_checklist_downloaded', ctx), true)
    assert.equal(a.trackChecklistEvent('bfcm_checklist_downloaded', ctx), true, 'clicks may repeat')
    assert.equal(a.trackChecklistEvent('bfcm_checklist_growth_review_clicked', ctx), true)
    assert.deepEqual(J([...new Set(calls.map((c) => c[1]))]), ['bfcm_checklist_viewed', 'bfcm_checklist_started', 'bfcm_checklist_requested', 'bfcm_checklist_downloaded', 'bfcm_checklist_growth_review_clicked'])
    const allowed = new Set(['form_name', 'conversion_type', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'cta_location'])
    for (const [, , params] of calls) {
      for (const k of Object.keys(params)) assert.ok(allowed.has(k), `unexpected parameter ${k}`)
      assert.ok(!/owner@example|example\.com|@|ticks/.test(JSON.stringify(params)), 'no email, store URL or tick data')
      assert.equal(params.utm_campaign, 'bfcm_readiness_2026')
    }
    // Existing funnels keep their own events.
    assert.equal(typeof a.trackGrowthReviewSubmission, 'function')
    assert.equal(typeof a.trackGrowthReviewRequestSubmitted, 'function')
  })

  /* 10: gating + PDF */
  await check('10. download is offered only after a confirmed request; the PDF is real and 1–3 pages', async () => {
    const form = read('src/components/site/bfcm-checklist/ChecklistRequestForm.tsx')
    assert.ok(form.indexOf('json?.success === true') < form.indexOf('setReady(true)'), 'ready state only after server success')
    assert.equal((form.match(/CHECKLIST_PDF_PATH/g) || []).length >= 2, true)
    assert.ok(form.indexOf('if (ready)') < form.indexOf('href={CHECKLIST_PDF_PATH}'), 'the download link lives inside the ready state')
    assert.ok(!/CHECKLIST_PDF_PATH/.test(read('src/components/site/bfcm-checklist/ChecklistSections.tsx') + read('src/components/site/bfcm-checklist/ChecklistInteractive.tsx')), 'no download link elsewhere on the page')
    const file = path.join(root, 'public' + content.CHECKLIST_PDF_PATH)
    assert.ok(fs.existsSync(file), 'PDF asset exists')
    assert.equal(path.basename(file), 'Hbee-Digitals-15-Point-BFCM-Readiness-Checklist.pdf')
    const pdf = fs.readFileSync(file, 'latin1')
    assert.ok(pdf.startsWith('%PDF-'))
    const { PDFDocument } = require('pdf-lib')
    const parsed = await PDFDocument.load(fs.readFileSync(file))
    const pages = parsed.getPageCount()
    assert.ok(pages >= 1 && pages <= 3, `PDF has ${pages} page(s)`)
    assert.match(parsed.getTitle(), /15-Point BFCM Readiness Checklist/)
    // The generator reads the same content module, so the PDF cannot drift from the page.
    assert.match(read('scripts/build-bfcm-checklist-pdf.cjs'), /checklist-content\.ts/)
    assert.match(read('scripts/build-bfcm-checklist-pdf.cjs'), /hbeedigitals\.com\/growth-review|CL_FINAL/)
  })

  /* 11: email best-effort */
  await check('11. email failure never fails the capture', async () => {
    for (const opts of [{ ackFails: true }, { adminFails: true }, { ackThrows: true }, { adminThrows: true }, { ackThrows: true, adminThrows: true }]) {
      const w = makeWorld(opts)
      const res = await post(w, { ...GOOD, submission_key: '11111111-1111-4111-8111-111111111111' })
      assert.equal(res.status, 200)
      assert.deepEqual(res.body, { success: true, duplicate: false })
      assert.equal(w.inserts.length, 1, 'the lead is kept')
    }
    const w = makeWorld()
    await post(w, { ...GOOD, website: 'example.com', utm_source: 'linkedin', utm_campaign: 'bfcm_readiness_2026', submission_key: '11111111-1111-4111-8111-111111111111' })
    assert.equal(w.acks[0].email, 'owner@example.com')
    assert.equal(w.acks[0].idempotencyKey, '11111111-1111-4111-8111-111111111111')
    assert.equal(w.admins[0].checklist.source, 'linkedin · bfcm_readiness_2026')
    const failed = makeWorld({ insertError: true })
    assert.equal((await post(failed, GOOD)).status, 500, 'an unsaved lead is an honest error')
    assert.equal(failed.acks.length + failed.admins.length, 0, 'no email for an unsaved lead')
  })

  await check('11b. emails: visitor email has the download + Growth Review; admin email names the request', () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.NEXT_PUBLIC_SITE_URL = 'https://hbeedigitals.com'
    const load = makeLoader()
    const v = load('src/lib/emails/bfcm-checklist-acknowledgement.ts').renderChecklistAcknowledgementEmail()
    assert.match(v.subject, /BFCM Readiness Checklist/)
    assert.match(v.html, /Your BFCM Readiness Checklist is ready\./)
    assert.ok(v.html.includes('Hbee-Digitals-15-Point-BFCM-Readiness-Checklist.pdf'), 'download link')
    assert.match(v.html, /Get My Free Growth Review/)
    assert.match(v.html, /top 3 things/)
    const admin = load('src/lib/emails/admin-contact-notification.ts')
    const r = admin.renderAdminContactNotification({ fullName: 'BFCM Checklist — example.com', email: 'owner@example.com', phone: null, company: null, website: 'https://example.com/', service: 'Free 15-Point BFCM Readiness Checklist', message: 'x', isConsultation: false, submissionId: 'row-1', checklist: { source: 'instagram · bfcm_readiness_2026', submittedAt: '21 Nov 2026 UTC' } })
    assert.match(r.subject, /BFCM Readiness Checklist request/)
    for (const needle of ['BFCM Readiness Checklist request', 'owner@example.com', 'https://example.com/', 'instagram', 'bfcm_readiness_2026']) assert.ok(r.html.includes(needle) || r.text.includes(needle), needle)
    // Existing notification shapes are untouched.
    const legacy = admin.renderAdminContactNotification({ fullName: 'A B', email: 'a@b.co', phone: null, company: null, website: null, service: 'X', message: 'hello there', isConsultation: false, submissionId: null })
    assert.equal(legacy.subject, 'New Inquiry from A B')
    const gr = admin.renderAdminContactNotification({ fullName: 'Growth Review — e.com', email: 'a@b.co', phone: null, company: null, website: 'https://e.com/', service: 'Free Growth Review (campaign)', message: 'm', isConsultation: false, submissionId: null, growthReview: { source: null, submittedAt: 'x' } })
    assert.match(gr.subject, /Growth Review request/)
  })

  /* 12: admin badge */
  await check('12. Admin badge mapping keeps the two campaigns distinguishable', () => {
    const inbox = makeLoader()('src/lib/admin/inquiries.ts')
    assert.equal(inbox.isChecklistRequest({ service: 'Free 15-Point BFCM Readiness Checklist' }), true)
    assert.equal(inbox.isChecklistRequest({ service: 'Free Growth Review (campaign)' }), false)
    assert.equal(inbox.isGrowthReviewRequest({ service: 'Free 15-Point BFCM Readiness Checklist' }), false)
    assert.equal(inbox.isChecklistRequest({ service: null }), false)
    assert.equal(inbox.CHECKLIST_SERVICE, validator.CHECKLIST_REQUEST_SERVICE, 'inbox marker matches what the endpoint stores')
    assert.equal(inbox.growthReviewSource('Requested.\n\n--- Campaign attribution ---\nutm_source: instagram'), 'Instagram')
    assert.equal(inbox.inquiryPreview('Requested the Free 15-Point BFCM Readiness Checklist.\n\n--- Campaign attribution ---\nutm_source: linkedin'), 'Requested the Free 15-Point BFCM Readiness Checklist.')
    const page = read('src/app/admin/inquiries/page.tsx')
    assert.match(page, /isChecklistRequest\(msg\)[\s\S]*BFCM Checklist[\s\S]*isGrowthReviewRequest\(msg\)[\s\S]*Growth Review/)
  })

  /* 13: attribution preservation */
  await check('13. Growth Review links carry campaign attribution and stamp the hop', () => {
    const href = (a) => model.growthReviewHref(a)
    const u = new URL(href({ utm_source: 'linkedin', utm_medium: 'organic_social', utm_campaign: 'bfcm_readiness_2026', utm_content: 'day2_shipping', referrer: 'l.lnkd.in/x' }), 'https://hbeedigitals.com')
    assert.equal(u.pathname, '/growth-review')
    assert.equal(u.searchParams.get('utm_source'), 'linkedin')
    assert.equal(u.searchParams.get('utm_medium'), 'organic_social')
    assert.equal(u.searchParams.get('utm_campaign'), 'bfcm_readiness_2026')
    assert.equal(u.searchParams.get('utm_content'), 'checklist_to_growth_review')
    assert.equal([...u.searchParams.keys()].sort().join(','), 'utm_campaign,utm_content,utm_medium,utm_source', 'nothing else travels (no referrer, email or ticks)')
    const direct = new URL(href({}), 'https://hbeedigitals.com')
    assert.equal(direct.searchParams.get('utm_content'), 'checklist_to_growth_review')
    assert.equal(direct.searchParams.get('utm_source'), 'bfcm_checklist')
    assert.equal(direct.searchParams.has('utm_campaign'), false, 'no campaign is invented for an unattributed visit')
    // The Growth Review quick form reads exactly these parameters.
    const qm = makeLoader()('src/components/site/growth-review/quick-form-model.ts')
    const attr = J(qm.readAttribution(u.search, '', 'hbeedigitals.com'))
    assert.equal(attr.utm_source, 'linkedin')
    assert.equal(attr.utm_content, 'checklist_to_growth_review')
    const sections = read('src/components/site/bfcm-checklist/ChecklistSections.tsx')
    assert.equal((sections.match(/<ChecklistGrowthReviewLink /g) || []).length, 2, 'hero secondary CTA + final CTA')
    assert.match(read('src/components/site/bfcm-checklist/ChecklistGrowthReviewLink.tsx'), /bfcm_checklist_growth_review_clicked/)
  })

  /* 14–16: isolation */
  await check('14–15. no Growth Assessment / HGRI scoring, no merchant / portal / profile', async () => {
    const w = makeWorld()
    await post(w, { ...GOOD, website: 'example.com' })
    assert.equal(w.rpcCalls.length, 0)
    assert.deepEqual([...new Set(w.tables)], ['contact_submissions'])
    assert.deepEqual([...new Set(w.inserts.map((i) => i.table))], ['contact_submissions'])
    const code = ['src/app/api/bfcm-checklist-request/route.ts', 'src/lib/validators/checklist-request-payload.ts', 'src/components/site/bfcm-checklist/checklist-model.ts', 'src/components/site/bfcm-checklist/ChecklistInteractive.tsx', 'src/components/site/bfcm-checklist/ChecklistRequestForm.tsx']
      .map((f) => read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')).join('\n')
    assert.ok(!/hgri|scoring|\/api\/growth-assessment|submit_growth_assessment|calculate\w*Score|merchants|growth_profiles|growth_reviews|portal_invitations|from\('clients'\)|createNotification|signUp|createUser/i.test(code))
  })

  await check('16. no migration or SQL: nothing changed outside application code, scripts, docs and the PDF', () => {
    let base = 'origin/main'
    try { execFileSync('git', ['rev-parse', '--verify', '--quiet', base], { cwd: root, stdio: 'ignore' }) } catch { base = '845086152ea03dd01af06df6400d2ceb226e899e' }
    const changed = execFileSync('git', ['diff', '--name-only', base], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean)
    const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).split('\n').filter((f) => f && !f.startsWith('campaign-assets/'))
    for (const f of [...changed, ...untracked]) {
      assert.ok(!/\.sql$|migration|supabase\/|proposal|invoice|commerce\/pdf/i.test(f), `unexpected file in the change set: ${f}`)
    }
    // The live Growth Review funnel and the assessment system are not changed by this work.
    const watched = ['src/app/api/growth-review-request', 'src/app/api/growth-assessment', 'src/lib/scoring', 'src/components/site/growth-review/GrowthReviewQuickForm.tsx', 'src/components/site/growth-review/GrowthReviewForm.tsx', 'src/components/site/growth-review/ReceivedState.tsx']
    assert.equal(execFileSync('git', ['diff', '--name-only', base, '--', ...watched], { cwd: root, encoding: 'utf8' }).trim(), '')
  })

  await check('17. existing Growth Review request, contact/inquiry and security suites still pass', () => {
    for (const t of ['test-growth-request.cjs', 'test-how-we-work-growth-review.cjs', 'test-insights-contact-s4.cjs', 'test-conversion-measurement.cjs', 'test-admin-operations.cjs', 'test-admin-api-authz.cjs', 'test-admin-prod-sql.cjs']) {
      execFileSync('node', [path.join('scripts', t)], { cwd: root, stdio: 'pipe' })
    }
  })

  console.log(`bfcm-checklist: ${count} checks passed`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
