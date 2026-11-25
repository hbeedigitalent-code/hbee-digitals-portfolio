// Offline checks for reusable media placements: model, validation, admin data layer and SQL drafts. No network or database.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const cache = new Map()
function load(file) {
  file = file.replace(/\\/g, '/')
  if (cache.has(file)) return cache.get(file).exports
  const mod = { exports: {} }; cache.set(file, mod)
  const code = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const req = name => {
    if (name.startsWith('@/')) return load('src/' + name.slice(2) + '.ts')
    if (name.startsWith('.')) return load(path.posix.join(path.posix.dirname(file), name) + '.ts')
    return require(name)
  }
  vm.runInNewContext(code, { module: mod, exports: mod.exports, require: req, process, TextDecoder, Uint8Array, URL, BigInt, console }, { filename: file })
  return mod.exports
}
const p = load('src/lib/media/placements.ts')
const clone = value => JSON.parse(JSON.stringify(value))
const ID = n => `${String(n).padStart(8, '0')}-e89b-42d3-a456-426614174000`
const asset = (n, kind, category, extra = {}) => ({ id: ID(n), kind, category, title: 'Asset ' + n, status: 'active', public_url: `https://x.test/${n}`, ...extra })

/** In-memory fake of the two tables. */
function fakeDb({ placements = [], assets = [], failInsertFor = [] } = {}) {
  const ops = []
  return {
    ops, placements,
    storage: { from() { assert.fail('placements never touch storage') } },
    from(table) {
      assert.ok(['media_placements', 'media_assets'].includes(table), 'unexpected table ' + table)
      const filters = []; let action = 'select', payload
      const run = () => {
        ops.push({ table, action, filters, payload })
        const match = row => filters.every(([op, key, value]) => op === 'eq' ? row[key] === value : value.includes(row[key]))
        if (table === 'media_assets') { assert.equal(action, 'select', 'placements never write or delete library assets'); return { data: assets.filter(match), error: null } }
        if (action === 'insert') { if (failInsertFor.includes(payload.media_asset_id)) return { data: null, error: { message: 'permission denied' } }; placements.push({ id: ID(900 + placements.length), ...payload }); return { data: null, error: null } }
        if (action === 'update') { const rows = placements.filter(match); rows.forEach(r => Object.assign(r, payload)); return { data: rows[0] ?? null, error: null } }
        if (action === 'delete') { for (let i = placements.length - 1; i >= 0; i -= 1) if (match(placements[i])) placements.splice(i, 1); return { data: null, error: null } }
        return { data: placements.filter(match), error: null }
      }
      const chain = {
        select() { return chain }, order() { return chain },
        eq(key, value) { filters.push(['eq', key, value]); return chain }, in(key, value) { filters.push(['in', key, value]); return chain },
        insert(row) { action = 'insert'; payload = row; return chain }, update(row) { action = 'update'; payload = row; return chain }, delete() { action = 'delete'; return chain },
        limit() { return chain }, maybeSingle() { return Promise.resolve(run()) },
        then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject) },
      }
      return chain
    },
  }
}

;(async () => {
  // ── Targets and slots ──
  assert.ok(p.isValidTarget(p.WORK_SHOWCASE)); assert.ok(p.isValidTarget(p.projectMedia(ID(1))))
  for (const slug of p.CAPABILITY_SLUGS) assert.ok(p.isValidTarget(p.serviceShowcase(slug)), slug)
  assert.deepEqual([...p.CAPABILITY_SLUGS].sort(), ['brand-positioning', 'commerce-experience', 'creative-ugc', 'digital-systems', 'discovery-traffic', 'retention-growth'])
  const routes = read('src/components/site/capability/capability-content.ts')
  for (const slug of p.CAPABILITY_SLUGS) assert.ok(routes.includes(`slug: '${slug}'`), 'placement services are the real routes: ' + slug)
  for (const bad of [{ type: 'site', key: 'home', slot: 'creative_showcase' }, { type: 'service', key: 'seo', slot: 'showcase' }, { type: 'service', key: 'creative-ugc', slot: 'creative_showcase' }, { type: 'project', key: 'spec-gt', slot: 'project_media' }]) assert.equal(p.isValidTarget(bad), false)

  // ── Compatibility, taxonomy, labels ──
  for (const ok of [asset(1, 'image', 'brand_logo'), asset(2, 'image', 'graphic'), asset(3, 'image', 'general'), asset(4, 'video', 'ugc_video'), asset(5, 'video', 'video')]) assert.equal(p.placementBlocker(ok), undefined)
  assert.match(p.placementBlocker(asset(6, 'video', 'bgc_video')), /decorative/)
  for (const label of ['Logo Design', 'Flyer Design', 'Social Media Flyer', 'Social Media Creative', 'Campaign Creative', 'Brand Identity', 'Brand Asset', 'UGC Video', 'Creator-Led Content', 'Product Creative', 'Website Creative', 'Store Experience', 'Landing Page Creative', 'Project Video', 'Other / Custom'])
    assert.ok(Object.values(p.DISPLAY_TYPES).some(d => d.label === label), label)
  assert.ok(p.displayTypesFor('video').includes('ugc_video') && !p.displayTypesFor('video').includes('logo_design'))
  assert.ok(p.displayTypesFor('image').includes('logo_design') && !p.displayTypesFor('image').includes('ugc_video'))
  assert.equal(p.displayLabel('social_flyer', 'ignored'), 'Social Media Flyer'); assert.equal(p.displayLabel('other', ' Menu Design '), 'Menu Design'); assert.equal(p.displayLabel('nope', 'x'), '')
  assert.equal(p.suggestedDisplayType(asset(1, 'image', 'brand_logo')), 'brand_asset', 'a logo is never pre-labelled as Hbee design work')
  assert.equal(p.suggestedDisplayType(asset(1, 'video', 'ugc_video')), 'ugc_video')

  const edit = { display_type: 'logo_design', custom_label: '', title_override: '', caption_override: '', related_project_id: null, is_active: true }
  assert.equal(p.validatePlacement(edit, 'image', p.WORK_SHOWCASE), undefined)
  assert.match(p.validatePlacement(edit, 'video', p.WORK_SHOWCASE), /cannot describe a video/)
  assert.match(p.validatePlacement({ ...edit, display_type: 'other' }, 'image', p.WORK_SHOWCASE), /custom label/)
  assert.match(p.validatePlacement({ ...edit, display_type: 'other', custom_label: 'x'.repeat(61) }, 'image', p.WORK_SHOWCASE), /60/)
  assert.match(p.validatePlacement({ ...edit, related_project_id: ID(7) }, 'image', p.projectMedia(ID(1))), /related project/)
  assert.equal(p.validatePlacement({ ...edit, related_project_id: ID(7) }, 'image', p.serviceShowcase('creative-ugc')), undefined)

  // ── New placements are hidden; multi-add is per item; no duplicates ──
  const library = [asset(1, 'image', 'brand_logo'), asset(2, 'image', 'graphic'), asset(4, 'video', 'ugc_video'), asset(6, 'video', 'bgc_video'), asset(8, 'image', 'graphic')]
  const db = fakeDb({ assets: library, failInsertFor: [ID(8)] })
  const result = await p.addPlacements(db, p.WORK_SHOWCASE, library, [])
  assert.equal(result.added, 3); assert.equal(result.skipped.length, 2, 'background video and the failed insert are reported; the rest are added')
  assert.ok(db.placements.every(row => row.is_active === false), 'nothing becomes public until switched on')
  assert.deepEqual(db.placements.map(r => r.display_order), [0, 1, 2])
  const again = await p.addPlacements(db, p.WORK_SHOWCASE, [library[0]], db.placements)
  assert.equal(again.added, 0); assert.match(again.skipped[0], /already here/)
  // The same asset can be placed in several places; the file is referenced, never copied.
  await p.addPlacements(db, p.serviceShowcase('brand-positioning'), [library[0]], [])
  assert.equal(db.placements.filter(r => r.media_asset_id === ID(1)).length, 2)

  // ── Listing, editing, ordering, removing ──
  const list = await p.listPlacements(db, p.WORK_SHOWCASE)
  assert.equal(list.length, 3); assert.equal(list[0].asset.title, 'Asset 1')
  await p.updatePlacement(db, list[0], { ...edit, display_type: 'logo_design', title_override: ' Mark ', is_active: true })
  assert.equal(db.placements[0].is_active, true); assert.equal(db.placements[0].title_override, 'Mark')
  assert.equal(db.placements.find(r => r.target_type === 'service').is_active, false, 'active state is per placement')
  await assert.rejects(p.updatePlacement(db, list[0], { ...edit, display_type: 'ugc_video' }), /cannot describe an image/)
  assert.deepEqual(clone(p.reorderedPositions([{ id: 'a', display_order: 0 }, { id: 'b', display_order: 1 }, { id: 'c', display_order: 2 }], 1, -1)), [{ id: 'b', display_order: 0 }, { id: 'a', display_order: 1 }])
  assert.deepEqual(clone(p.reorderedPositions([{ id: 'a', display_order: 0 }], 0, -1)), [])
  await p.movePlacement(db, list, 2, -1)
  assert.deepEqual((await p.listPlacements(db, p.WORK_SHOWCASE)).map(r => r.media_asset_id), [ID(1), ID(4), ID(2)])
  const before = db.ops.length
  await p.removePlacement(db, db.placements[0].id)
  assert.ok(db.ops.slice(before).every(op => op.table === 'media_placements'), 'removing a placement touches only the placement')
  assert.equal(db.placements.filter(r => r.media_asset_id === ID(1)).length, 1, 'other placements of the same asset remain')
  await assert.rejects(p.removePlacement(db, 'x'), /Invalid/)
  assert.match(p.friendlyPlacementError("Could not find the table 'public.media_placements' in the schema cache"), /migration has not been run/)

  // Archiving is a status flag on the asset: nothing in the library layer removes or switches off placements.
  assert.ok(!/media_placements[\s\S]{0,200}\.(delete|update)\(/.test(read('src/lib/media/media-library.ts')))
  assert.ok(!/storage|media_assets'\)\.(delete|update)/.test(read('src/lib/media/placements.ts')), 'the placement module cannot delete assets or files')

  // ── SQL drafts (executed separately in a throw-away database; never against Supabase) ──
  const sql = name => read(`scripts/admin-media-placement-${name}.sql`)
  const code = text => text.split('\n').filter(line => !line.trim().startsWith('--')).join('\n')
  const forward = code(sql('01-forward'))
  for (const key of Object.keys(p.DISPLAY_TYPES)) assert.ok(forward.includes(`'${key}'`), 'database allows ' + key)
  for (const slug of p.CAPABILITY_SLUGS) assert.ok(forward.includes(`'${slug}'`))
  assert.match(forward, /revoke all on public\.media_placements from public, anon, authenticated;/)
  assert.ok(!/grant[^;]*on public\.media_placements to[^;]*\banon\b/i.test(forward), 'anon gets no table privilege')
  assert.equal((forward.match(/create policy/g) || []).length, 1); assert.match(forward, /for all to authenticated[\s\S]*au\.is_active = true/)
  assert.match(forward, /security definer\s*\nset search_path = pg_catalog, public/); assert.match(forward, /where p\.is_active\b/)
  assert.ok(!/alter table public\.(media_assets|portfolio_items|portfolio_media)|storage\.|delete from|update public\./i.test(forward), 'additive only; no storage or data change')
  assert.ok(!/delete from|media_assets|storage\./i.test(code(sql('02-rollback'))), 'rollback deletes no rows, assets or files')
  for (const name of ['00-preflight-readonly', '03-verify-readonly']) assert.ok(!/\b(insert into|update\s+public|delete from|drop |alter table|create |grant |revoke |truncate )/i.test(code(sql(name)).replace(/'[^']*'/g, "''")), name + ' is read-only')
  console.log('PASS: media placements - targets, compatibility, editorial labels, hidden-by-default multi-add, per-placement active state, ordering, reference-only removal, SQL drafts')
})().catch(error => { console.error(error); process.exit(1) })
