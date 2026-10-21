// Offline only: actual modules, synthetic environment, fake clock/DOM, mocked DB/security/fetch.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm')
const ts = require('typescript'), React = require('react'), postcss = require('postcss'), { renderToStaticMarkup } = require('react-dom/server')
const root = path.resolve(__dirname, '..'), cache = new Map(), writes = [], selects = [], calls = []
let active, row, insertError = null, insertData = { id: 'fixture-id' }, storedStatus = 'active', settingsError = null, duplicateReadError = null, identityId = 'fixture-id', updateError = null
let allowed = true, rateDegraded = false, challengeOK = true, fetchImpl, lastRequest, blockedStorage = false
const env = { NEXT_PUBLIC_SUPABASE_URL: 'https://database.example.test', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-test-only', NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'synthetic-site-key' }
const clock = { time: 1000000, next: 0, timers: new Map(), set(fn, delay) { const id = ++this.next; this.timers.set(id, { fn, at: this.time + delay }); return id }, clear(id) { this.timers.delete(id) }, advance(ms) {
  const end = this.time + ms; let runs = 0
  while (true) { const next = [...this.timers.entries()].filter(([, t]) => t.at <= end).sort((a,b) => a[1].at - b[1].at)[0]; if (!next) break; assert.ok(++runs < 100); this.time = next[1].at; this.timers.delete(next[0]); next[1].fn() }
  this.time = end
} }
class FakeDate extends Date { constructor(...args) { super(...(args.length ? args : [clock.time])) } static now() { return clock.time } }
const local = new Map(), session = new Map(), events = new Map()
const storage = map => ({ getItem(key) { if (blockedStorage) throw Error('blocked'); return map.get(key) ?? null }, setItem(key, value) { if (blockedStorage) throw Error('blocked'); map.set(key, value) } })
const browser = {
  localStorage: storage(local), sessionStorage: storage(session),
  addEventListener(name, callback) { if (!events.has(name)) events.set(name, new Set()); events.get(name).add(callback) },
  removeEventListener(name, callback) { events.get(name)?.delete(callback) },
  dispatchEvent(event) { for (const fn of [...(events.get(event.type) || [])]) fn(event) },
}
const oldFocus = { closest: () => null, focus() { doc.activeElement = oldFocus; calls.push('focus-restored') } }
const closeFocus = { closest: () => null, focus() { doc.activeElement = closeFocus; calls.push('close-focused') } }
const dialog = { opened: false, showModal() { this.opened = true; calls.push('showModal') }, close() { this.opened = false; calls.push('close') }, querySelector: () => closeFocus }
const doc = { hidden: false, body: { style: { overflow: 'auto' } }, activeElement: oldFocus, querySelector: () => dialog.opened ? dialog : null }
const hooks = { ...React,
  useState(initial) { if (!active) return React.useState(initial); const h = active, i = h.index++; if (!(i in h.state)) h.state[i] = typeof initial === 'function' ? initial() : initial; return [h.state[i], value => { h.state[i] = typeof value === 'function' ? value(h.state[i]) : value }] },
  useRef(initial) { if (!active) return React.useRef(initial); const h = active, i = h.index++; if (!(i in h.state)) h.state[i] = { current: initial }; return h.state[i] },
  useId() { if (!active) return React.useId(); return hooks.useRef('fixture-id').current },
  useCallback(fn, deps) { if (!active) return React.useCallback(fn, deps); const h = active, i = h.index++; const old = h.state[i]; if (!old || deps.some((v,j) => !Object.is(v, old.deps[j]))) h.state[i] = { fn, deps }; return h.state[i].fn },
  useEffect(fn, deps) { if (!active) return React.useEffect(fn, deps); const h = active, i = h.index++; const old = h.state[i]; if (!old || !deps || deps.some((v,j) => !Object.is(v, old.deps[j]))) { h.state[i] = { deps, cleanup: old?.cleanup }; h.effects.push(() => { h.state[i].cleanup?.(); h.state[i].cleanup = fn() }) } },
}
function host(Component, props, node) {
  const h = { state: [], index: 0, effects: [], tree: null }
  h.render = () => { active = h; h.index = 0; h.tree = Component(props); active = null; if (node) for (const element of all(h.tree, element => element.ref)) element.ref.current = node; for (const effect of h.effects.splice(0)) effect(); return h.tree }
  h.unmount = () => { for (const value of h.state) value?.cleanup?.() }
  return h
}
function query(table) {
  const q = { table, operation: 'read',
    select(fields) { selects.push([table, fields]); return q }, eq(column, value) { if (q.operation === 'update') calls.push(['update-filter', column, value]); return q }, limit() { return q },
    insert(value) { q.operation = 'insert'; writes.push(value); return q },
    update(value) { q.operation = 'update'; writes.push(value); return q },
    maybeSingle: () => Promise.resolve(table === 'site_settings' ? { data: { newsletter_settings: row }, error: settingsError } : table === 'footer_settings' ? { data: { social_links: [] }, error: null } : q.operation === 'update' ? { data: { id: identityId }, error: updateError } : { data: { status: storedStatus }, error: duplicateReadError }),
    single: () => Promise.resolve({ data: insertData, error: insertError }),
  }; return q
}
function load(relative) {
  let file = path.resolve(root, relative)
  if (!path.extname(file)) file = ['.ts', '.tsx'].map(ext => file + ext).find(fs.existsSync)
  if (cache.has(file)) return cache.get(file).exports
  const mod = { exports: {} }; cache.set(file, mod)
  const localRequire = name => {
    if (name === 'react') return hooks
    if (name === 'next/server') return { NextResponse: class extends Response { static json(body, options) { return Response.json(body, options) } } }
    if (name === 'next/link') return { __esModule: true, default: 'a' }
    if (name === 'next/cache') return { unstable_cache: (fn, keys, options) => { assert.equal(options.revalidate, 60); return fn } }
    if (name === 'next/image') return { __esModule: true, default: ({ fill, priority, ...props }) => React.createElement('img', props) }
    if (name === '@supabase/supabase-js') return { createClient() { calls.push('db-created'); return { from: query, rpc(name, args) {
      assert.equal(name, 'newsletter_subscriber_identity'); calls.push(['normalized-identity', args.p_email])
      return { returns() { return this }, maybeSingle: async () => ({ data: identityId ? { id: identityId, status: storedStatus } : null, error: duplicateReadError }) }
    } } } }
    if (name === '@/lib/supabase') return { supabase: { from: query } }
    if (name === '@/lib/site-settings') return { SITE_SETTINGS_KEY: 'site', fetchSiteSettings: async () => ({ data: { contact_email: 'owner@example.test', footer_description: 'Stored plain description', newsletter_settings: row }, error: null }) }
    if (name === '@/lib/rate-limit') return { checkRateLimit: async name => { assert.equal(name, 'newsletter'); return { ok: allowed, degraded: rateDegraded, retryAfterSeconds: 60 } }, getClientIp: () => 'test-ip', rateLimitMessage: () => 'Please wait.' }
    if (name === '@/lib/turnstile') return { verifyTurnstileToken: async () => ({ ok: challengeOK, reason: 'invalid' }), turnstileFailureMessage: () => 'Please complete the security check.' }
    if (name === '@/components/ui/TurnstileWidget') return { __esModule: true, default: function SecurityWidget() { return null } }
    if (name.endsWith('.module.css')) return new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) })
    if (name.startsWith('@/')) return load('src/' + name.slice(2))
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file), name)))
    return require(name)
  }
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  vm.runInNewContext(code, { module: mod, exports: mod.exports, require: localRequire, process: { env }, URL, Response, Request, Event, Error, Date: FakeDate,
    window: file.endsWith('footer-data.ts') ? undefined : browser, document: doc,
    setTimeout: (fn, delay) => clock.set(fn, delay), clearTimeout: id => clock.clear(id),
    fetch: async (...args) => { lastRequest = args; if (!fetchImpl) throw Error('Unexpected network access prohibited'); return fetchImpl(...args) }, console,
  }, { filename: file })
  return mod.exports
}
function freshClient() {
  cache.delete(path.resolve(root, 'src/lib/newsletter-client.ts'))
  cache.delete(path.resolve(root, 'src/components/site/layout/SiteNewsletterPopup.tsx'))
  local.clear(); session.clear(); events.clear(); clock.timers.clear(); blockedStorage = false
  return load('src/lib/newsletter-client.ts')
}
function all(node, predicate) { if (!node || typeof node !== 'object') return []; return [...(predicate(node) ? [node] : []), ...React.Children.toArray(node.props?.children).flatMap(child => all(child, predicate))] }

async function main() {
  const model = load('src/lib/footer-settings.ts')
  assert.equal(model.NEWSLETTER_CONSENT, 'I agree to receive Hbee Digitals insights and updates by email. I can unsubscribe at any time.')
  assert.equal(model.NEWSLETTER_CONSENT_VERSION, 'newsletter-v1')
  row = { ...model.NEWSLETTER_DEFAULTS, enabled: true, footer_enabled: true, popup_enabled: true }
  const { POST } = load('src/app/api/subscribe/route.ts')
  const body = { email: ' Person@Example.test ', source: 'footer', consent: true, consent_version: model.NEWSLETTER_CONSENT_VERSION, turnstile_token: 'synthetic-token' }
  const request = (value, headers = {}, raw) => new Request('https://site.example.test/api/subscribe', { method: 'POST', headers: { origin: 'https://site.example.test', 'Content-Type': 'application/json', ...headers }, body: raw ?? JSON.stringify(value) })
  let res = await POST(request(body)); assert.equal(res.status, 200); assert.equal((await res.json()).already_subscribed, false)
  assert.equal(writes.at(-1).email, 'person@example.test'); assert.equal(writes.at(-1).consent_source, 'footer'); assert.equal(writes.at(-1).consent_version, 'newsletter-v1'); assert.ok(Number.isFinite(Date.parse(writes.at(-1).consent_given_at)))
  assert.deepEqual(Object.keys(writes.at(-1)).sort(), ['consent_given_at','consent_source','consent_version','created_at','email','name','source','status'])
  assert.equal(model.normalizedEmail('  Person@Example.test  '), 'person@example.test')
  assert.equal(model.normalizedEmail('\tPerson@Example.test\t'), null)
  assert.equal(model.normalizedEmail('İ@example.test', true), null)
  assert.equal(model.normalizedEmail('K@example.test', true), null)
  for (const patch of [{ email: 'invalid' }, { email: {} }, { email: 'İ@example.test' }, { consent: false }, { consent: 'true' }, { consent_version: 'unrecognized' }, { source: 'invented' }]) {
    const before = writes.length; res = await POST(request({ ...body, ...patch })); assert.equal(res.status, 400); assert.equal(writes.length, before)
  }
  assert.equal((await POST(request(body, {}, '['))).status, 400)
  assert.equal((await POST(request(body, { origin: 'https://other.test' }))).status, 403)
  assert.equal((await POST(request(body, { 'sec-fetch-site': 'cross-site' }))).status, 403)
  assert.equal((await POST(request(body, { 'content-length': '9000' }))).status, 400)
  allowed = false; res = await POST(request(body)); assert.equal(res.status, 429); assert.equal(res.headers.get('retry-after'), '60'); allowed = true
  rateDegraded = true; { const before = writes.length; assert.equal((await POST(request(body))).status, 503); assert.equal(writes.length, before) }; rateDegraded = false
  challengeOK = false; { const before = writes.length; assert.equal((await POST(request(body))).status, 400); assert.equal(writes.length, before) }; challengeOK = true
  insertError = { code: '23505' }; res = await POST(request(body)); assert.equal((await res.json()).already_subscribed, true)
  for (const status of ['unsubscribed', 'bounced', null]) { storedStatus = status; assert.equal((await POST(request(body))).status, 409) }
  duplicateReadError = { message: 'private detail' }; assert.equal((await POST(request(body))).status, 409); duplicateReadError = null; storedStatus = 'active'
  insertError = { code: '42703', message: 'private schema detail' }; res = await POST(request(body)); assert.equal(res.status, 503); assert.ok(!JSON.stringify(await res.json()).includes('schema detail'))
  insertError = null; insertData = null; assert.equal((await POST(request(body))).status, 503); insertData = { id: 'fixture-id' }
  row = null; assert.equal((await POST(request(body))).status, 503)
  row = { ...model.NEWSLETTER_DEFAULTS }; assert.equal((await POST(request(body))).status, 503)
  row = { ...model.NEWSLETTER_DEFAULTS, enabled: false, footer_enabled: true, popup_enabled: true }; assert.equal((await POST(request(body))).status, 503); assert.equal((await POST(request({ ...body, source: 'popup' }))).status, 503)
  row = { ...model.NEWSLETTER_DEFAULTS, enabled: true, popup_enabled: true }; assert.equal((await POST(request(body))).status, 503); assert.equal((await POST(request({ ...body, source: 'popup' }))).status, 200)
  row = { ...model.NEWSLETTER_DEFAULTS, enabled: true, footer_enabled: true, popup_enabled: true }
  settingsError = { code: '42703' }; assert.equal((await POST(request(body))).status, 503); settingsError = null
  const key = env.SUPABASE_SERVICE_ROLE_KEY; delete env.SUPABASE_SERVICE_ROLE_KEY; assert.equal((await POST(request(body))).status, 503); env.SUPABASE_SERVICE_ROLE_KEY = key

  // Historical case/space identity uses the restricted RPC for both duplicates and unsubscribe.
  assert.ok(calls.some(call => Array.isArray(call) && call[0] === 'normalized-identity' && call[1] === 'person@example.test'))
  const unsubscribe = load('src/app/api/unsubscribe/route.ts').GET
  const unsubscribeRequest = { nextUrl: new URL('https://site.example.test/api/unsubscribe?email=%20Person%40Example.test%20') }
  res = await unsubscribe(unsubscribeRequest); assert.match(await res.text(), /You Have Been Unsubscribed/)
  res = await unsubscribe({ nextUrl: new URL('https://site.example.test/api/unsubscribe?email=%C4%B0%40example.test') }); assert.match(await res.text(), /You Have Been Unsubscribed/)
  assert.ok(calls.some(call => Array.isArray(call) && call[0] === 'normalized-identity' && call[1] === 'İ@example.test'), 'Historical Unicode spelling reaches database lower() unchanged')
  assert.equal(writes.at(-1).status, 'unsubscribed'); assert.ok(calls.some(call => Array.isArray(call) && call[0] === 'update-filter' && call[1] === 'id' && call[2] === identityId))
  const beforeMissing = writes.length; identityId = null; res = await unsubscribe(unsubscribeRequest); assert.match(await res.text(), /No Subscription Found/); assert.equal(writes.length, beforeMissing); identityId = 'fixture-id'
  duplicateReadError = { code: 'missing-rpc' }; res = await unsubscribe(unsubscribeRequest); assert.equal(res.status, 503); assert.match(await res.text(), /NOT been unsubscribed/); duplicateReadError = null
  updateError = { code: 'denied', message: 'synthetic failure' }; res = await unsubscribe(unsubscribeRequest); assert.equal(res.status, 503); assert.match(await res.text(), /NOT been unsubscribed/); updateError = null

  assert.equal(model.readNewsletterSettings({ footer_enabled: true }).footer_enabled, false)
  assert.equal(model.readNewsletterSettings({ ...row, enabled: undefined }).enabled, false)
  for (const patch of [{ popup_delay_seconds: 1 }, { popup_delay_seconds: 301 }, { headline: '<b>HTML</b>' }]) assert.throws(() => model.parseNewsletterSettings({ ...row, ...patch }))
  const profiles = [
    { platform: 'LinkedIn', url: 'https://www.linkedin.com/company/real', is_active: true },
    { platform: 'Instagram', url: 'https://instagram.com/real', is_active: false },
    { platform: 'YouTube', url: '', is_active: true }, { platform: 'X', url: 'javascript:alert(1)', is_active: true },
    { platform: 'Facebook', url: 'https://facebook.com.evil.test/real', is_active: true },
  ]
  assert.deepEqual(Array.from(model.publicSocialProfiles(profiles), item => item.label), ['LinkedIn'])
  assert.equal(model.publicSocialProfiles('invalid-json').length, 0)
  const historical = { platform: 'Legacy', url: 'untouched', icon: 'custom', is_active: false }
  assert.equal(model.socialProfilesPayload([historical]).social_links[0].url, 'untouched')
  assert.throws(() => model.socialProfilesPayload([profiles[2]]))
  const sitePayload = model.footerSitePayload('OWNER@EXAMPLE.TEST', 'Stored text', row)
  assert.deepEqual(Object.keys(sitePayload).sort(), ['contact_email','footer_description','newsletter_settings','updated_at'])
  assert.equal(sitePayload.contact_email, 'owner@example.test'); assert.ok(!('newsletter_settings' in model.footerSitePayload('', '', undefined)))
  const footerData = load('src/lib/site/footer-data.ts')
  row = null
  const defaultFooter = await footerData.getFooterExperience()
  assert.equal(defaultFooter.newsletter.enabled, false); assert.equal(defaultFooter.newsletter.footer_enabled, false); assert.equal(defaultFooter.newsletter.popup_enabled, false)
  row = { ...model.NEWSLETTER_DEFAULTS, enabled: true, footer_enabled: true, popup_enabled: true }
  const publicFooter = await footerData.getFooterExperience()
  assert.equal(publicFooter.contactEmail, 'owner@example.test'); assert.equal(publicFooter.description, 'Stored plain description'); assert.equal(publicFooter.newsletter.popup_delay_seconds, 240)

  let client = freshClient(), failures = 0
  fetchImpl = async () => Response.json({ success: true, already_subscribed: false })
  await client.subscribeNewsletter({ email: 'a@example.test', consent: true, token: 'test', source: 'footer' })
  assert.equal(lastRequest[0], '/api/subscribe'); assert.equal(JSON.parse(lastRequest[1].body).consent_version, 'newsletter-v1'); assert.equal(client.newsletterPopupSuppressed(), true)
  client = freshClient(); fetchImpl = async () => Response.json({ error: 'Please retry.' }, { status: 503 })
  await assert.rejects(client.subscribeNewsletter({ email: 'a@example.test', consent: true, token: 'test', source: 'popup' })); assert.equal(client.newsletterPopupSuppressed(), false)
  for (const patch of [{ consent: false }, { token: '' }, { email: 'invalid' }]) { fetchImpl = async () => { failures++; throw Error('Must not fetch') }; await assert.rejects(client.subscribeNewsletter({ email: 'a@example.test', consent: true, token: 'test', source: 'popup', ...patch })) }; assert.equal(failures, 0)
  fetchImpl = async () => Response.json({ success: false }); await assert.rejects(client.subscribeNewsletter({ email: 'a@example.test', consent: true, token: 'test', source: 'footer' })); assert.equal(client.newsletterPopupSuppressed(), false)

  client = freshClient(); let opened = 0
  let cancel = client.scheduleNewsletterPopup({ delaySeconds: 240, canOpen: () => true, onOpen: () => opened++ })
  clock.advance(239999); assert.equal(opened, 0); clock.advance(1); assert.equal(opened, 1); clock.advance(300000); assert.equal(opened, 1); cancel()
  client.dismissNewsletterPopup(); assert.equal(client.newsletterPopupSuppressed(), true); clock.advance(7 * 86400000 + 1); assert.equal(client.newsletterPopupSuppressed(), false)
  client = freshClient(); opened = 0; cancel = client.scheduleNewsletterPopup({ delaySeconds: 240, canOpen: () => true, onOpen: () => opened++ }); clock.advance(120000); cancel()
  cancel = client.scheduleNewsletterPopup({ delaySeconds: 240, canOpen: () => true, onOpen: () => opened++ }); clock.advance(119999); assert.equal(opened, 0); clock.advance(1); assert.equal(opened, 1); cancel()
  client = freshClient(); opened = 0; let ready = false
  cancel = client.scheduleNewsletterPopup({ delaySeconds: 240, canOpen: () => ready, onOpen: () => opened++ }); clock.advance(240000); assert.equal(opened, 0); ready = true; clock.advance(30000); assert.equal(opened, 1); cancel()
  client = freshClient(); blockedStorage = true; client.dismissNewsletterPopup(); assert.equal(client.newsletterPopupSuppressed(), true); blockedStorage = false

  // Actual popup component effects: native modal, cookie priority, Escape and focus restoration.
  client = freshClient(); local.set('hbee_cookie_consent', 'declined'); doc.activeElement = oldFocus
  const { SiteNewsletterPopup } = load('src/components/site/layout/SiteNewsletterPopup.tsx')
  const popup = host(SiteNewsletterPopup, { settings: row }, dialog)
  popup.render(); clock.advance(239999); popup.render(); assert.equal(dialog.opened, false)
  clock.advance(1); popup.render(); assert.equal(dialog.opened, true); assert.equal(doc.body.style.overflow, 'hidden'); assert.equal(doc.activeElement, closeFocus)
  assert.equal(popup.tree.type, 'dialog'); assert.equal(popup.tree.props['aria-modal'], 'true')
  let prevented = false; popup.tree.props.onCancel({ preventDefault() { prevented = true } }); popup.render()
  assert.equal(prevented, true); assert.equal(dialog.opened, false); assert.equal(doc.body.style.overflow, 'auto'); assert.equal(doc.activeElement, oldFocus)
  popup.unmount(); assert.equal([...events.values()].reduce((n, list) => n + list.size, 0), 0)
  assert.equal(client.newsletterPopupSuppressed(), true)
  client = freshClient()
  const hiddenPopup = host(load('src/components/site/layout/SiteNewsletterPopup.tsx').SiteNewsletterPopup, { settings: row }, dialog)
  hiddenPopup.render(); clock.advance(240000); hiddenPopup.render(); assert.equal(dialog.opened, false, 'Cookie controls take priority')
  client.markNewsletterSubscribed(); browser.dispatchEvent(new Event('hbee-cookie-consent')); clock.advance(60000); hiddenPopup.render(); assert.equal(dialog.opened, false, 'Subscription cancels pending popup')
  hiddenPopup.unmount()
  client = freshClient()
  const disabledPopup = host(load('src/components/site/layout/SiteNewsletterPopup.tsx').SiteNewsletterPopup, { settings: { ...row, enabled: false } }, dialog)
  disabledPopup.render(); assert.equal(disabledPopup.tree, null); assert.equal(clock.timers.size, 0, 'Disabled capture creates no popup timer')
  assert.equal(session.has('hbee:newsletter:started-at'), false, 'Disabled capture creates no timer suppression state')
  assert.equal(local.has('hbee:newsletter:dismissed-until'), false, 'Disabled capture creates no dismissal state')
  clock.advance(300000); disabledPopup.render(); assert.equal(dialog.opened, false); disabledPopup.unmount()

  // Actual form submit handler: backend result, validation and failed-save input preservation.
  const { NewsletterForm } = load('src/components/site/layout/NewsletterForm.tsx')
  const form = host(NewsletterForm, { source: 'footer' })
  form.render(); all(form.tree, el => el.type === 'input' && el.props.type === 'email')[0].props.onChange({ target: { value: 'person@example.test' } })
  all(form.tree, el => el.type === 'input' && el.props.type === 'checkbox')[0].props.onChange({ target: { checked: true } }); form.tree.props.onFocusCapture(); form.render()
  all(form.tree, el => el.type?.name === 'SecurityWidget')[0].props.onVerify('test'); form.render()
  fetchImpl = async () => Response.json({ error: 'Please retry.' }, { status: 503 })
  await form.tree.props.onSubmit({ preventDefault() {} }); form.render(); assert.equal(all(form.tree, el => el.props?.role === 'alert')[0].props.children, 'Please retry.')
  assert.equal(all(form.tree, el => el.type === 'input' && el.props.type === 'email')[0].props.value, 'person@example.test')
  assert.equal(all(form.tree, el => el.type === 'input' && el.props.type === 'checkbox')[0].props.checked, true)
  all(form.tree, el => el.type?.name === 'SecurityWidget')[0].props.onVerify('retry-token'); form.render()
  fetchImpl = async () => Response.json({ success: true, already_subscribed: true })
  await form.tree.props.onSubmit({ preventDefault() {} }); form.render(); assert.equal(form.tree.props.role, 'status'); assert.equal(form.tree.props.children, 'You are already subscribed.')

  const { SiteFooter } = load('src/components/site/layout/SiteFooter.tsx')
  const html = renderToStaticMarkup(React.createElement(SiteFooter, { newsletter: row, social: model.publicSocialProfiles(profiles) }))
  assert.match(html, /data-newsletter-slot="active"/); assert.match(html, /type="email"/); assert.match(html, /type="checkbox" required=""/); assert.match(html, /linkedin.com/); assert.ok(!html.includes('instagram.com'))
  const disabledHtml = renderToStaticMarkup(React.createElement(SiteFooter, { newsletter: { ...row, enabled: false } }))
  assert.match(disabledHtml, /data-newsletter-slot="reserved"/); assert.ok(!disabledHtml.includes('type="email"'))
  for (const part of ['class="boundary"', 'class="wordmark"', 'class="motif"', '<details', 'aria-label="Legal"']) assert.ok(html.includes(part))
  const css = postcss.parse(fs.readFileSync(path.join(root, 'src/components/site/layout/newsletter.module.css'), 'utf8'))
  assert.ok(css.nodes.some(node => node.selector === '.popup' && node.nodes.some(decl => decl.prop === 'max-height' && decl.value.includes('svh'))))
  assert.match(css.toString(), /safe-area-inset-bottom/)

  // Shared Turnstile script: two forms can mount before it loads; no duplicate script or dead widget.
  const oldQuery = doc.querySelector
  let sharedScript, appended = 0, rendered = 0
  const removed = [], callbacks = []
  const scriptEvents = new Map()
  const script = { addEventListener(name, fn) { if (!scriptEvents.has(name)) scriptEvents.set(name, new Set()); scriptEvents.get(name).add(fn) }, removeEventListener(name, fn) { scriptEvents.get(name)?.delete(fn) } }
  doc.querySelector = () => sharedScript
  doc.createElement = () => script
  doc.head = { appendChild(value) { sharedScript = value; appended++ } }
  const Widget = load('src/components/ui/TurnstileWidget.tsx').default
  const firstWidget = host(Widget, { onVerify() {}, onError() {} }, { innerHTML: '' }), secondWidget = host(Widget, { onVerify() {}, onError() {} }, { innerHTML: '' })
  firstWidget.render(); secondWidget.render(); assert.equal(appended, 1); assert.equal(rendered, 0)
  browser.turnstile = { render(node, options) { callbacks.push(options.callback); return `widget-${++rendered}` }, remove(id) { removed.push(id) } }
  for (const ready of scriptEvents.get('load')) ready()
  firstWidget.render(); secondWidget.render(); assert.equal(rendered, 2)
  firstWidget.unmount(); assert.deepEqual(removed, ['widget-1']); assert.equal(scriptEvents.get('load').size, 1)
  secondWidget.unmount(); assert.deepEqual(removed, ['widget-1', 'widget-2']); assert.equal(scriptEvents.get('load').size, 0)
  doc.querySelector = oldQuery
  console.log('PASS: canonical API/persistence/validation/consent/duplicates/opt-outs/failures/origin/rate-limit/challenge/feature gates; settings mapping/social validation; shared transport; delay/navigation/dismissal/subscription suppression/storage fallback; actual form handlers and native-dialog open/Escape/focus effects; approved footer markup/mobile CSS. No production or browser execution.')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
