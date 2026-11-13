// Offline source checks for C1.3 entity clarity. No browser, network or database.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
const SENTENCE = 'Hbee Digitals is a digital growth studio for Shopify and ecommerce brands, connecting brand and positioning, website and conversion, digital systems and analytics, creative and UGC, traffic and visibility, and retention and customer value.'

/* -- BlogPosting references the canonical Organization; no second node -- */
const insights = read('src/lib/site/insights-data.ts')
assert.match(insights, /publisher: \{ '@id': `\$\{SITE_URL\}#organization` \}/, 'publisher references the site Organization @id')
assert.doesNotMatch(insights, /publisher: \{ '@type'/, 'no inline Organization publisher')
assert.equal((insights.match(/'@type': 'Organization'/g) || []).length, 0, 'insights-data emits no Organization node')
assert.match(insights, /author: namedAuthor \? \{ '@type': 'Person', name: namedAuthor, url: `\$\{SITE_URL\}\/about` \} : \{ '@id': ORGANIZATION_ID \}/, 'a named author carries the About URL; a missing author references the Organization (S4.2)')

/* -- Organization: new description, existing identity untouched ------- */
const org = read('src/components/StructuredData.tsx')
assert.ok(org.includes(SENTENCE), 'Organization description states the Shopify/e-commerce focus')
assert.match(org, /"@id": "https:\/\/hbeedigitals\.com#organization"/)
assert.match(org, /sameAs: \[\s*"https:\/\/facebook\.com\/thehbeedigitals",\s*"https:\/\/instagram\.com\/thehbeedigitals"\s*\]/, 'sameAs unchanged')
for (const forbidden of ['founder', 'address', 'areaServed', 'contactPoint', 'aggregateRating', 'review']) {
  assert.ok(!org.includes(forbidden), `Organization does not add ${forbidden}`)
}

/* -- Visible copy ------------------------------------------------------ */
assert.ok(read('src/components/site/home/home-content.ts').includes(SENTENCE), 'Homepage lede carries the entity sentence')
assert.ok(
  read('src/components/site/growth-review/growth-review-content.ts').includes(
    'The Hbee Growth Review helps us understand where growth feels stuck in your ecommerce business, review the business and storefront, and recommend what should happen next.',
  ),
  'Growth Review defined in its introduction',
)
const services = read('src/app/(site)/services/page.tsx')
assert.match(services, /Shopify and e-commerce brands/, 'Services meta description states Shopify/e-commerce')

console.log('PASS: entity clarity - Organization @id reused for publisher, author URL present, no duplicate Organization, copy updated, sameAs untouched.')
