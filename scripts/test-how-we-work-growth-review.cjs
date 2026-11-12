// Offline Phase S2 checks (How We Work + Growth Review semantics). No environment, database or network access.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const cache = new Map()

function load(file) {
  file = path.resolve(root, file)
  if (!path.extname(file)) file = ['.ts', '.tsx'].map((extension) => file + extension).find(fs.existsSync)
  if (cache.has(file)) return cache.get(file).exports
  const mod = { exports: {} }
  cache.set(file, mod)
  const localRequire = (name) => {
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file), name)))
    throw new Error(`Unexpected dependency in content module: ${name}`)
  }
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText
  vm.runInNewContext(output, { module: mod, exports: mod.exports, require: localRequire, console }, { filename: file })
  return mod.exports
}

/** Source with block and line comments removed, so rules apply to what ships rather than to explanatory comments. */
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
/** Every string in an exported value, flattened. */
function strings(value, out = []) {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out))
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out))
  return out
}

const HOW = load('src/components/site/how-we-work/how-we-work-content.ts')
const GR = load('src/components/site/growth-review/growth-review-content.ts')
const { CAPABILITY_ENTITIES, CAPABILITY_ORDER } = load('src/components/site/services/capability-entities.ts')
const { constraintSymptom } = load('src/components/site/growth-review/constraint-context.ts')
const { DIAGNOSTIC } = load('src/components/site/home/home-content.ts')

const howSections = read('src/components/site/how-we-work/HowWeWorkSections.tsx')
const howSystem = read('src/components/site/how-we-work/ConnectedSystem.tsx')
const grSections = read('src/components/site/growth-review/GrowthReviewSections.tsx')
const received = read('src/components/site/growth-review/ReceivedState.tsx')
const diagnostic = read('src/components/site/growth-review/CapabilityDiagnosticSystem.tsx')
const howPage = read('src/app/(site)/how-we-work/page.tsx')
const grPage = read('src/app/(site)/growth-review/page.tsx')
const schemaSrc = read('src/lib/site/page-schema.ts')
const navigation = read('src/components/site/navigation.ts')

/* Everything a visitor can read on the two pages: content modules plus the section sources (comments removed). */
const howCopy = [...strings(HOW), stripComments(howSections), stripComments(howSystem)].join('\n')
const grCopy = [
  ...strings({
    GR_HERO: GR.GR_HERO,
    GR_SYMPTOMS_INTRO: GR.GR_SYMPTOMS_INTRO,
    GR_SYMPTOMS: GR.GR_SYMPTOMS,
    GR_CAPABILITIES: GR.GR_CAPABILITIES,
    GR_NEXT: GR.GR_NEXT,
    GR_QUESTIONS_INTRO: GR.GR_QUESTIONS_INTRO,
    GR_QUESTIONS: GR.GR_QUESTIONS,
    GR_FOLLOW: GR.GR_FOLLOW,
    GR_FORM_NOTE: GR.GR_FORM_NOTE,
    GR_ASSESSMENT: GR.GR_ASSESSMENT,
    GR_CONSTRAINT_CONTEXT: GR.GR_CONSTRAINT_CONTEXT,
    RECEIVED: GR.RECEIVED,
  }),
  stripComments(grSections),
].join('\n')
const both = `${howCopy}\n${grCopy}`

/* ── 1. One H1 each, with the ecommerce semantic heading ── */
assert.equal((howSections.match(/<h1\b/g) || []).length, 1, 'How We Work renders exactly one <h1>')
assert.equal((grSections.match(/<h1\b/g) || []).length, 1, 'Growth Review renders exactly one <h1>')
assert.equal(`${HOW.HOW_HERO.headline} ${HOW.HOW_HERO.headlineAccent}`, 'How Hbee Digitals Approaches Ecommerce Growth')
assert.equal(`${GR.GR_HERO.headline} ${GR.GR_HERO.headlineAccent}`, 'Ecommerce Growth Review: Find What to Fix First')
assert.equal(HOW.HOW_HERO.eyebrow, 'We start with the business. Not the service.', 'the old slogan survives as the supporting statement')
assert.ok(!/as=["']h1["']/.test(howSections + grSections), 'No second h1 through SiteDisplayHeading')

/* ── 2. Five stages, real anchors, nothing renamed ── */
assert.deepEqual(
  JSON.parse(JSON.stringify(HOW.PROCESS_STAGES.map((s) => [s.id, s.name]))),
  [['assess', 'Assess'], ['prioritize', 'Prioritize'], ['build', 'Build'], ['activate', 'Activate'], ['optimize', 'Optimize']],
  'The five public stage names and ids',
)
assert.ok(/id=\{stage\.id\}/.test(howSections), 'Each stage element carries its id')
const navAnchors = [...navigation.matchAll(/\/how-we-work#([a-z-]+)/g)].map((m) => m[1])
assert.ok(navAnchors.length >= 5, 'Navigation links to the stages')
for (const anchor of navAnchors) assert.ok(HOW.PROCESS_STAGES.some((s) => s.id === anchor), `Navigation anchor #${anchor} resolves to a stage id`)
assert.ok(/id="the-process"/.test(howSections), 'The "See the Process" anchor still resolves')
assert.ok(/href="#the-process"/.test(howSections), 'Hero secondary CTA still points at the process')

/* ── 3. Final six capability names; no resurrected public names ── */
const finalNames = ['Brand & Positioning', 'Website & Conversion', 'Digital Systems & Analytics', 'Creative & UGC', 'Traffic & Visibility', 'Retention & Customer Value']
assert.deepEqual(
  JSON.parse(JSON.stringify(CAPABILITY_ORDER.map((slug) => CAPABILITY_ENTITIES[slug].name).sort())),
  [...finalNames].sort(),
  'The six final capability names come from the entities',
)
for (const source of [howSections, howSystem, grSections, diagnostic]) assert.ok(/CAPABILITY_ENTITIES/.test(source), 'Capability names are read from capability-entities.ts, not retyped')
for (const old of ['Discovery & Traffic', 'Commerce Experience', 'Retention & Growth', 'Foundation', 'Activation']) {
  assert.ok(!both.includes(old), `No old public capability/group name: ${old}`)
}
assert.ok(!/Digital Systems(?! & Analytics)/.test(both), 'Digital Systems is always "Digital Systems & Analytics"')

/* ── 4. The old six conditions are not presented as a diagnostic framework ── */
assert.ok(!('GROWTH_CONDITIONS' in HOW) && !('CONDITIONS_INTRO' in HOW), 'The condition model is removed from How We Work')
assert.ok(!/\b(Clarity|Confidence|Capacity)\b/.test(howCopy), 'No Clarity/Confidence/Capacity conditions on How We Work')
assert.ok(!/growth conditions|six key areas/i.test(howCopy), 'No "six growth conditions / key areas we assess" framing')
assert.equal(HOW.ISOLATED_INTRO.headline, 'Why isolated fixes fail')
assert.equal(HOW.ISOLATED_EXAMPLES.length, 6, 'Six isolated-fix examples')

/* ── 5. Growth Review never claims the six capabilities are scored ── */
const grStrings = grCopy
assert.ok(!/\bpillars?\b|\bHGRI\b|readiness (score|index)/i.test(grStrings), 'No internal scoring vocabulary on the page')
assert.ok(!/\b(Visibility|Conversion|Retention|Authority|Scalability)\b[^.]*\b(score|pillar)/i.test(GR.GR_HERO.lede + GR.GR_CAPABILITIES.copy), 'The five internal pillars are not presented as the public system')
const scoredClaim = /\b(six|all six|each of the six|every one of the six)\b[^.]{0,80}\b(scored|are scored|assessed individually|rated)\b/i
assert.ok(!scoredClaim.test(grStrings), 'No claim that the six capabilities are scored')
assert.ok(/not six separate scores/.test(GR.GR_CAPABILITIES.note), 'The capability section says they are not six separate scores')
assert.ok(/does not score each one separately/.test(GR.GR_QUESTIONS[1].answer), 'The "what does Hbee review" answer is precise')
assert.ok(/review/i.test(GR.GR_CAPABILITIES.copy) && /structured signals/.test(GR.GR_CAPABILITIES.copy), 'Form signals + human review are described')
assert.ok(!/GR_AREAS/.test(grSections + received + diagnostic), 'The five legacy areas are not used on /growth-review or its received state')

/* ── 6. No unconfirmed promises ── */
assert.ok(!/\bfree\b/i.test(both), 'No "free" promise')
assert.ok(!/business days?|\b2\s*[–-]\s*5\b|within \d+|\b\d+\s*(hours|days|weeks)\b|turnaround/i.test(both), 'No timing or turnaround promise')
assert.ok(!/guarantee|lifetime|every (submitter|applicant|merchant)|all (submitters|applicants)/i.test(both), 'No guaranteed or lifetime Growth Profile')
const instant = (both.match(/instant\w*/gi) || [])
assert.equal(instant.length, 1, 'Only one mention of "instant"')
assert.ok(/not generated instantly/.test(GR.GR_NEXT.profile), '…and it denies the instant profile')
assert.ok(/where one applies/.test(GR.GR_NEXT.profile) && /where applicable/.test(GR.GR_NEXT.steps[3].text), 'Growth Profile wording stays hedged')
assert.deepEqual(JSON.parse(JSON.stringify(GR.GR_HERO.trust)), ['Reviewed by the Hbee team', 'No account needed', 'No obligation'], 'Trust chips unchanged')
assert.ok(!/\bform (takes|completes)|\bminutes?\b/i.test(GR.GR_FORM_NOTE), 'No completion time is stated')
assert.equal(GR.GR_FORM_NOTE, "You'll answer five short sections about the business, current position, goals, challenge and priority.")
assert.equal(GR.GR_SYMPTOMS.length, 8, 'Eight merchant symptoms')

/* ── 7. Growth Review capability links ── */
assert.ok(/CAPABILITY_ORDER\.map/.test(grSections) && /href=\{entity\.href\}/.test(grSections), 'Growth Review links each capability')
for (const slug of CAPABILITY_ORDER) assert.equal(CAPABILITY_ENTITIES[slug].href, `/services/${slug}`, `${slug} href`)
assert.ok(/href="\/how-we-work"/.test(grSections), 'Growth Review links to How We Work')
assert.ok(/CONTACT_HREF/.test(grSections), 'Contact is a quiet fallback link')
assert.ok(/aria-label=\{entity\.linkLabel\}/.test(grSections + howSections.replace(/entity/g, 'entity')) || /aria-label=\{CAPABILITY_ENTITIES\[slug\]\.linkLabel\}/.test(howSections), 'Capability links have descriptive labels')
assert.ok(/CAPABILITY_ORDER\.map/.test(howSections) && /CAPABILITY_ENTITIES\[slug\]\.href/.test(howSections), 'How We Work links the six capability pages')
assert.ok(/GROWTH_REVIEW_HREF/.test(howSections), 'How We Work links to the Growth Review')

/* ── 8. ?constraint= continuity ── */
const emitted = DIAGNOSTIC.map((d) => d.key)
assert.deepEqual(JSON.parse(JSON.stringify([...emitted].sort())), ['capacity', 'clarity', 'confidence', 'decision', 'discovery', 'value'], 'The homepage emits six condition keys')
for (const d of DIAGNOSTIC) assert.equal(constraintSymptom(d.key), d.symptom, `${d.key} resolves to the homepage symptom wording`)
for (const bad of [null, undefined, '', 'CLARITY', ' clarity', 'clarity ', 'unknown', '<script>alert(1)</script>', '__proto__', 'toString', 'a,b']) {
  assert.equal(constraintSymptom(bad), null, `Unrecognized value is ignored: ${JSON.stringify(bad)}`)
}
const constraintSrc = stripComments(read('src/components/site/growth-review/ConstraintContext.tsx'))
assert.ok(/constraintSymptom\(/.test(constraintSrc) && !/\{[^}]*get\('constraint'\)[^}]*\}\s*</.test(constraintSrc), 'The raw query value is never rendered')
assert.ok(/<Suspense/.test(constraintSrc) && /useSearchParams/.test(constraintSrc), 'Read client-side inside Suspense (page stays static)')
assert.ok(!/searchParams/.test(stripComments(grPage)), 'The page itself does not read searchParams (stays static)')
assert.equal((stripComments(grSections).match(/<ConstraintContext/g) || []).length, 1, 'A recognized constraint renders exactly one contextual note in the page architecture')
assert.ok(/ConstraintContext variant="hero"/.test(grSections), 'The single note sits near the hero')
assert.ok(!/ConstraintContext/.test(grSections.slice(grSections.indexOf('export function GrowthReviewAssessment'))), 'No duplicate note in the assessment/form section')
for (const file of ['GrowthReviewForm.tsx', 'form-model.ts']) {
  assert.ok(!/constraint/i.test(read(`src/components/site/growth-review/${file}`)), `${file} does not touch the constraint (no scoring/answer mapping)`)
}

/* ── 9. Questions (visible HTML, no FAQPage) ── */
assert.deepEqual(
  JSON.parse(JSON.stringify(HOW.HOW_QUESTIONS.map((q) => q.question))),
  [
    'How does Hbee Digitals work with ecommerce brands?',
    'What happens before Hbee recommends a service?',
    'Do I need every Hbee capability?',
    'How does Hbee decide what to fix first?',
  ],
)
assert.deepEqual(
  JSON.parse(JSON.stringify(GR.GR_QUESTIONS.map((q) => q.question))),
  [
    'What is an ecommerce Growth Review?',
    'What does Hbee review?',
    'What happens after I submit?',
    'Do I need an account?',
    'Is the Growth Review a sales call?',
    'Should I fix traffic, conversion or retention first?',
  ],
)
assert.ok(!/pric|cost|phase|timeline/i.test(HOW.HOW_QUESTIONS.map((q) => q.answer).join(' ')), 'How We Work answers make no pricing, phase or timeline claims')
assert.ok(/<dl\b/.test(howSections) && /<dl\b/.test(grSections), 'Questions are real HTML (definition lists)')

/* ── 10. CTA reduction on How We Work ── */
assert.equal((howSections.match(/href=\{GROWTH_REVIEW_HREF\}/g) || []).length, 2, 'How We Work: Growth Review CTA only in the hero and the closing')
assert.ok(!/Open Client Portal/.test(howSections), 'Client Portal is no longer an equal prospect CTA')
assert.ok(/UTILITY_NAV\.href/.test(howSections) && /Sign in to the Client Portal/.test(howSections), 'Client login stays as a quiet utility link')
assert.ok(/CONTACT_HREF/.test(howSections), 'Contact remains the secondary route')
assert.ok(/messag/i.test(read('src/components/site/how-we-work/how-we-work-content.ts')) && !/\bmessag(e|es|ing)\b/i.test(HOW.PORTAL_BENEFITS.map((b) => b.text).join(' ')), 'No portal messaging claim')

/* ── 11. Structured data: WebPage + BreadcrumbList only ── */
for (const [name, page] of [['how-we-work', howPage], ['growth-review', grPage]]) {
  assert.ok(/pageJsonLd\(/.test(page) && /application\/ld\+json/.test(page), `${name} embeds page-level JSON-LD`)
  assert.ok(!/FAQPage|"Service"|'Service'/.test(stripComments(page)), `${name}: no FAQPage or Service schema`)
}
assert.ok(/'WebPage'/.test(schemaSrc) && /'BreadcrumbList'/.test(schemaSrc), 'WebPage + BreadcrumbList')
assert.ok(!/FAQPage|'Service'|aggregateRating|review|offers|price|areaServed/i.test(stripComments(schemaSrc)), 'No FAQPage, Service, ratings, reviews, prices or areaServed')
assert.ok(/path: '\/how-we-work'/.test(howPage) && /path: '\/growth-review'/.test(grPage), 'Canonical paths')

/* ── 12. Diagnostic visual, idle and received states ── */
assert.ok(!/GR_AREAS/.test(diagnostic), 'The diagnostic visual does not use the five legacy areas')
const slotKeys = [...diagnostic.matchAll(/^\s{2}'([a-z-]+)': \{ d:/gm)].map((m) => m[1]).sort()
assert.deepEqual(slotKeys, JSON.parse(JSON.stringify([...CAPABILITY_ORDER].sort())), 'Six module slots, one per capability')
assert.ok(/received/.test(diagnostic) && /idle/.test(diagnostic) && /signal=\{variant !== 'idle'\}/.test(diagnostic), 'Idle has no signal; received keeps its own state')
assert.ok(/variant="idle"/.test(received) && /variant="received"/.test(received), 'Both states use the capability visual')
assert.ok(/receiptIsValid\(raw\)/.test(received) && /setState\(valid \? 'received' : 'neutral'\)/.test(received), 'The no-fake-success receipt gate is intact')
assert.ok(/GR_AREAS/.test(read('src/components/site/growth-review/DiagnosticSystem.tsx')), 'Homepage DiagnosticSystem is left as it was')

/* ── 13. Evidence, spelling ── */
// Inline style values (the labelled example progress bar in the portal illustration) are not copy.
const visibleCopy = both.replace(/'--p': '[^']*'/g, '')
assert.ok(!/\d+\s?%|\$\s?\d|\b\d+x\b|\b\d{2,}\+?\s*(clients|brands|stores|merchants|projects|businesses)\b/i.test(visibleCopy), 'No unsupported numeric proof')
assert.ok(!/\b(optimis|prioritis|organis|recognis|personalis|customis|analys(e|ed|ing)\b|colour|behaviour|centre|programme|favour|catalogue)/i.test(both), 'US English spelling')

console.log('S2 How We Work + Growth Review semantic checks passed')
