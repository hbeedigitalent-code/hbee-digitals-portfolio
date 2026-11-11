import type { CapabilitySemantic } from './capability-semantic'

/**
 * Brand & Positioning (route: /services/brand-positioning; Hbee module: Brand).
 * Semantic capability content for the shared capability template. DRAFT copy —
 * needs owner sign-off. No statistics, prices, timelines or guaranteed outcomes.
 *
 * Scope follows the existing page: audience and market understanding,
 * positioning, differentiation, value proposition, messaging, product or offer
 * narrative, identity direction and guidance for applying the brand across
 * touchpoints. It stays ecommerce-commercial: it does not claim consumer
 * studies, naming, legal/trademark work or packaging. Storefront structure and
 * CRO belong to Website & Conversion, creative expression to Creative & UGC,
 * discovery to Traffic & Visibility. Those are linked, never claimed here.
 *
 * Insight links use slugs already approved as published in
 * scripts/test-capability-seo.cjs, render only when published, and are labelled
 * with the post's real title.
 */
export const BRAND_POSITIONING_SEMANTIC: CapabilitySemantic = {
  h1: { lead: 'Ecommerce Brand', accent: 'Positioning & Strategy' },
  serviceType: 'Ecommerce brand positioning and strategy',
  definition:
    'Brand & Positioning is the work of clarifying who an ecommerce brand is for, what makes it meaningfully different, what value it promises and how that promise is expressed consistently, so customers can understand the brand and choose it over the alternatives. It covers audience clarity, differentiation, value proposition, messaging, reasons to believe and the identity direction that carries them. It is especially relevant when visitors cannot tell what makes the brand different, messaging changes from page to page, or customers compare mainly on price.',

  symptoms: {
    eyebrow: 'What it looks like when it is broken',
    headline: 'Signs that the positioning, not the product, is the constraint.',
    items: [
      { name: 'Visitors cannot tell what makes the brand different', text: 'They see products and prices, but nothing that explains why this brand rather than another.' },
      { name: 'The homepage sounds like competitors', text: 'Headlines and claims could be swapped with another brand in the category without anyone noticing.' },
      { name: 'The product benefit is clear but the reason to choose the brand is not', text: 'Shoppers understand what the product does, not why to buy it from you.' },
      { name: 'Messaging changes across pages and channels', text: 'The ad, the product page and the email each describe the brand differently, and different teams or creators interpret it in their own way.' },
      { name: 'The identity looks polished but the positioning is weak', text: 'The visual work is strong, yet it does not say who the brand is for or what it stands for.' },
      { name: 'The brand tries to appeal to everyone', text: 'The message avoids choosing an audience, so no one feels it was written for them.' },
      { name: 'Offers are hard to explain', text: 'Bundles and promotions struggle because the value proposition underneath them is unclear.' },
      { name: 'Customers compare mainly on price', text: 'Without a clear reason to choose, price becomes the only difference they can see.' },
    ],
  },

  diagnose: {
    eyebrow: 'What we diagnose',
    headline: 'What a positioning review examines before any direction is recommended.',
    intro:
      'Hbee reviews how the brand is understood from the customer’s side, then decides what to clarify first. Each area below is tied to a decision the business has to make or a perception it needs to change.',
    items: [
      { name: 'Audience clarity', text: 'Who the brand is really for, and whether its messaging speaks to them directly.' },
      { name: 'Category and context', text: 'Which category shoppers think the brand belongs to, and what they compare it against.' },
      { name: 'Competitor similarity', text: 'How closely the brand’s message, claims and look resemble the alternatives shoppers see.' },
      { name: 'Differentiation', text: 'What is genuinely different about the brand or product, and whether that difference matters to the buyer.' },
      { name: 'Value proposition', text: 'Whether the promise is specific, relevant and easy to state in a sentence.' },
      { name: 'Message hierarchy', text: 'Which message comes first, second and third on key pages, and whether shoppers meet them in that order.' },
      { name: 'Customer language', text: 'The words customers use to describe the problem and the product, and whether the brand uses them.' },
      { name: 'Reasons to believe and consistency', text: 'What proof supports the promise, and whether the brand says and shows the same thing everywhere.' },
    ],
  },

  serviceArea: {
    id: 'ecommerce-brand-positioning',
    title: 'Ecommerce brand positioning: the place a brand is trying to own in the customer’s mind',
    answer:
      'Brand identity describes how a brand looks and sounds. Brand positioning defines the place the brand is trying to own in the customer’s mind, and why that choice should matter to the people it is for. In ecommerce it is the commercial decision behind the logo, the homepage and the ads: who the brand serves, what it does differently, and why a shopper should choose it over the alternatives.',
    topics: [
      { name: 'What positioning is', text: 'A deliberate choice of audience, category and reason to choose, written down so the whole business can act on it.' },
      { name: 'What it is not', text: 'Not a logo, a color palette or a slogan. Those express a position; they do not decide it.' },
      { name: 'Positioning and customer choice', text: 'Shoppers choose between alternatives. Positioning gives them a basis for choosing other than price.' },
      { name: 'Differentiation and value proposition', text: 'Differentiation is what is genuinely different. The value proposition is how that difference is promised to a buyer.' },
      { name: 'Effect on the website and offers', text: 'The store and its offers need a clear message to carry, so positioning decides what they must communicate.' },
      { name: 'Effect on creative and acquisition', text: 'Search snippets, ads, landing-page messages and social creative draw on the same direction, so they do not describe different brands.' },
    ],
    connection: {
      text: 'How that message is structured through the shopper journey belongs to',
      link: { label: 'Website & Conversion', href: '/services/commerce-experience' },
    },
    links: [{ label: 'Brand positioning vs brand identity', href: '/insights/brand-positioning-vs-brand-identity' }],
  },

  moreServiceAreas: [
    {
      id: 'value-proposition-and-messaging',
      title: 'Value proposition and messaging: saying the difference clearly',
      answer:
        'Value proposition and messaging is the strategic layer that turns a positioning decision into words customers can understand. It defines the promise, the order in which messages should appear, the reasons to believe it and the language customers recognize, so every page, ad and email can say the same thing in its own format. Hbee treats this as messaging architecture first, and the scope of asset-level copy is agreed for each engagement.',
      topics: [
        { name: 'Value proposition', text: 'A specific statement of who the brand helps, with what, and why that is worth choosing.' },
        { name: 'Message hierarchy', text: 'The order of the main message, supporting points and proof on key pages and channels.' },
        { name: 'Product and brand benefit articulation', text: 'How product benefits connect to the brand’s reason to exist.' },
        { name: 'Reasons to believe', text: 'The evidence that makes the promise credible: product facts, customer proof, policies and process.' },
        { name: 'Category language', text: 'The words shoppers use to find and compare products, used consistently.' },
        { name: 'Consistent verbal direction', text: 'Guidance on tone and wording so different people and channels stay on message.' },
      ],
      connection: {
        text: 'Positioning also feeds the offer. Product & Offer uses value clarity when it explains products and deals, inside',
        link: { label: 'Website & Conversion', href: '/services/commerce-experience#product-and-offer' },
      },
      links: [
        { label: 'How to write a clear ecommerce value proposition', href: '/insights/how-to-write-clear-ecommerce-value-proposition' },
        { label: 'Explore Creative & UGC for turning the message into content', href: '/services/creative-ugc' },
        { label: 'Explore Traffic & Visibility for where the message is found', href: '/services/discovery-traffic' },
      ],
    },
  ],

  questions: {
    headline: 'Questions merchants ask about ecommerce brand positioning.',
    intro: 'Direct answers first, then the reasoning. Each answer stands on its own.',
    items: [
      {
        intent: 'Definition',
        question: 'What is ecommerce brand positioning?',
        answer:
          'Ecommerce brand positioning is the decision about who a brand is for, what category it competes in, what makes it different and why a customer should choose it over the alternatives. It turns those decisions into a clear promise that the store, the ads and the products can all express. It is a commercial choice about customer perception, not a logo or a tagline.',
      },
      {
        intent: 'Definition',
        question: 'What is a value proposition in ecommerce?',
        answer:
          'A value proposition is a clear statement of what a brand offers, who it is for and why that is worth choosing over the alternatives. In ecommerce it has to be understood quickly on a homepage, product page or ad, so it is usually specific about the customer, the benefit and the reason to believe it. A good one can be said in a sentence and matches what the product really delivers.',
        links: [{ label: 'How to write a clear ecommerce value proposition', href: '/insights/how-to-write-clear-ecommerce-value-proposition' }],
      },
      {
        intent: 'Comparison',
        question: 'What is the difference between brand positioning and brand identity?',
        answer:
          'Brand identity describes how a brand looks and sounds: its name, logo, colors, typography and tone. Brand positioning defines the place the brand is trying to own in the customer’s mind and why that choice should matter. Identity expresses positioning, so a polished identity cannot fix an unclear position, while a clear position gives identity decisions something to express. Brand strategy, in this commercial sense, covers positioning and messaging, and visual identity is one way of applying it.',
        links: [{ label: 'Brand positioning vs brand identity', href: '/insights/brand-positioning-vs-brand-identity' }],
      },
      {
        intent: 'Comparison',
        question: 'Should brand positioning come before a website redesign or new ads?',
        answer:
          'Positioning should usually come first when the problem is that shoppers do not understand the brand or the offer, because a new storefront or new ads would only express the same unclear message more attractively. If the message is already clear and shoppers still leave, the constraint is more likely the storefront, the traffic or the measurement. Checking which case applies avoids redesigning or advertising around the wrong problem.',
        links: [
          { label: 'Explore Website & Conversion', href: '/services/commerce-experience' },
          { label: 'Explore Traffic & Visibility', href: '/services/discovery-traffic' },
        ],
      },
      {
        intent: 'Problem',
        question: 'Why does my ecommerce brand sound like competitors?',
        answer:
          'Common causes include describing the product category instead of the brand’s own reason to exist, using the same claims and phrases as competitors, and not choosing a specific audience. It also happens when the brand has not decided what it is genuinely different at. The fix starts with positioning: deciding who the brand is for and what it should be known for, then expressing that in messaging customers recognize.',
      },
      {
        intent: 'Problem',
        question: 'Why do customers compare my products mainly on price?',
        answer:
          'Customers fall back on price when nothing else distinguishes the choices. Common causes include an unclear value proposition, benefits that every competitor claims, thin reasons to believe and an offer that is hard to explain. Better positioning gives shoppers another basis for choosing, though it does not promise that they will pay more, because the product, the price and the market still matter.',
        links: [{ label: 'Explore Product & Offer inside Website & Conversion', href: '/services/commerce-experience#product-and-offer' }],
      },
      {
        intent: 'Evaluation',
        question: 'How do I know if my brand positioning is unclear?',
        answer:
          'Positioning is probably unclear when a new visitor cannot say in a sentence who the brand is for and why to choose it, when the homepage could belong to a competitor, when messaging differs between channels, or when offers need long explanations. A practical check is to validate the positioning against the evidence already available, such as customer reviews and feedback, support questions, on-site behavior and how competitors describe themselves, and see whether it matches what the brand intends to say.',
      },
      {
        intent: 'Evaluation',
        question: 'When should an ecommerce brand reposition?',
        answer:
          'An ecommerce brand should consider repositioning when it enters a new market or customer segment, when its range or price level has changed, when competitors have moved into its space, or when growth has stalled because customers do not see a clear reason to choose it. Repositioning is not the answer to every dip in sales, so check whether the cause is the message or something else, such as traffic quality, the storefront or tracking.',
        links: [{ label: 'Start a Growth Review to identify the constraint', href: '/growth-review' }],
      },
      {
        intent: 'Commercial',
        question: 'What does an ecommerce brand-positioning engagement include?',
        answer:
          'Expect a review of the audience, category, competitors and current messaging, a positioning direction with differentiation and a value proposition, a message hierarchy with reasons to believe, and guidance for applying it across the store, creative and marketing. Identity direction is included where the engagement calls for it, and the exact scope is agreed in advance. Hbee does not promise a particular sales or conversion outcome.',
      },
    ],
  },
}
