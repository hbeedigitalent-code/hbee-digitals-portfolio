import type { CapabilitySemantic } from './capability-semantic'

/**
 * Traffic & Visibility (route: /services/discovery-traffic; Hbee module: Discovery).
 * Semantic capability content for the shared capability template. DRAFT copy —
 * needs owner sign-off. No statistics, prices, timelines or guaranteed outcomes.
 *
 * Scope follows the existing page: technical search foundations (crawlability,
 * indexing, site structure), commercial search intent, page targeting, metadata
 * and content, product discoverability and internal linking, plus the
 * acquisition-pathway and landing-page alignment named on the Services hub. It
 * does NOT claim media buying, daily ad management, budget management,
 * influencer management or ranking/traffic guarantees. Storefront structure and
 * CRO belong to Website & Conversion, creative expression to Creative & UGC,
 * message foundations to Brand & Positioning, tracking and reporting to Digital
 * Systems & Analytics. Those are linked, never claimed here.
 *
 * Insight links use slugs already approved as published in
 * scripts/test-capability-seo.cjs, render only when published, and are labelled
 * with the post's real title.
 */
export const DISCOVERY_TRAFFIC_SEMANTIC: CapabilitySemantic = {
  h1: { lead: 'Ecommerce Traffic,', accent: 'Discovery & Visibility' },
  serviceType: 'Ecommerce traffic and search visibility',
  definition:
    'Traffic & Visibility is the work of making an ecommerce brand easier for the right customers to find and reach. It covers search and organic visibility, product and category discoverability, content that leads shoppers toward products, and the acquisition pathways and landing pages that bring relevant visitors in. It is especially relevant when a store is hard to find, traffic arrives but does not fit the offer, or the team cannot tell whether low sales come from too little traffic, poor traffic quality or visibility gaps.',

  symptoms: {
    eyebrow: 'What it looks like when it is broken',
    headline: 'Signs that discovery, not the storefront, is the constraint.',
    items: [
      { name: 'The store gets very little organic traffic', text: 'Few visits come from search, so growth depends on other sources.' },
      { name: 'Search visibility is mostly branded', text: 'People find the store when they already know its name, not when they search for what it sells.' },
      { name: 'Products are hard to find from search', text: 'Product and category pages do not match the words buyers use.' },
      { name: 'Traffic rises but sales do not follow', text: 'Visits increase without more orders, which can mean the visitors do not match the offer.' },
      { name: 'Ad and social visitors land on pages that do not continue the message', text: 'The promise that earned the click is not repeated on the page.' },
      { name: 'The brand relies on one channel', text: 'Most visits depend on a single source, so a change there affects everything.' },
      { name: 'Content exists but does not lead to products', text: 'Articles and guides attract readers but give them no route to what the store sells.' },
      { name: 'No one knows which visibility opportunity to prioritize', text: 'The team cannot tell whether search, content or another channel deserves attention first.' },
    ],
  },

  diagnose: {
    eyebrow: 'What we diagnose',
    headline: 'What a traffic and visibility review examines before any plan is recommended.',
    intro:
      'More traffic is not automatically better traffic, so Hbee looks at relevance and buyer intent before volume. Each area below is judged against whether it brings the right visitors to the right pages. Reliable tracking, where the review depends on it, is handled through Digital Systems & Analytics.',
    items: [
      { name: 'Current traffic mix', text: 'Which sources bring visitors today, and how much depends on any one of them.' },
      { name: 'Traffic quality', text: 'Whether visitors match the offer, judged by what they look for and what they do next.' },
      { name: 'Search visibility', text: 'Which searches the store appears for, and whether they are the ones buyers use.' },
      { name: 'Product and category discoverability', text: 'Whether product and category pages can be found and are aligned with the words buyers use.' },
      { name: 'Landing-page message match', text: 'Whether the page continues the promise of the ad, search result or post that sent the visitor.' },
      { name: 'Content-to-commerce pathways', text: 'Whether content connects readers to relevant products and collections.' },
      { name: 'Search and content intent', text: 'Whether each page serves the intent of the searches it targets.' },
      { name: 'Acquisition-to-conversion handoff', text: 'Where visitors from each source drop out after arrival, passed to Website & Conversion when the cause is on the page.' },
    ],
  },

  deliverables: ['Search & organic visibility', 'Content-led discovery', 'Landing-page and channel alignment'],

  serviceArea: {
    id: 'search-and-organic-visibility',
    title: 'Search & organic visibility: being found by buyers who are already looking',
    answer:
      'Search and organic visibility is the service area inside Traffic & Visibility that helps an ecommerce store appear for the searches its buyers actually use. It reviews how products, categories and content are targeted, how pages are linked and structured for search, and which commercial searches deserve priority. Progress depends on competition, site condition and how quickly improvements are implemented, so Hbee does not promise rankings or a timeline.',
    topics: [
      { name: 'Search discovery', text: 'Which commercial searches matter for the catalog, and which pages should own each one.' },
      { name: 'Product and category visibility', text: 'Making product and collection pages understandable to search, and to the shopper who finds them.' },
      { name: 'Content opportunities', text: 'Gaps where buyer questions have no page that answers them.' },
      { name: 'Internal pathways', text: 'Links that lead search visitors from entry pages toward relevant products.' },
      { name: 'Discoverable page structure', text: 'Crawlability, indexing, titles and metadata that let pages be found and understood.' },
      { name: 'Buyer-intent alignment', text: 'Matching each page to what the searcher wants to do, so visits are relevant and not merely numerous.' },
    ],
    connection: {
      text: 'Changes to storefront navigation, page layout and product-page design belong to',
      link: { label: 'Website & Conversion', href: '/services/commerce-experience' },
    },
    links: [
      { label: 'Why a Shopify store may not appear in Google', href: '/insights/why-shopify-store-not-appearing-google' },
      { label: 'Explore Digital Systems & Analytics for source tracking', href: '/services/digital-systems' },
    ],
  },

  moreServiceAreas: [
    {
      id: 'content-led-discovery',
      title: 'Content-led discovery: helping shoppers find products through the questions they ask',
      answer:
        'Content-led discovery uses the questions buyers ask to create routes to products they might not search for by name. It plans topics around buyer intent, connects informational pages to relevant products and categories, and links them so a reader has a clear next step toward the store. It stays tied to the commercial goal: content is judged by whether it helps the right shoppers find and understand products, not by how much is published.',
      topics: [
        { name: 'Topics from buyer questions', text: 'Subjects drawn from what shoppers ask before they buy.' },
        { name: 'Informational-to-commercial pathways', text: 'Clear routes from a guide or article to the products it relates to.' },
        { name: 'Product and category education', text: 'Content that explains what to look for, so shoppers can choose with confidence.' },
        { name: 'Insight and content architecture', text: 'How articles and guides are organized so related ones support each other.' },
        { name: 'Internal linking', text: 'Links that connect content, categories and products in both directions.' },
        { name: 'Discovery beyond direct product searches', text: 'Reaching shoppers earlier in their research, before they search for a product by name.' },
      ],
      connection: {
        text: 'The message and topics worth owning come from the positioning set in',
        link: { label: 'Brand & Positioning', href: '/services/brand-positioning' },
      },
      links: [{ label: 'Explore Creative & UGC for product demonstrations and stories', href: '/services/creative-ugc' }],
    },
  ],

  questions: {
    headline: 'Questions merchants ask about ecommerce traffic and visibility.',
    intro: 'Direct answers first, then the reasoning. Each answer stands on its own.',
    items: [
      {
        intent: 'Definition',
        question: 'What is ecommerce traffic and visibility?',
        answer:
          'Ecommerce traffic and visibility is the work of making a store easier for the right customers to find and reach. Visibility is whether the store and its products appear where buyers search, browse or discover; traffic is the visitors that result. The aim is relevant, qualified visits that fit the offer rather than raw session volume, because more traffic is not automatically better traffic.',
      },
      {
        intent: 'Definition',
        question: 'What is organic visibility for an ecommerce store?',
        answer:
          'Organic visibility is how easily an ecommerce store is found through unpaid search results and content, for the searches its buyers use. It depends on whether product, category and content pages target relevant searches, can be crawled and understood, and are linked so that they support each other. It is built over time, and no ranking or timeline can be promised because results depend on competition and site condition.',
      },
      {
        intent: 'Problem',
        question: 'Why is my Shopify store not getting organic traffic?',
        answer:
          'Common causes include pages that target the wrong searches or none, product and category pages without enough descriptive content, technical issues that stop pages being crawled or indexed, weak internal linking and a lack of content that answers buyer questions. A new or small store may also simply have little search presence yet. A search and visibility review identifies which of these applies before any changes are made.',
        links: [{ label: 'Why a Shopify store may not appear in Google', href: '/insights/why-shopify-store-not-appearing-google' }],
      },
      {
        intent: 'Problem',
        question: 'Why does my store get traffic but few sales?',
        answer:
          'When traffic arrives but orders stay low, the visitors may not match the offer, the message that earned the click may not continue on the landing page, or the storefront may be losing shoppers after they arrive. Start by comparing sources by what visitors looked for and what they did next, and check whether each landing page repeats the promise that brought the visitor. If the cause is on the page, the work moves to Website & Conversion.',
        links: [{ label: 'Explore Website & Conversion', href: '/services/commerce-experience' }],
      },
      {
        intent: 'Diagnostic',
        question: 'How do I know if my ecommerce traffic is low quality?',
        answer:
          'Traffic is low quality when the visitors do not match the offer: they leave at once, look at unrelated pages, search for things the store does not sell, or come from sources that never produce orders. Compare sources by the intent behind the visit, the pages entered and what happens next. The source data has to be reliable first, since mislabeled or missing sources can make good traffic look weak.',
        links: [{ label: 'Explore Digital Systems & Analytics for source tracking', href: '/services/digital-systems' }],
      },
      {
        intent: 'Comparison',
        question: 'Should I increase traffic or improve conversion first?',
        answer:
          'If relevant visitors already arrive and leave without buying, fixing the storefront journey first avoids paying to send more people to the same friction. If the store converts the visitors it gets but too few of the right buyers arrive, visibility and traffic come first. Increasing traffic before obvious friction is fixed multiplies waste, and strong conversion cannot create demand that never reaches the store.',
        links: [
          { label: 'Explore Website & Conversion', href: '/services/commerce-experience' },
          { label: 'Start a Growth Review to identify the constraint', href: '/growth-review' },
        ],
      },
      {
        intent: 'Evaluation',
        question: 'What traffic sources should an ecommerce brand prioritize?',
        answer:
          'Prioritize sources by how well their visitors fit the offer and how dependable the source is, not by volume. For many ecommerce brands that means building search and content visibility for buyer-intent searches, using acquisition channels where the likely buyers already are, and avoiding dependence on a single channel. Which mix suits a brand depends on its product, audience, margins and current traffic, so the order is decided from evidence.',
      },
      {
        intent: 'Evaluation',
        question: 'How can product pages become easier to discover?',
        answer:
          'Product pages become easier to discover when each one targets a clear search intent, describes the product in the words buyers use, and has a descriptive title, headings and metadata. They also need internal links from relevant category pages and content, and a structure that search engines can crawl. Clear product information helps both discovery and the shopper, and how the page is designed belongs to Website & Conversion.',
        links: [{ label: 'Explore Website & Conversion for product-page design', href: '/services/commerce-experience' }],
      },
      {
        intent: 'Commercial',
        question: 'What does an ecommerce traffic and visibility engagement include?',
        answer:
          'Expect a review of the current traffic mix, search visibility, page targeting, site structure and landing-page alignment, a prioritized plan of search, content and acquisition-pathway improvements, and implementation of the changes you approve within the scope agreed. Reliable measurement is arranged through Digital Systems & Analytics where it is needed. Hbee does not promise rankings, traffic volumes or sales results.',
      },
    ],
  },
}
