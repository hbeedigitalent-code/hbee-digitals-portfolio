// Offline regression coverage for consent-gated, deduplicated GA4 conversions.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const local = new Map()
const session = new Map()
const calls = []

function storage(values) {
  return {
    getItem(key) { return values.get(key) ?? null },
    setItem(key, value) { values.set(key, value) },
  }
}

const browser = {
  localStorage: storage(local),
  sessionStorage: storage(session),
  gtag(...args) { calls.push(args) },
}

function load(relative, cache = new Map()) {
  let file = path.resolve(root, relative)
  if (!fs.existsSync(file)) file = ['.ts', '.tsx'].map((ext) => file + ext).find(fs.existsSync)
  if (cache.has(file)) return cache.get(file).exports
  const mod = { exports: {} }
  cache.set(file, mod)
  const localRequire = (name) => {
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}`, cache)
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file), name)), cache)
    return require(name)
  }
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  vm.runInNewContext(code, {
    module: mod,
    exports: mod.exports,
    require: localRequire,
    window: browser,
    console,
  }, { filename: file })
  return mod.exports
}

function accepted() { local.set('hbee_cookie_consent', 'accepted') }
function declined() { local.set('hbee_cookie_consent', 'declined') }
function ack(patch = {}) { return { responseOk: true, success: true, duplicate: false, ...patch } }

const growthKey = '11111111-1111-4111-8111-111111111111'
const contactKey = '22222222-2222-4222-8222-222222222222'

accepted()
let analytics = load('src/lib/analytics.ts')
assert.equal(analytics.trackGrowthReviewSubmission(ack(), growthKey), true)
assert.equal(analytics.trackGrowthReviewSubmission(ack(), growthKey), false, 'rerender must not duplicate')
assert.equal(calls.length, 1)

// A module reload models a refresh: the durable opaque receipt still suppresses the event.
analytics = load('src/lib/analytics.ts', new Map())
assert.equal(analytics.trackGrowthReviewSubmission(ack(), growthKey), false, 'refresh must not duplicate')
assert.equal(calls.length, 1)

assert.equal(analytics.trackGrowthReviewSubmission(ack({ responseOk: false }), '33333333-3333-4333-8333-333333333333'), false)
assert.equal(analytics.trackGrowthReviewSubmission(ack({ success: false }), '44444444-4444-4444-8444-444444444444'), false)
assert.equal(analytics.trackGrowthReviewSubmission(ack({ duplicate: true }), '55555555-5555-4555-8555-555555555555'), false)
assert.equal(calls.length, 1, 'failed and duplicate Growth Review acknowledgements send nothing')

assert.equal(analytics.trackContactFormSubmission(ack(), contactKey), true)
assert.equal(analytics.trackContactFormSubmission(ack(), contactKey), false)
assert.equal(analytics.trackContactFormSubmission(ack({ responseOk: false }), '66666666-6666-4666-8666-666666666666'), false)
assert.equal(analytics.trackContactFormSubmission(ack({ duplicate: true }), '77777777-7777-4777-8777-777777777777'), false)
assert.equal(calls.length, 2, 'Contact success sends once; failures and duplicates send nothing')

declined()
assert.equal(analytics.trackContactFormSubmission(ack(), '88888888-8888-4888-8888-888888888888'), false)
assert.equal(calls.length, 2, 'declined consent sends nothing')

assert.deepEqual(calls.map(([command, event, parameters]) => ({
  command,
  event,
  parameters: { ...parameters },
})), [
  {
    command: 'event',
    event: 'growth_review_submitted',
    parameters: { form_name: 'growth_review', conversion_type: 'growth_review' },
  },
  {
    command: 'event',
    event: 'contact_form_submitted',
    parameters: { form_name: 'contact', conversion_type: 'contact' },
  },
])
const serializedCalls = JSON.stringify(calls)
for (const forbidden of [
  'person@example.test',
  'Test Person',
  '+15555550123',
  'https://private.example.test',
  'private message',
  growthKey,
  contactKey,
]) {
  assert.equal(serializedCalls.includes(forbidden), false, `analytics payload must not contain ${forbidden}`)
}

const source = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')
const growthForm = source('src/components/site/growth-review/GrowthReviewForm.tsx')
const contactForm = source('src/components/site/contact/ContactForm.tsx')
const growthRoute = source('src/app/api/growth-assessment/route.ts')
const contactRoute = source('src/app/api/contact/route.ts')
const loader = source('src/components/GoogleAnalytics.tsx')

assert.match(growthForm, /trackGrowthReviewSubmission\([\s\S]*responseOk: res\.ok[\s\S]*duplicate: json\?\.duplicate/)
assert.match(contactForm, /trackContactFormSubmission\([\s\S]*responseOk: res\.ok[\s\S]*duplicate: data\?\.duplicate/)
assert.match(growthRoute, /success: true, duplicate: isRetry/)
assert.match(contactRoute, /success: true,[\s\S]*duplicate: true/)
assert.match(contactRoute, /success: true,[\s\S]*duplicate: false/)
assert.equal((loader.match(/gtag\('event', 'page_view'/g) || []).length, 1)
assert.match(loader, /send_page_view: false/)
assert.equal(source('src/lib/analytics.ts').includes("'page_view'"), false, 'conversion helper must not add page views')

console.log('PASS: backend-confirmed Growth Review and Contact conversions; duplicate/failure suppression; refresh-safe receipt deduplication; consent gating; minimal no-PII payloads; unchanged single page_view sender.')
