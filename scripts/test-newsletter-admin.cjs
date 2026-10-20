// Offline contract checks: actual handlers, synthetic data, no network/database.
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript')
const root = path.resolve(__dirname, '..'), cache = new Map()
const uuid = '12345678-1234-1234-1234-123456789abc'
const stored = new Map(), calls = [], writes = []
let denied = null, queryError = null, rpcError = null, count = 17, list = [], race = false
function query(table) {
  assert.equal(table, 'newsletter_subscribers')
  const q = { op: 'read', filters: [],
    select(columns, options) { calls.push(['select', columns, options]); return q },
    eq(...args) { q.filters.push(args); calls.push(['eq', ...args]); return q },
    contains(...args) { calls.push(['contains', ...args]); return q },
    order(...args) { calls.push(['order', ...args]); return q },
    range(...args) { calls.push(['range', ...args]); return q },
    insert(payload) { q.op = 'insert'; writes.push(['insert', payload]); q.payload = payload; return q },
    update(payload) { q.op = 'update'; writes.push(['update', payload]); return q },
    delete() { q.op = 'delete'; writes.push(['delete']); return q },
    async single() {
      if (race) { race = false; stored.set(q.payload.email, { id: uuid, status: 'unsubscribed' }); return { error: { code: '23505' } } }
      stored.set(q.payload.email, q.payload)
      return { data: { id: uuid }, error: queryError }
    },
    async maybeSingle() { assert.deepEqual(q.filters, [['id', uuid]]); return { data: { id: uuid }, error: queryError } },
    then(resolve) { resolve({ data: list, count, error: queryError }) },
  }; return q
}
const db = { from: query, rpc(name, args) {
  assert.equal(name, 'newsletter_subscriber_identity')
  calls.push(['identity', args.p_email])
  return { maybeSingle: async () => ({ data: stored.has(args.p_email) ? { id: uuid, status: stored.get(args.p_email).status } : null, error: rpcError }) }
} }
function load(relative) {
  let file = path.resolve(root, relative)
  if (!path.extname(file)) file += '.ts'
  if (cache.has(file)) return cache.get(file).exports
  const mod = { exports: {} }; cache.set(file, mod)
  function localRequire(name) {
    if (name === 'next/server') return { NextResponse: class extends Response { static json(value, options) { return Response.json(value, options) } } }
    if (name === '@/lib/admin-api-auth') return {
      ADMIN_UUID_RE: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      requireActiveAdmin: async () => denied ? { ok: false, response: Response.json({ error: 'Denied' }, { status: denied }) } : { ok: true, db, userId: uuid },
      queryFailure: () => Response.json({ error: 'Failed to load data' }, { status: 500 }),
    }
    if (name.startsWith('@/')) return load('src/' + name.slice(2))
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file), name)))
    return require(name)
  }
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
  vm.runInNewContext(code, { require: localRequire, module: mod, exports: mod.exports, Response, Request, URL, console, Date, Set }, { filename: file })
  return mod.exports
}
const route = load('src/app/api/admin/subscribers/route.ts')
const request = (method, body, headers = {}) => new Request('https://site.example.test/api/admin/subscribers', { method, headers: { origin: 'https://site.example.test', 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) })
const get = query => route.GET(new Request('https://site.example.test/api/admin/subscribers' + (query || '')))
const manual = subscriber => request('POST', { action: 'manual', subscriber })
function reset() { calls.length = 0; writes.length = 0; queryError = null; rpcError = null; denied = null; list = [] }
async function main() {
  for (const status of [401, 403]) {
    denied = status
    for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
      const result = await route[method](request(method, method === 'GET' ? undefined : {}))
      assert.equal(result.status, status)
    }
    assert.equal(calls.length, 0); assert.equal(writes.length, 0)
  }
  reset()
  let response = await get()
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal((await response.json()).has_more, false)
  const selected = calls.find(row => row[0] === 'select')[1]
  assert.ok(!selected.includes('*')); assert.ok(selected.includes('consent_given_at')); assert.ok(selected.includes('consent_source'))
  assert.deepEqual(calls.find(row => row[0] === 'range'), ['range', 0, 499])
  reset(); list = Array.from({ length: 500 }, () => ({ id: uuid }))
  response = await get('?page=1'); assert.equal((await response.json()).has_more, true)
  assert.deepEqual(calls.find(row => row[0] === 'range'), ['range', 500, 999])
  for (const suffix of ['?mode=arbitrary', '?mode=count&audience=unknown', '?page=-1', '?page=1.2']) assert.equal((await get(suffix)).status, 400)
  for (const [audience, filter] of [
    ['all_subscribers', null], ['all_leads', ['eq', 'segment', 'lead']], ['existing_clients', ['eq', 'segment', 'client']],
    ['shopify_leads', ['contains', 'tags', ['shopify']]], ['ecommerce_merchants', ['contains', 'tags', ['ecommerce']]],
  ]) {
    reset(); response = await get('?mode=count&audience=' + audience)
    assert.equal((await response.json()).count, 17)
    assert.ok(calls.some(row => row[0] === 'eq' && row[1] === 'status' && row[2] === 'active'))
    if (filter) assert.ok(calls.some(row => JSON.stringify(row) === JSON.stringify(filter)))
  }
  queryError = { code: 'synthetic' }; assert.equal((await get('?mode=count')).status, 500); queryError = null
  for (const method of ['POST', 'PATCH', 'DELETE']) {
    reset(); assert.equal((await route[method](request(method, { id: uuid, status: 'active' }, { origin: 'https://other.example.test' }))).status, 403)
    assert.equal(writes.length, 0)
    assert.equal((await route[method](request(method, {}, { 'sec-fetch-site': 'cross-site' }))).status, 403)
  }
  reset()
  response = await route.POST(manual({ email: '  PERSON@EXAMPLE.TEST ', name: 'Person', phone: '', tags: ['shopify'], segment: 'client', source: 'forged', status: 'bounced', consent_given_at: 'forged' }))
  assert.equal(response.status, 200)
  const inserted = writes.at(-1)[1]
  assert.equal(inserted.email, 'person@example.test'); assert.equal(inserted.source, 'manual'); assert.equal(inserted.status, 'active')
  assert.deepEqual(Object.keys(inserted).sort(), ['email', 'name', 'phone', 'segment', 'source', 'status', 'tags'])
  for (const email of ['\tperson@example.test', 'person@example.test\n', 'invalid']) assert.equal((await route.POST(manual({ email }))).status, 400)
  assert.equal((await route.POST(manual({ email: 'array@example.test', segment: ['lead'] }))).status, 400)
  const historical = { status: 'unsubscribed', source: 'historical', consent_given_at: null, tags: ['old'] }
  stored.set('old@example.test', historical)
  reset(); response = await route.POST(manual({ email: ' OLD@EXAMPLE.TEST ' }))
  assert.equal(response.status, 409); assert.equal(writes.length, 0); assert.equal(stored.get('old@example.test'), historical)
  reset(); response = await route.POST(request('POST', { action: 'import', csv: 'OLD@example.test,Overwrite,tags\nnew@example.test,"Person, Name",shopify;ecommerce\nnew@example.test,Duplicate,other' }))
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { inserted: 1, skipped: 2 })
  assert.equal(writes.length, 1); assert.equal(writes[0][1].name, 'Person, Name'); assert.equal(writes[0][1].source, 'csv_import')
  assert.ok(!Object.keys(writes[0][1]).some(key => key.startsWith('consent'))); assert.equal(stored.get('old@example.test'), historical)
  reset(); response = await route.POST(request('POST', { action: 'import', csv: 'valid@example.test,Valid\ninvalid,Invalid' }))
  assert.equal(response.status, 400); assert.equal(writes.length, 0)
  assert.equal((await route.POST(request('POST', { action: 'import', csv: Array.from({ length: 501 }, (_, i) => `row${i}@example.test,Name`).join('\n') }))).status, 400)
  assert.equal(writes.length, 0)
  rpcError = { code: 'missing-rpc' }; assert.equal((await route.POST(manual({ email: 'unavailable@example.test' }))).status, 503); assert.equal(writes.length, 0)
  reset(); race = true; response = await route.POST(request('POST', { action: 'import', csv: 'race@example.test,Race' }))
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { inserted: 0, skipped: 1 }); assert.equal(stored.get('race@example.test').status, 'unsubscribed')
  reset(); assert.equal((await route.PATCH(request('PATCH', { id: uuid, status: 'unsubscribed', consent_given_at: 'forged' }))).status, 200)
  assert.equal(JSON.stringify(writes[0]), JSON.stringify(['update', { status: 'unsubscribed' }]))
  assert.equal((await route.PATCH(request('PATCH', { id: uuid, status: 'unknown' }))).status, 400)
  assert.equal((await route.PATCH(request('PATCH', { id: uuid, status: ['active'] }))).status, 400)
  assert.equal((await route.DELETE(request('DELETE', { id: 'not-uuid' }))).status, 400)
  assert.equal((await route.DELETE(request('DELETE', { id: uuid }))).status, 200)
  for (const file of ['src/app/admin/subscribers/page.tsx', 'src/app/admin/newsletter/page.tsx', 'src/app/admin/newsletter/new/page.tsx']) {
    const text = fs.readFileSync(path.join(root, file), 'utf8')
    assert.ok(!text.includes(".from('newsletter_subscribers')"), file)
    assert.ok(text.includes('/api/admin/subscribers'), file)
  }
  const editor = fs.readFileSync(path.join(root, 'src/app/admin/subscribers/page.tsx'), 'utf8')
  assert.ok(!editor.includes('.upsert(')); assert.ok(!editor.includes('marketing_consent'))
  assert.ok(editor.includes('consent_given_at')); assert.ok(editor.includes('consent_source'))
  assert.ok((editor.match(/message\?\.type === 'error'/g) || []).length === 2)
  const creator = fs.readFileSync(path.join(root, 'src/app/admin/newsletter/new/page.tsx'), 'utf8')
  assert.ok(creator.includes('subscribersCount === null')); assert.ok(creator.includes('AbortController'))
  console.log('Newsletter admin API compatibility tests passed (offline mocks only).')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
