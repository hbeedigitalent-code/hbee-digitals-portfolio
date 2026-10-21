// Offline only: actual signing/API/page modules with synthetic secrets and a mocked service-role database.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const React = require('react')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const secret = 'synthetic-random-unsubscribe-secret-32-bytes-minimum'
const env = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://database.example.test',
  SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-role-key',
  NEWSLETTER_UNSUBSCRIBE_SECRET: secret,
}
const cache = new Map()
let identity, identityError, updateError, updateId, dbCreated, writes, calls

function reset(status = 'active') {
  identity = { id: '11111111-1111-4111-8111-111111111111', status }
  identityError = null
  updateError = null
  updateId = identity.id
  dbCreated = 0
  writes = []
  calls = []
}

function database() {
  return {
    rpc(name, args) {
      calls.push(['rpc', name, args])
      return { returns() { return this }, async maybeSingle() { return { data: identity, error: identityError } } }
    },
    from(table) {
      const query = {
        update(payload) { writes.push({ table, payload }); return query },
        eq(column, value) { calls.push(['eq', column, value]); return query },
        select(columns) { calls.push(['select', columns]); return query },
        async maybeSingle() { return { data: updateId ? { id: updateId } : null, error: updateError } },
      }
      return query
    },
  }
}

function load(relative) {
  let file = path.resolve(root, relative)
  if (!fs.existsSync(file)) file = ['.ts', '.tsx'].map(ext => file + ext).find(fs.existsSync)
  if (cache.has(file)) return cache.get(file).exports
  const mod = { exports: {} }
  cache.set(file, mod)
  const localRequire = name => {
    if (name === 'server-only') return {}
    if (name === 'next/server') return { NextResponse: class extends Response { static json(body, options) { return Response.json(body, options) } } }
    if (name === '@supabase/supabase-js') return { createClient(url, key) {
      assert.equal(url, env.NEXT_PUBLIC_SUPABASE_URL); assert.equal(key, env.SUPABASE_SERVICE_ROLE_KEY); dbCreated++
      return database()
    } }
    if (name === '@/components/site/unsubscribe/UnsubscribeExperience') {
      return { UnsubscribeExperience: props => React.createElement('unsubscribe-experience', props) }
    }
    if (name.startsWith('@/')) return load('src/' + name.slice(2))
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file), name)))
    return require(name)
  }
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  vm.runInNewContext(code, {
    module: mod, exports: mod.exports, require: localRequire, process: { env },
    URL, URLSearchParams, Response, Request, Headers, Buffer, fetch: () => { throw Error('Unexpected network access') }, console,
  }, { filename: file })
  return mod.exports
}

function request(body, headers = {}) {
  return new Request('https://www.hbeedigitals.com/api/unsubscribe', {
    method: 'POST',
    headers: { origin: 'https://www.hbeedigitals.com', 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

async function main() {
  reset()
  const signing = load('src/lib/newsletter-unsubscribe.server.ts')
  const signed = signing.signNewsletterUnsubscribeIdentity(' Person@Example.test ', secret)
  assert.equal(signed.email, 'person@example.test')
  assert.match(signed.signature, /^[0-9a-f]{64}$/)
  assert.equal(signing.verifyNewsletterUnsubscribeIdentity('PERSON@example.test', signed.signature, secret), 'person@example.test')
  assert.equal(signing.verifyNewsletterUnsubscribeIdentity('other@example.test', signed.signature, secret), null)
  assert.equal(signing.verifyNewsletterUnsubscribeIdentity(signed.email, signed.signature.replace(/^./, signed.signature[0] === 'a' ? 'b' : 'a'), secret), null)
  assert.throws(() => signing.signNewsletterUnsubscribeIdentity(signed.email, 'too-short'))
  assert.match(fs.readFileSync(path.join(root, 'src/lib/newsletter-unsubscribe.server.ts'), 'utf8'), /timingSafeEqual/)
  const link = new URL(signing.createNewsletterUnsubscribeUrl('https://www.hbeedigitals.com', signed.email, secret))
  assert.equal(link.pathname, '/unsubscribe'); assert.equal(link.searchParams.get('email'), signed.email); assert.equal(link.searchParams.get('signature'), signed.signature)

  const route = load('src/app/api/unsubscribe/route.ts')
  let response = await route.GET(new Request('https://www.hbeedigitals.com/api/unsubscribe?email=person%40example.test'))
  assert.equal(response.status, 303); assert.equal(dbCreated, 0); assert.equal(writes.length, 0)
  let redirected = new URL(response.headers.get('location'))
  assert.equal(redirected.pathname, '/unsubscribe'); assert.equal(redirected.searchParams.get('reason'), 'legacy'); assert.equal(redirected.searchParams.has('email'), false)

  response = await route.GET(new Request(`https://www.hbeedigitals.com/api/unsubscribe?email=${encodeURIComponent(signed.email)}&signature=${signed.signature}`))
  redirected = new URL(response.headers.get('location'))
  assert.equal(response.status, 303); assert.equal(redirected.pathname, '/unsubscribe'); assert.equal(redirected.searchParams.get('signature'), signed.signature); assert.equal(writes.length, 0)

  reset('active')
  response = await route.POST(request(signed)); assert.equal(response.status, 200); assert.equal((await response.json()).state, 'unsubscribed')
  assert.equal(JSON.stringify(writes), JSON.stringify([{ table: 'newsletter_subscribers', payload: { status: 'unsubscribed' } }]))
  assert.ok(calls.some(call => call[0] === 'rpc' && call[1] === 'newsletter_subscriber_identity' && call[2].p_email === signed.email))
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'id' && call[2] === identity.id))

  reset('unsubscribed')
  response = await route.POST(request(signed)); assert.equal(response.status, 200); assert.equal((await response.json()).state, 'already_unsubscribed'); assert.equal(writes.length, 0)

  reset(); identity = null
  response = await route.POST(request(signed)); assert.equal(response.status, 404); assert.equal((await response.json()).state, 'not_found'); assert.equal(writes.length, 0)

  reset(); identityError = { message: 'synthetic lookup failure' }
  response = await route.POST(request(signed)); assert.equal(response.status, 503); assert.equal((await response.json()).state, 'server_failure'); assert.equal(writes.length, 0)

  reset(); updateError = { message: 'synthetic update failure' }
  response = await route.POST(request(signed)); assert.equal(response.status, 503); assert.equal((await response.json()).state, 'server_failure')

  reset(); updateId = null
  response = await route.POST(request(signed)); assert.equal(response.status, 404); assert.equal((await response.json()).state, 'not_found')

  reset('bounced')
  response = await route.POST(request(signed)); assert.equal(response.status, 200)
  assert.equal(writes[0].payload.status, 'unsubscribed'); assert.equal(Object.keys(writes[0].payload).length, 1)

  reset()
  response = await route.POST(request({ ...signed, signature: '0'.repeat(64) })); assert.equal(response.status, 400); assert.equal((await response.json()).state, 'invalid_link'); assert.equal(dbCreated, 0); assert.equal(writes.length, 0)
  response = await route.POST(request(signed, { origin: 'https://attacker.example' })); assert.equal(response.status, 403); assert.equal(dbCreated, 0)

  const page = load('src/app/(utility)/unsubscribe/page.tsx').default
  reset()
  let rendered = page({ searchParams: { email: signed.email, signature: signed.signature } })
  assert.equal(rendered.props.initialState, 'confirmation'); assert.equal(dbCreated, 0); assert.equal(writes.length, 0)
  rendered = page({ searchParams: { email: signed.email, signature: '0'.repeat(64) } })
  assert.equal(rendered.props.initialState, 'invalid_link'); assert.equal(dbCreated, 0)

  const savedSecret = env.NEWSLETTER_UNSUBSCRIBE_SECRET
  delete env.NEWSLETTER_UNSUBSCRIBE_SECRET
  rendered = page({ searchParams: { email: signed.email, signature: signed.signature } })
  assert.equal(rendered.props.initialState, 'server_failure')
  response = await route.POST(request(signed)); assert.equal(response.status, 503); assert.equal((await response.json()).state, 'server_failure')
  env.NEWSLETTER_UNSUBSCRIBE_SECRET = savedSecret

  const pageSource = fs.readFileSync(path.join(root, 'src/app/(utility)/unsubscribe/page.tsx'), 'utf8')
  const clientSource = fs.readFileSync(path.join(root, 'src/components/site/unsubscribe/UnsubscribeExperience.tsx'), 'utf8')
  const apiSource = fs.readFileSync(path.join(root, 'src/app/api/unsubscribe/route.ts'), 'utf8')
  const sendSource = fs.readFileSync(path.join(root, 'src/app/api/send-newsletter/route.ts'), 'utf8')
  assert.ok(!pageSource.includes('@/lib/supabase') && !clientSource.includes('@/lib/supabase'), 'No browser subscriber table access')
  assert.ok(!clientSource.includes('useEffect'), 'The public page never auto-submits on mount')
  assert.match(apiSource, /SUPABASE_SERVICE_ROLE_KEY/); assert.match(apiSource, /\.eq\('id', identity\.data\.id\)/)
  assert.ok(!sendSource.includes('/api/unsubscribe?email=')); assert.match(sendSource, /createNewsletterUnsubscribeUrl/)
  for (const copy of [
    'Leave the Hbee Digitals newsletter?', 'You’ll stop receiving Hbee Digitals insights and updates at this email address.',
    'Unsubscribe me', 'Keep me subscribed', 'You’re unsubscribed.',
    'You won’t receive future Hbee Digitals newsletter emails at this address.', 'You’re already unsubscribed.',
    'We couldn’t find this subscription.', 'This unsubscribe link isn’t valid.', 'We couldn’t complete your request.',
  ]) assert.ok(clientSource.includes(copy), `Missing branded state copy: ${copy}`)

  console.log('Newsletter unsubscribe signing, safe GET redirects, deliberate POST mutation, idempotency, failures, page states and email-link tests passed (offline mocks only).')
}

main().catch(error => { console.error(error); process.exitCode = 1 })
