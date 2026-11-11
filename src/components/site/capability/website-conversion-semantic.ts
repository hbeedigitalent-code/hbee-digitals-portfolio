import type { CapabilitySemantic } from './capability-semantic'

/**
 * Website & Conversion (route: /services/commerce-experience; Hbee module: Experience).
 * Reference implementation of the semantic capability template. DRAFT copy —
 * needs owner sign-off. No statistics, prices, timelines or guarantees.
 *
 * Insight links use slugs already approved as published in
 * scripts/test-capability-seo.cjs.
 */
export const WEBSITE_CONVERSION_SEMANTIC: CapabilitySemantic = {
  h1: { lead: 'Shopify Website Design &', accent: 'Conversion Optimization' },
  serviceType: 'Shopify website design and conversion optimization',
  definition:
    'Website & Conversion is the work of designing and improving a Shopify storefront so qualified visitors can understand the offer, trust the brand and complete a purchase. It covers navigation, collection and product pages, product presentation, offer clarity, mobile usability, trust signals and the path to checkout. It is especially relevant when a store attracts traffic but too few visitors move from browsing to buying.',

  symptoms: {
    eyebrow: 'What it looks like when it is broken',
    headline: 'Signs that the storefront, not the traffic, is the constraint.',
    items: [
      { name: 'Traffic arrives but orders stay low', text: 'Sessions or ad spend grow while conversion and revenue per visit stay flat.' },
      { name: 'Shoppers view products but do not add to cart', text: 'Product pages are opened and abandoned because the offer, price or fit questions go unanswered.' },
      { name: 'Mobile visitors leave earlier than desktop visitors', text: 'Navigation, galleries or buttons that work on a desktop are awkward on a phone.' },
      { name: 'Carts are started but not completed', text: 'Shipping cost, delivery time, returns or payment options appear late or are unclear.' },
      { name: 'Visitors cannot tell what to choose', text: 'Collections, filters and product naming do not guide a shopper to the right product.' },
      { name: 'The store looks credible to its owner but not to a first-time visitor', text: 'Reviews, policies, contact details and proof are thin or hard to find.' },
    ],
  },

  diagnose: {
    eyebrow: 'What we diagnose',
    headline: 'What a Shopify conversion review examines before any work is recommended.',
    intro:
      'Hbee reviews the journey in the order a shopper experiences it, then decides which changes deserve priority. Each area below is judged against the shopper’s question at that moment.',
    items: [
      { name: 'Entry pages and message match', text: 'Whether the page a visitor lands on continues the promise of the ad, search result or email that brought them.' },
      { name: 'Navigation and collections', text: 'Whether a shopper can reach a relevant product in a few clear steps.' },
      { name: 'Product pages', text: 'Whether the page answers what the product is, who it is for, why it is worth the price, and what happens after purchase.' },
      { name: 'Offer and price communication', text: 'Whether bundles, shipping thresholds, discounts and value are presented clearly and honestly.' },
      { name: 'Trust and reassurance', text: 'Reviews, guarantees, policies, contact details and secure-checkout cues, and how easily they are found.' },
      { name: 'The mobile journey', text: 'Tap targets, image galleries, persistent actions and page speed on a phone.' },
      { name: 'Cart and checkout friction', text: 'Unexpected costs, forced steps and missing payment options between cart and order.' },
      { name: 'Measurement quality', text: 'Whether funnel tracking is reliable enough to judge any of the above. Weak tracking is handled through Digital Systems & Analytics.' },
    ],
  },

  serviceArea: {
    id: 'product-and-offer',
    title: 'Product & Offer: making the product and the deal easy to understand',
    answer:
      'Product & Offer is the service area inside Website & Conversion that covers how products are presented, grouped and priced on the storefront. A stronger offer is one a shopper can understand quickly: what the product is, why it is worth the price, and why to buy it now rather than later.',
    topics: [
      { name: 'Value proposition on the page', text: 'Stating the product’s main benefit and difference where the shopper makes the decision.' },
      { name: 'Product presentation', text: 'Images, video, descriptions and specifications arranged to answer buying questions in order.' },
      { name: 'Merchandising and product hierarchy', text: 'Which products lead a collection, how products are grouped and how a shopper moves between them.' },
      { name: 'Bundles and offer structure', text: 'How bundles, sets, quantity options and add-ons are built and explained.' },
      { name: 'Pricing and value communication', text: 'Showing price against value, including shipping thresholds and discounts, without confusing the shopper.' },
      { name: 'Launch and seasonal offers', text: 'Presenting a time-limited offer clearly, without manufactured urgency.' },
    ],
    connection: {
      text: 'Product and offer decisions depend on a clear value proposition and differentiation, which are defined in',
      link: { label: 'Brand & Positioning', href: '/services/brand-positioning' },
    },
    links: [
      { label: 'How to build product pages that answer buying questions', href: '/insights/how-to-build-product-pages-that-answer-buying-questions' },
      { label: 'How to write a clear ecommerce value proposition', href: '/insights/how-to-write-clear-ecommerce-value-proposition' },
    ],
  },

  questions: {
    headline: 'Questions merchants ask about Shopify conversion.',
    intro: 'Direct answers first, then the reasoning. Each answer stands on its own.',
    items: [
      {
        intent: 'Definition',
        question: 'What is Shopify conversion optimization?',
        answer:
          'Shopify conversion optimization is the structured work of finding and reducing the friction that stops visitors from buying. It looks at product pages, navigation, mobile usability, trust, content hierarchy, cart behavior and the path to checkout, and changes the parts the evidence shows are costing sales.',
      },
      {
        intent: 'Definition',
        question: 'What does a Shopify conversion audit examine?',
        answer:
          'A Shopify conversion audit examines the full path from arrival to purchase to identify where shoppers hesitate or drop off. It typically reviews message match, navigation, product and collection pages, offer clarity, trust, mobile usability, cart and checkout friction, and whether the tracking is reliable enough to measure the problem. The result should be a prioritized action plan, not just a list of observations.',
        links: [{ label: 'See what a Shopify conversion review examines in detail', href: '/services/commerce-experience#what-we-diagnose' }],
      },
      {
        intent: 'Problem',
        question: 'Why does a Shopify store get traffic but not sales?',
        answer:
          'Common causes include something between arrival and purchase that does not answer the visitor: an unclear offer, a product page that lacks the information needed to buy, awkward mobile use, thin trust or checkout costs that appear late. Traffic quality can also be the cause, so the first step is to separate store friction from visitor mismatch by comparing behavior across entry pages, devices and sources.',
        links: [{ label: 'Identify Shopify conversion friction', href: '/insights/identify-shopify-conversion-friction' }],
      },
      {
        intent: 'Problem',
        question: 'What makes a product page convert better?',
        answer:
          'A product page converts better when it answers the buyer’s questions in the order they ask them: what the product is, who it is for, why it is worth the price, what proof supports it, and what happens after purchase, including delivery and returns. Clear images or video, concise descriptions, visible reviews and one obvious primary action support that.',
        links: [{ label: 'How to build product pages that answer buying questions', href: '/insights/how-to-build-product-pages-that-answer-buying-questions' }],
      },
      {
        intent: 'Evaluation',
        question: 'When should a Shopify store be redesigned?',
        answer:
          'A store should be redesigned when the problems are structural: a theme or template that limits navigation, a mobile layout that cannot be fixed with adjustments, or an information architecture that no longer fits the catalog. If the structure works but specific pages underperform, targeted optimization is usually the more proportionate step.',
        links: [{ label: 'Shopify redesign vs optimization', href: '/insights/shopify-redesign-vs-optimization' }],
      },
      {
        intent: 'Comparison',
        question: 'What is the difference between a Shopify redesign and conversion optimization?',
        answer:
          'A redesign changes the structure and look of the storefront as a whole, while conversion optimization changes specific parts of the journey based on evidence of where shoppers hesitate. Redesign suits a store whose structure is the problem. Optimization suits a structurally sound store that is losing shoppers at identifiable points.',
        links: [{ label: 'Shopify redesign vs optimization', href: '/insights/shopify-redesign-vs-optimization' }],
      },
      {
        intent: 'Comparison',
        question: 'Should I fix traffic or conversion first?',
        answer:
          'Fix conversion first when qualified visitors already arrive but leave without buying, because more traffic would reach the same friction. Work on traffic first when the store converts the visitors it receives but too few of the right buyers arrive. Hbee uses the store journey and the available data to decide which constraint comes first.',
        links: [
          { label: 'Explore Traffic & Visibility', href: '/services/discovery-traffic' },
          { label: 'Start a Growth Review to find the constraint', href: '/growth-review' },
        ],
      },
      {
        intent: 'Commercial',
        question: 'What should I expect from a conversion optimization engagement?',
        answer:
          'Expect a diagnosis of the journey, a prioritized list of changes with the reasoning behind them, implementation of the changes you approve, and measurement of the result where tracking allows. Scope is agreed around the actual business problem. Hbee does not promise a specific conversion rate or revenue outcome.',
      },
      {
        intent: 'Diagnostic',
        question: 'What should be fixed before increasing ad spend?',
        answer:
          'Fix anything that stops a visitor from understanding the offer or completing a purchase: message match between the ad and landing page, product-page clarity, mobile usability, trust signals, checkout friction, and tracking so results can be read. Paying for more visitors before those are addressed multiplies the same loss.',
        links: [{ label: 'Explore Digital Systems & Analytics for tracking', href: '/services/digital-systems' }],
      },
    ],
  },
}
