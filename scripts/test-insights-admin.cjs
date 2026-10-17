// Offline Insights parity checks. No environment, external fetch, database or storage access.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { execFileSync } = require('node:child_process')
const root = path.resolve(__dirname, '..')
const modules = new Map()
let active
let calls = []
let navigations = []
let rows = []
let nextError = null
let previewAllowed = true
let previewAuthCalls = 0
let queryHandler = null
const router = { push: url => navigations.push(url) }
const location = { href: 'https://hbeedigitals.com/insights?category=brand-positioning&q=growth', search: '?category=brand-positioning&q=growth' }
const events = new Map()
const historyEntries = [location.href]
let historyIndex = 0
function setLocation(value) { const url = new URL(value); location.href = url.href; location.search = url.search }
const browser = { location, addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name), history: {
  pushState(_, __, url) { historyEntries.splice(++historyIndex); historyEntries.push(String(url)); setLocation(url) },
  replaceState(_, __, url) { historyEntries[historyIndex] = String(url); setLocation(url) },
  back() { if (historyIndex > 0) { setLocation(historyEntries[--historyIndex]); events.get('popstate')?.() } },
  forward() { if (historyIndex < historyEntries.length - 1) { setLocation(historyEntries[++historyIndex]); events.get('popstate')?.() } },
} }
const article = { id: 'post-1', title: 'Connected growth', slug: 'connected-growth', excerpt: 'Brand growth', content: '<h1>First</h1><h2>Second</h2><h3>Third</h3><p>' + 'word '.repeat(410) + '</p>', tags: ['Brand & Positioning'], status: 'draft', is_featured: false, author: 'Owner author', featured_image: 'https://example.test/cover.png', featured_image_alt: 'Cover alt', read_time: '7 min', published_at: null, canonical_url: 'https://hbeedigitals.com/blog/connected-growth', seo_title: 'SEO heading', seo_description: 'SEO description', og_title: 'OG heading', og_description: 'OG description', og_image: 'https://example.test/og.png', featured_badge: 'Legacy badge', cta_text: 'Legacy CTA', cta_link: '/legacy', updated_at: '2025-01-01T00:00:00.000Z' }
function execute(call) {
  if (nextError) { const error = nextError; nextError = null; return { data: null, error } }
  if (queryHandler) return queryHandler(call)
  const operations = call.operations
  let selected = rows.filter(row => operations.every(([op, ...args]) => op === 'eq' ? row[args[0]] === args[1] : op === 'neq' ? row[args[0]] !== args[1] : op === 'is' ? row[args[0]] == null : op === 'not' ? row[args[0]] != null : true))
  const insert = operations.find(op => op[0] === 'insert')
  const update = operations.find(op => op[0] === 'update')
  if (insert) { const row = { id: 'new-post', ...insert[1] }; rows.push(row); selected = [row] }
  if (update) for (const row of selected) Object.assign(row, update[1])
  for (const [, key, options] of operations.filter(op => op[0] === 'order').reverse()) selected = [...selected].sort((a,b) => String(a[key]).localeCompare(String(b[key])) * (options?.ascending === false ? -1 : 1))
  const limit = operations.find(op => op[0] === 'limit'); if (limit) selected = selected.slice(0, limit[1])
  if (operations.some(op => op[0] === 'single')) return selected.length === 1 ? { data: { ...selected[0] }, error: null } : { data: null, error: { message: 'Expected one row' } }
  if (operations.some(op => op[0] === 'maybeSingle')) return { data: selected[0] ? { ...selected[0] } : null, error: null }
  return { data: selected.map(row => ({ ...row })), error: null }
}
const client = { auth: { getUser: async () => ({ data: { user: { id: 'admin' } } }) }, from(table) {
  assert.equal(table, 'blog_posts', 'No category, portfolio, portal or project table access')
  const operations = []; const query = {}
  for (const op of ['select','eq','neq','is','not','order','limit','update','insert','single','maybeSingle','delete']) query[op] = (...args) => { operations.push([op,...args]); return query }
  query.then = (resolve,reject) => { const call = { table, operations }; calls.push(call); return Promise.resolve(execute(call)).then(resolve,reject) }
  return query
}, storage: { from() { throw Error('No actual storage access allowed') } } }
const hooks = { ...React, cache: fn => fn, useMemo: fn => fn(),
  useState(initial) { const h=active, i=h.index++; if (!(i in h.state)) h.state[i]=typeof initial==='function'?initial():initial; return [h.state[i], value => { h.state[i]=typeof value==='function'?value(h.state[i]):value }] },
  useRef(initial) { const h=active,i=h.index++; return h.state[i] ||= { current: initial } },
  useEffect(fn,deps) { const h=active,i=h.index++; const previous=h.state[i]; if (!previous || deps.some((v,n)=>v!==previous[n])) { h.state[i]=deps; h.effects.push(fn) } },
}
async function mockFetch(url, options) {
  assert.equal(url, '/api/admin/insights/preview')
  const { NextRequest } = require('next/server')
  return load('src/app/api/admin/insights/preview/route.ts').POST(new NextRequest('https://example.test'+url, { method: 'POST', body: options.body, headers: options.headers }))
}
function load(file) {
  file=path.resolve(root,file)
  if (!path.extname(file)) file=['.ts','.tsx','.js'].map(ext=>file+ext).find(fs.existsSync)
  if (modules.has(file)) return modules.get(file).exports
  const mod={exports:{}}; modules.set(file,mod)
  const localRequire=name=>{
    if (name==='react') return hooks
    if (name==='@/lib/supabase') return { supabase: client }
    if (name==='@/lib/admin-api-auth') return { requireActiveAdmin: async()=>{ previewAuthCalls++; return previewAllowed?{ok:true,db:client}:{ok:false,response:require('next/server').NextResponse.json({error:'Not authorized'},{status:403})} } }
    if (name==='next/navigation') return { useRouter:()=>router, useSearchParams:()=>new URLSearchParams(location.search) }
    if (name==='next/link') return { __esModule:true,default:'a' }
    if (name.endsWith('.module.css')) return new Proxy({}, {get:(_,key)=>key==='__esModule'?false:String(key)})
    if (name.endsWith('.css')) return {}
    if (name.startsWith('@/')) return load('src/'+name.slice(2))
    if (name.startsWith('.')) return load(path.relative(root,path.resolve(path.dirname(file),name)))
    return require(name)
  }
  const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
  vm.runInNewContext(js,{module:mod,exports:mod.exports,require:localRequire,URL,URLSearchParams,console,fetch:mockFetch,process:{env:{}},confirm:()=>true,setTimeout:()=>0,...(file.endsWith('InsightsBrowser.tsx')?{window:browser}:{})},{filename:file})
  return mod.exports
}
function nodes(node) { if (Array.isArray(node)) return node.flatMap(nodes); return node&&typeof node==='object'?[node,...nodes(node.props?.children)]:[] }
function textOf(node) { return typeof node==='string'?node:Array.isArray(node)?node.map(textOf).join(''):node?.props?textOf(node.props.children):'' }
function host(Component,props={},cards) { const h={state:[],index:0,effects:[],tree:null}; h.render=()=>{active=h;h.index=0;h.tree=Component(props);active=null;if(cards) for(const n of nodes(h.tree)) if(n.ref&&typeof n.ref==='object')n.ref.current={querySelectorAll:()=>cards};for(const effect of h.effects.splice(0))effect();return h.tree};return h }
function find(h,predicate) { const node=nodes(h.tree).find(predicate);assert.ok(node,'Expected control exists');return node }
const field=(h,label)=>find(h,n=>n.props?.label===label)
const button=(h,label)=>find(h,n=>n.type==='button'&&textOf(n)===label)
const tick=()=>new Promise(resolve=>setImmediate(resolve))
const plain=value=>JSON.parse(JSON.stringify(value))
;(async()=>{
  const utils=load('src/lib/blog-utils.ts')
  assert.equal(utils.estimateReadTime('<p>'+ 'word '.repeat(410)+'</p>'),'3 min read')
  assert.equal(utils.validReadTime('7 min'),'7 min read');assert.equal(utils.validReadTime('banana'),undefined)
  assert.equal(utils.insightCanonical(article.slug,article.canonical_url),'https://hbeedigitals.com/insights/connected-growth')
  assert.equal(utils.insightCanonical(article.slug,'https://other.example/original'),'https://other.example/original')
  const writes=load('src/lib/admin/insights-editor.ts')
  const firstDate='2025-02-01T10:00:00.000Z',later='2025-03-01T10:00:00.000Z'
  rows=[]
  await writes.writeInsightPost(client,undefined,{title:'Draft'},'draft',firstDate)
  assert.equal(rows[0].published_at,null)
  rows=[{...article}]
  await writes.writeInsightPost(client,article.id,{},'draft',firstDate);assert.equal(rows[0].published_at,null)
  await writes.writeInsightPost(client,article.id,{},'published',firstDate);assert.equal(rows[0].published_at,firstDate)
  await writes.writeInsightPost(client,article.id,{published_at:later,title:'Edited'},'published',later);assert.equal(rows[0].published_at,firstDate)
  await writes.writeInsightPost(client,article.id,{},'draft',later);assert.equal(rows[0].published_at,firstDate)
  await writes.writeInsightPost(client,article.id,{},'published',later);assert.equal(rows[0].published_at,firstDate)
  rows=[];await writes.writeInsightPost(client,undefined,{title:'Published'},'published',firstDate);assert.equal(rows[0].published_at,firstDate)
  rows=[{...article}]
  queryHandler=call=>{ queryHandler=null; rows[0].published_at=firstDate; return execute(call) }
  await writes.writeInsightPost(client,article.id,{},'published',later)
  assert.equal(rows[0].published_at,firstDate,'A competing first publish wins; later publisher cannot overwrite its date')
  const publication=utils.insightHref(article.slug)
  assert.equal(publication,'/insights/connected-growth')
  rows=[{...article,status:'published',published_at:firstDate}]
  const list=host(load('src/app/admin/blog/page.tsx').default)
  list.render();await tick();list.render();await tick();list.render();list.render()
  assert.equal(find(list,n=>n.type==='a'&&n.props.title==='View').props.href,publication)
  assert.equal(find(list,n=>n.type==='a'&&n.props.title==='Edit').props.href,'/admin/blog/edit/post-1')
  await find(list,n=>n.type==='button'&&n.props.title==='Unpublish').props.onClick();list.render();list.render()
  assert.equal(rows[0].status,'draft');assert.equal(rows[0].published_at,firstDate)
  assert.ok(!nodes(list.tree).some(n=>n.type==='a'&&n.props.title==='View'))
  await find(list,n=>n.type==='button'&&n.props.title==='Publish').props.onClick();list.render();list.render()
  assert.equal(rows[0].status,'published');assert.equal(rows[0].published_at,firstDate)
  await find(list,n=>n.type==='button'&&n.props.title==='Feature').props.onClick();list.render();list.render()
  assert.equal(rows[0].is_featured,true);assert.ok(!textOf(list.tree).includes('Legacy badge'))
  rows=[{...article}]
  const Editor=load('src/components/admin/BlogPostEditor.tsx').default
  const emptyAlt=host(Editor,{mode:'edit',initialPost:{...article,featured_image_alt:'',alt_text:'Legacy alt'}});emptyAlt.render()
  assert.equal(field(emptyAlt,'Featured Image Alt Text').props.value,'','An explicitly empty primary alt is preserved')
  const commentsSource=fs.readFileSync(path.join(root,'src/app/admin/comments/page.tsx'),'utf8')
  assert.ok(commentsSource.includes('href={`/insights/${comment.post_slug}`}'))
  assert.ok(!commentsSource.includes('href={`/blog/'))
  const editor=host(Editor,{mode:'edit',initialPost:{...article}});editor.render()
  assert.equal(field(editor,'Featured Image Alt Text').props.value,article.featured_image_alt)
  assert.equal(field(editor,'Canonical URL').props.value,'https://hbeedigitals.com/insights/connected-growth')
  assert.ok(!nodes(editor.tree).some(n=>['CTA Text','CTA Link','Featured Badge'].includes(n.props?.label)))
  field(editor,'Featured Image Alt Text').props.setValue('Updated alt');editor.render()
  await button(editor,'Update Insight').props.onClick();editor.render()
  assert.equal(rows[0].featured_image_alt,'Updated alt');assert.equal(rows[0].alt_text,'Updated alt')
  assert.equal(rows[0].featured_badge,article.featured_badge);assert.equal(rows[0].cta_text,article.cta_text)
  assert.equal(rows[0].read_time,'7 min')
  const payload=calls.filter(c=>c.operations.some(op=>op[0]==='update')).at(-1).operations.find(op=>op[0]==='update')[1]
  for(const legacy of ['featured_badge','cta_text','cta_link'])assert.ok(!(legacy in payload))
  assert.equal(payload.seo_title,article.seo_title);assert.equal(payload.og_title,article.og_title)
  field(editor,'HTML Content').props.setValue('<h1>Preview</h1><script>bad()</script><p onclick="bad()">Body <a href="javascript:bad()">link</a></p>');editor.render()
  await button(editor,'Refresh sanitized preview').props.onClick();editor.render()
  const preview=nodes(editor.tree).find(n=>n.type?.name==='InsightArticleBody')
  assert.ok(preview);assert.ok(!preview.props.html.includes('<script'));assert.ok(!preview.props.html.includes('onclick'));assert.ok(!preview.props.html.includes('javascript:'))
  assert.match(preview.props.html,/<h2[^>]+id="preview"/)
  assert.ok(previewAuthCalls>0)
  const sharedBody=load('src/components/site/insights/InsightArticleBody.tsx').InsightArticleBody
  const rendered=require('react-dom/server').renderToStaticMarkup(React.createElement(sharedBody,{html:preview.props.html}))
  assert.ok(!rendered.includes('<script'))
  nextError={message:'Mock save denied'};await button(editor,'Update Insight').props.onClick();editor.render();assert.match(textOf(editor.tree),/Mock save denied/)
  const { NextRequest }=require('next/server')
  const previewRoute=load('src/app/api/admin/insights/preview/route.ts')
  const beforePreview=calls.length
  const safeResponse=await previewRoute.POST(new NextRequest('https://example.test/api/admin/insights/preview',{method:'POST',body:JSON.stringify({content:'<script>bad()</script><p>Safe</p>'})}))
  assert.match(safeResponse.headers.get('cache-control'),/no-store/);assert.equal(calls.length,beforePreview,'Preview does not read/write blog content tables')
  previewAllowed=false
  const beforeDenied=calls.length
  const denied=await previewRoute.POST(new NextRequest('https://example.test/api/admin/insights/preview',{method:'POST',body:'{}'}))
  assert.equal(denied.status,403);assert.equal(calls.length,beforeDenied)
  previewAllowed=true
  const api=load('src/lib/site/insights-data.ts')
  rows=[{...article,status:'published',published_at:firstDate}, {...article,id:'related',slug:'related',status:'published',published_at:later}, {...article,id:'draft',slug:'draft',status:'draft'}]
  const listing=await api.getInsightsData();assert.equal(listing.items.length,2)
  assert.ok(listing.items.every(item=>item.href.startsWith('/insights/')))
  const detail=await api.getInsightDetail(article.slug)
  assert.equal(detail.related.length,1);assert.equal(detail.related[0].slug,'related')
  assert.equal(detail.toc.length,3);assert.ok(detail.html.includes('id="first"'))
  assert.equal(detail.readTime.label,'7 min read');assert.equal(detail.readTime.estimated,false)
  assert.equal(api.toInsightDetail({...article,read_time:''}).readTime.label,'3 min read')
  assert.equal(await api.getInsightDetail('draft'),null)
  const seo=await api.getInsightSeo(article.slug)
  assert.equal(seo.canonical,'https://hbeedigitals.com/insights/connected-growth')
  assert.equal(seo.title,article.seo_title);assert.equal(seo.ogTitle,article.og_title);assert.equal(seo.imageAlt,article.featured_image_alt)
  rows[0].canonical_url='https://other.example/original';assert.equal((await api.getInsightSeo(article.slug)).canonical,'https://other.example/original')
  const filters=load('src/lib/site/insights-filter.ts')
  const topics=[{key:'brand & positioning',label:'Brand & Positioning',count:1},{key:'commerce',label:'Commerce',count:1}]
  assert.deepEqual(plain(filters.insightFilterState(new URLSearchParams('category=brand-positioning&q=growth'),topics)),{topic:'brand & positioning',query:'growth'})
  assert.equal(filters.insightFilterState(new URLSearchParams('topic=unknown'),topics).topic,'all')
  assert.equal(filters.insightFilterState(new URLSearchParams('tag=commerce'),topics).topic,'commerce')
  const cards=[{dataset:{topics:'brand & positioning',search:'brand growth',view:''},hidden:false},{dataset:{topics:'commerce',search:'store growth',view:''},hidden:false}]
  const Browser=load('src/components/site/insights/InsightsBrowser.tsx').InsightsBrowser
  const wrapper=Browser({topics,total:2,children:null});const inner=wrapper.props.children
  const browserHost=host(inner.type,inner.props,cards)
  browserHost.render();browserHost.render();browserHost.render()
  assert.equal(cards[0].hidden,false);assert.equal(cards[1].hidden,true)
  find(browserHost,n=>n.type==='button'&&textOf(n).startsWith('Commerce')).props.onClick();browserHost.render();browserHost.render()
  assert.equal(cards[0].hidden,true);assert.equal(cards[1].hidden,false)
  assert.equal(new URL(location.href).searchParams.get('q'),'growth')
  browser.history.back();browserHost.render();browserHost.render();assert.equal(cards[0].hidden,false)
  browser.history.forward();browserHost.render();browserHost.render();assert.equal(cards[1].hidden,false)
  find(browserHost,n=>n.type==='input'&&n.props.type==='search').props.onChange({target:{value:'missing'}});browserHost.render();browserHost.render()
  assert.ok(cards.every(card=>card.hidden));assert.equal(new URL(location.href).searchParams.get('topic'),'commerce')
  button(browserHost,'Clear search and topics').props.onClick();browserHost.render();browserHost.render();assert.ok(cards.every(card=>!card.hidden))
  const config=require(path.join(root,'next.config.js'))
  const baseline={exports:{}};vm.runInNewContext(execFileSync('git',['show','HEAD:next.config.js'],{cwd:root,encoding:'utf8'}),{module:baseline,process:{env:{}}})
  assert.deepEqual(plain(await config.redirects()),plain(await baseline.exports.redirects()))
  const redirects=await config.redirects();assert.ok(redirects.some(r=>r.source==='/blog'&&r.destination==='/insights'));assert.ok(redirects.some(r=>r.source==='/blog/:slug'&&r.destination==='/insights/:slug'))
  console.log('PASS: Insights URL/canonical/SEO parity, legacy redirects, topic/search/history behavior, publication transitions/date preservation, shared reading time, legacy field preservation, image-alt saves, authenticated sanitized preview, draft exclusion, related tags/TOC, and no portfolio/portal crossover. All access mocked.')
})().catch(error=>{console.error(error);process.exitCode=1})
