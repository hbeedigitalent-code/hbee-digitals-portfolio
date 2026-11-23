// Email: Resend is constructed at send time, never at import (so `next build` does not need RESEND_API_KEY).
//
// OFFLINE. Uses the REAL `resend` package (constructing a client makes no network call) and the real email modules. No email is sent.
// WHAT IT DOES NOT PROVE: delivery, templates or provider behaviour — those are unchanged and covered by the existing email tests.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')

let passed = 0
const failures = []
async function test(name, fn) {
  try {
    await fn()
    passed++
    console.log('  ok   ' + name)
  } catch (error) {
    failures.push({ name, error })
    console.log('  FAIL ' + name + '\n       ' + String(error && error.message).split('\n').join('\n       '))
  }
}

// TS → CommonJS loader with "@/" aliases; CSS modules and next/server-only are not needed by the email modules.
function makeLoader() {
  const cache = new Map()
  const resolveFile = (base) => {
    for (const c of [base, base + '.ts', base + '.tsx', base + '/index.ts']) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c
    throw new Error('cannot resolve ' + base)
  }
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports
    const mod = { exports: {} }
    cache.set(file, mod)
    const requireFn = (name) => {
      if (name.startsWith('@/')) return load(resolveFile(path.join(root, 'src', name.slice(2))))
      if (name.startsWith('.')) return load(resolveFile(path.resolve(path.dirname(file), name)))
      return require(name)
    }
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
    new Function('require', 'module', 'exports', js)(requireFn, mod, mod.exports)
    return mod.exports
  }
  return (rel) => load(path.join(root, rel))
}

const FILES = [
  'src/lib/emails/bfcm-checklist-acknowledgement.ts', 'src/lib/emails/contact-acknowledgement.ts', 'src/lib/emails/growth-assessment-confirmation.ts',
  'src/lib/emails/growth-review-request-acknowledgement.ts', 'src/lib/emails/admin-growth-assessment-notification.ts',
  'src/lib/emails/hos/approved-growth-support.ts', 'src/lib/emails/hos/assessment-received.ts', 'src/lib/emails/hos/conditionally-approved.ts',
  'src/lib/emails/hos/growth-profile-ready.ts', 'src/lib/emails/hos/growth-program-approved.ts', 'src/lib/emails/hos/growth-program-declined.ts',
  'src/lib/emails/hos/not-yet-ready.ts', 'src/lib/emails/hos/portal-invitation.ts', 'src/lib/emails/hos/proposal-ready.ts',
  'src/lib/emails/hos/review-started.ts', 'src/lib/emails/hos/welcome.ts',
]

;(async () => {
  console.log('Resend is lazy')
  const saved = process.env.RESEND_API_KEY

  await test('L1 no source file constructs Resend at module scope from an unguarded env read', () => {
    const walk = (d) => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))
    for (const f of walk('src').filter((f) => /\.tsx?$/.test(f))) {
      const src = read(f.replace(/\\/g, '/'))
      for (const line of src.split('\n')) {
        // top-level (unindented) `const x = new Resend(process.env.…)` is the build-breaking shape
        assert.ok(!/^(export )?const \w+ = new Resend\(\s*process\.env/.test(line), `${f}: ${line.trim()}`)
      }
    }
  })

  await test('L2 the 16 formerly unguarded modules use getResend() at the send site and no longer import the SDK directly', () => {
    for (const f of FILES) {
      const src = read(f)
      assert.ok(src.includes("import { getResend } from '@/lib/emails/resend-client'"), f)
      assert.ok(!/from 'resend'/.test(src) && !/new Resend\(/.test(src), f + ' has no direct SDK use')
      assert.equal((src.match(/getResend\(\)\.emails\.send\(/g) || []).length, 1, f + ' sends through getResend() exactly once')
    }
  })

  await test('L3 importing every one of those modules with RESEND_API_KEY ABSENT does not throw (this was the build failure)', () => {
    delete process.env.RESEND_API_KEY
    // The real SDK still throws on `new Resend(undefined)`: that is why construction had to move.
    assert.throws(() => new (require('resend').Resend)(undefined), /Missing API key/)
    for (const f of FILES) {
      const load = makeLoader()
      assert.doesNotThrow(() => load(f), f)
    }
  })

  await test('L4 the helper: key absent → EmailConfigurationError, a safe message, nothing exposed', () => {
    delete process.env.RESEND_API_KEY
    const load = makeLoader()
    const { getResend } = load('src/lib/emails/resend-client.ts')
    const { EmailConfigurationError } = load('src/lib/emails/layout.ts')
    let caught
    try { getResend() } catch (e) { caught = e }
    assert.ok(caught instanceof EmailConfigurationError)
    assert.equal(caught.reason, 'missing_api_key')
    assert.equal(caught.message, 'RESEND_API_KEY is not configured')
    process.env.RESEND_API_KEY = ''
    assert.throws(() => getResend(), /not configured/, 'an empty key is treated as absent')
  })

  await test('L5 the helper: key present → a real client, cached per key, rebuilt only if the key changes', () => {
    const load = makeLoader()
    const { getResend } = load('src/lib/emails/resend-client.ts')
    const { Resend } = require('resend')
    process.env.RESEND_API_KEY = 're_test_not_a_real_key'
    const a = getResend(), b = getResend()
    assert.ok(a instanceof Resend && a === b)
    process.env.RESEND_API_KEY = 're_test_other_key'
    assert.notEqual(getResend(), a)
  })

  await test('L6 sending with the key absent is a contained "configuration" outcome: logged, not sent, no fake success', async () => {
    delete process.env.RESEND_API_KEY
    const savedOrigin = process.env.NEXT_PUBLIC_SITE_URL
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.test' // so the email renders and the Resend step is what fails
    const logs = []
    const origErr = console.error
    console.error = (...a) => logs.push(a.join(' '))
    try {
      const load = makeLoader()
      const { sendChecklistAcknowledgementEmail } = load('src/lib/emails/bfcm-checklist-acknowledgement.ts')
      const result = await sendChecklistAcknowledgementEmail({ email: 'visitor@example.test', idempotencyKey: 'k1' })
      assert.equal(result.ok, false)
      assert.equal(result.outcome, 'configuration')
      assert.equal(result.reason, 'missing_api_key')
      assert.ok(logs.some((l) => /NOT SENT — configuration error \(missing_api_key\): RESEND_API_KEY is not configured/.test(l)), 'a useful server-side log line')
    } finally {
      console.error = origErr
      if (savedOrigin === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
      else process.env.NEXT_PUBLIC_SITE_URL = savedOrigin
    }
  })

  await test('L7 the already-guarded modules and the already-lazy commerce sender are untouched', () => {
    for (const f of ['src/app/api/send-newsletter/route.ts', 'src/lib/emails/admin-contact-notification.ts', 'src/lib/emails/admin-onboarding-notification.ts', 'src/lib/emails/contact-confirmation.ts', 'src/lib/emails/onboarding-confirmation.ts']) {
      assert.ok(/new Resend\(resendApiKey\)/.test(read(f)) && /resendApiKey \?/.test(read(f)), f)
    }
    assert.ok(/const resend = new Resend\(process\.env\.RESEND_API_KEY\)/.test(read('src/lib/commerce/transactional-email.ts')))
  })

  if (saved === undefined) delete process.env.RESEND_API_KEY
  else process.env.RESEND_API_KEY = saved
  console.log('\n' + passed + ' passed, ' + failures.length + ' failed')
  process.exit(failures.length ? 1 : 0)
})()
