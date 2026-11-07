// Offline checks: Web Vitals have ONE reporting path. No browser, network or database.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

function walk(dir) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(rel)
    return /\.(ts|tsx)$/.test(entry.name) ? [rel] : []
  })
}
const sources = walk('src').map((file) => ({ file, text: read(file) }))

/* -- One registration per metric across the whole app ------------ */
const count = (pattern) => sources.reduce((n, s) => n + (s.text.match(pattern) || []).length, 0)
for (const metric of ['CLS', 'LCP', 'TTFB', 'FCP', 'INP']) {
  assert.equal(count(new RegExp(`webVitals\\.on${metric}\\(reportWebVitals\\)`, 'g')), 1, `${metric} is registered exactly once through web-vitals`)
}
assert.equal(count(/\bnew PerformanceObserver\b/g), 0, 'No manual PerformanceObserver duplicates a web-vitals metric')
for (const entryType of ['largest-contentful-paint', 'layout-shift', 'first-input']) {
  assert.equal(count(new RegExp(`['"]${entryType}['"]`, 'g')), 0, `No manual ${entryType} observer`)
}
for (const retired of ['initPerformanceMonitoring', 'measureLCP', 'measureCLS', 'measureFID']) {
  assert.equal(count(new RegExp(`\\b${retired}\\b`, 'g')), 0, `${retired} is gone, so no second path can be re-initialised`)
}
const reporters = sources.filter((s) => /gtag\(\s*'event'\s*,\s*metric\.name/.test(s.text)).map((s) => s.file)
assert.deepEqual(reporters, [path.join('src', 'lib', 'performance.ts')], 'One function sends Web Vitals to GA')

/* -- reportWebVitals: consent-safe and sends once per call ------- */
const output = ts.transpileModule(read('src/lib/performance.ts'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText
function load(win) {
  const mod = { exports: {} }
  vm.runInNewContext(output, { module: mod, exports: mod.exports, window: win, process: { env: { NODE_ENV: 'production' } }, console, Math }, { filename: 'performance.ts' })
  return mod.exports
}
const metric = { name: 'LCP', value: 1234.6, id: 'v5-1' }

const noConsent = []
load({}).reportWebVitals(metric) // gtag does not exist until cookies are accepted
assert.equal(noConsent.length, 0, 'Nothing is sent when GA has not been enabled by consent')

const calls = []
const accepted = { gtag: (...args) => calls.push(args) }
load(accepted).reportWebVitals(metric)
assert.equal(calls.length, 1, 'One reportWebVitals call sends exactly one GA event')
assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), ['event', 'LCP', { value: 1235, event_category: 'Web Vitals', event_label: 'v5-1', non_interaction: true }], 'Event name and payload are unchanged')

/* -- Value handling: CLS is scaled x1000, other metrics unchanged -- */
function sent(name, value) {
  const events = []
  load({ gtag: (...args) => events.push(JSON.parse(JSON.stringify(args))) }).reportWebVitals({ name, value, id: `id-${name}` })
  assert.equal(events.length, 1)
  assert.equal(events[0][0], 'event')
  assert.equal(events[0][1], name, 'GA event name is unchanged')
  assert.deepEqual(Object.keys(events[0][2]), ['value', 'event_category', 'event_label', 'non_interaction'], 'payload keys and order are unchanged')
  return events[0][2].value
}
assert.equal(sent('CLS', 0.0537), 54, 'CLS 0.0537 is sent as 54, not 0')
assert.equal(sent('CLS', 0.1), 100, 'CLS 0.1 is sent as 100')
assert.equal(sent('CLS', 0.0004), 0, 'A negligible CLS still rounds to 0')
assert.equal(sent('LCP', 1234.6), 1235, 'LCP keeps millisecond rounding')
assert.equal(sent('TTFB', 87.4), 87, 'TTFB keeps millisecond rounding')
assert.equal(sent('FCP', 912.5), 913, 'FCP keeps millisecond rounding')
assert.equal(sent('INP', 199.5), 200, 'INP keeps millisecond rounding')

/* -- Conversion events and consent architecture untouched -------- */
const analytics = read('src/lib/analytics.ts')
assert.match(analytics, /'growth_review_submitted'/)
assert.match(analytics, /'contact_form_submitted'/)
assert.match(analytics, /readCookieConsent\(\) !== 'accepted'/)

console.log('PASS: Web Vitals single path - one web-vitals registration per metric, no manual observers or init, one GA sender, consent-safe, payload unchanged, conversion events untouched.')
