import type { CapabilitySemantic } from './capability-semantic'

/**
 * Retention & Customer Value (route: /services/retention-growth; Hbee module: Growth).
 * Semantic capability content for the shared capability template. DRAFT copy —
 * needs owner sign-off. No statistics, prices, timelines or guaranteed outcomes.
 *
 * Scope follows the existing page: Shopify email marketing and Klaviyo lifecycle
 * systems (welcome, abandonment, post-purchase, win-back, segmentation and
 * campaign planning), improving existing Klaviyo accounts, and retention beyond
 * email. It does NOT claim loyalty or subscription implementation, predictive or
 * machine-learning segmentation, CRM engineering, customer-service operations or
 * paid acquisition. Storefront CRO belongs to Website & Conversion, tracking and
 * integration reliability to Digital Systems & Analytics, message foundations to
 * Brand & Positioning, creative production to Creative & UGC and acquisition to
 * Traffic & Visibility. Those are linked, never claimed here.
 *
 * Insight links use slugs already approved as published in
 * scripts/test-capability-seo.cjs, render only when published, and are labelled
 * with the post's real title.
 */
export const RETENTION_GROWTH_SEMANTIC: CapabilitySemantic = {
  h1: { lead: 'Ecommerce Retention &', accent: 'Customer Value' },
  serviceType: 'Ecommerce retention and lifecycle marketing',
  definition:
    'Retention & Customer Value is the work of helping an ecommerce brand stay useful to customers after the first visit and the first purchase. It covers lifecycle email and automation, welcome journeys, cart and checkout follow-up, post-purchase communication, win-back, segmentation and repeat-purchase planning, with Klaviyo and Shopify as the main platforms. It is especially relevant when most customers buy once and disappear, core automations are missing, or the brand keeps paying to win customers it already has.',

  symptoms: {
    eyebrow: 'What it looks like when it is broken',
    headline: 'Signs that what happens after the first purchase is the constraint.',
    items: [
      { name: 'Most customers buy once and disappear', text: 'First orders do not turn into second orders.' },
      { name: 'There is no welcome journey', text: 'New subscribers and customers get nothing that introduces the brand or helps them choose.' },
      { name: 'Abandoned carts and checkouts get no useful follow-up', text: 'Shoppers who leave partway through are not reminded or helped to return.' },
      { name: 'Post-purchase communication stops after the receipt', text: 'Customers hear nothing about delivery, use, care or what to buy next.' },
      { name: 'Every email goes to the whole list', text: 'New subscribers, first-time buyers and repeat customers all receive the same message.' },
      { name: 'Campaigns are sent but core automations are missing', text: 'Promotions go out while the always-on flows that serve each stage do not exist.' },
      { name: 'The brand keeps paying to reacquire customers it already has', text: 'Past customers are treated as new audiences instead of people with a history.' },
      { name: 'Customers do not know what to buy next', text: 'Nothing connects a first purchase to a relevant follow-on product or a timely reminder.' },
    ],
  },

  diagnose: {
    eyebrow: 'What we diagnose',
    headline: 'What a retention and lifecycle review examines before any flows are recommended.',
    intro:
      'Acquisition gets a customer into the relationship; retention determines what happens after that. Hbee reviews what a customer receives at each stage and whether it is relevant, timely and useful, not whether more email is being sent. Reliable tracking and integrations, where the review depends on them, are handled through Digital Systems & Analytics.',
    items: [
      { name: 'Welcome journey', text: 'What a new subscriber or first-time buyer receives, and whether it introduces the brand and helps them choose.' },
      { name: 'Cart and checkout follow-up', text: 'Whether shoppers who leave a cart or an unfinished checkout are reminded, helped and returned to the journey, where the platform allows.' },
      { name: 'Post-purchase communication', text: 'What customers hear after ordering about delivery, use, care and next steps.' },
      { name: 'Repeat-purchase opportunities', text: 'Where the product and buying cycle make a second order natural, and whether anything supports it.' },
      { name: 'Customer lifecycle stages', text: 'Whether the brand distinguishes subscribers, first-time customers, repeat customers and customers who have gone quiet.' },
      { name: 'Segmentation and message relevance', text: 'Whether different customers receive messages that fit who they are and what they bought.' },
      { name: 'Automation coverage', text: 'Which core flows exist, which are missing, and whether they are set up to work as intended.' },
      { name: 'Customer-value signals', text: 'Which behaviors, such as repeat orders and the time between purchases, show where existing customer value is being lost.' },
    ],
  },

  deliverables: ['Welcome & abandonment flows', 'Post-purchase & win-back', 'Segmentation & campaign planning'],

  serviceArea: {
    id: 'ecommerce-lifecycle-automation',
    title: 'Lifecycle automation: the always-on messages that serve each customer stage',
    answer:
      'Ecommerce lifecycle automation is the set of triggered messages that reach a customer at the moments that matter: after sign-up, after leaving a cart or checkout, after an order, and when a customer has gone quiet. Unlike a one-off campaign, a flow runs every time its trigger happens. Which flows a store needs depends on its product, purchase cycle, available customer data and platform, so Hbee recommends flows from that evidence instead of applying one template to every store.',
    topics: [
      { name: 'Welcome journeys', text: 'Introduce the brand, set expectations and help new subscribers or customers choose.' },
      { name: 'Browse, cart and checkout follow-up', text: 'Reminders that answer likely doubts and return the shopper to the journey. A cart and a checkout are different moments, and what is possible depends on the platform and the data collected.' },
      { name: 'Post-purchase journeys', text: 'Delivery information, how to use or care for the product, and a sensible next step.' },
      { name: 'Replenishment and reorder', text: 'Timely reminders for products that are used up or replaced, where the buying cycle supports it.' },
      { name: 'Win-back', text: 'Relevant messages to customers who have gone quiet, based on how long it has been and what they bought.' },
      { name: 'Customer education and lifecycle segmentation', text: 'Content that helps customers get value from what they bought, and audience splits that keep each message relevant.' },
    ],
    connection: {
      text: 'When a flow fails because tracking or an integration is broken, the technical fix belongs to',
      link: { label: 'Digital Systems & Analytics', href: '/services/digital-systems' },
    },
    links: [
      { label: 'Which Klaviyo flows a Shopify store needs first', href: '/insights/klaviyo-flows-shopify-store-needs-first' },
      { label: 'Explore Website & Conversion for the journey before purchase', href: '/services/commerce-experience' },
    ],
  },

  moreServiceAreas: [
    {
      id: 'customer-value',
      title: 'Customer value: getting more from the customers a brand already has, by being useful',
      answer:
        'Customer value is how much a customer contributes to a brand across the whole relationship, not just in one order. It is often called customer lifetime value (CLV or LTV): the value a customer contributes across their relationship with a brand, rather than from one transaction. In practice, improving it means finding where existing customers are being lost or under-served and making follow-up more relevant and better timed. It does not mean sending more promotions, and Hbee does not promise a specific increase.',
      topics: [
        { name: 'Repeat-purchase opportunities', text: 'Where the product and buying cycle make a second or later order a natural next step.' },
        { name: 'Next-product logic', text: 'Suggesting a relevant follow-on product based on what a customer bought, where the data supports it.' },
        { name: 'Customer segments', text: 'Practical groupings such as subscribers and customers, first-time and repeat buyers, product or category purchased, and recency.' },
        { name: 'Post-purchase experience', text: 'What happens after the order: delivery communication, guidance on use, and a clear way to reorder.' },
        { name: 'Customer education', text: 'Helping customers use and get more from the product, which supports return and reduces doubt.' },
        { name: 'Finding lost customer value', text: 'Identifying the stage where existing customers stop returning, and what is missing there.' },
      ],
      connection: {
        text: 'Retention messaging should sound like the same brand, drawing on the value proposition and voice set in',
        link: { label: 'Brand & Positioning', href: '/services/brand-positioning' },
      },
      links: [
        { label: 'Explore Creative & UGC for education and social-proof content', href: '/services/creative-ugc' },
        { label: 'Explore Traffic & Visibility for acquiring relevant new customers', href: '/services/discovery-traffic' },
      ],
    },
  ],

  questions: {
    headline: 'Questions merchants ask about ecommerce retention and lifecycle marketing.',
    intro: 'Direct answers first, then the reasoning. Each answer stands on its own.',
    items: [
      {
        intent: 'Definition',
        question: 'What is ecommerce retention?',
        answer:
          'Ecommerce retention is the work of keeping customers engaged and buying after their first purchase. It uses lifecycle communication, such as welcome, post-purchase and win-back messages, together with segmentation and repeat-purchase planning, to give customers relevant reasons and timely opportunities to return. It is about usefulness and timing, not about sending more promotional email.',
      },
      {
        intent: 'Definition',
        question: 'What is customer lifetime value in ecommerce?',
        answer:
          'Customer lifetime value is the value a customer contributes across their relationship with a brand, rather than from one transaction. It is usually discussed as the revenue or profit a customer generates over time, and it helps a brand judge what existing customers are worth relative to the cost of acquiring new ones. How it is calculated varies by business, and no improvement can be promised in advance.',
      },
      {
        intent: 'Comparison',
        question: 'What is the difference between email campaigns and automated lifecycle flows?',
        answer:
          'An email campaign is a one-off message sent to a chosen audience at a chosen time, such as a promotion or an announcement. An automated lifecycle flow is a message or sequence triggered by a customer’s action or stage, such as joining the list, abandoning a cart or placing an order, and it runs every time that trigger happens. Flows cover the moments every customer goes through, while campaigns add timely activity on top, so core flows usually come first.',
      },
      {
        intent: 'Evaluation',
        question: 'What email automations should a Shopify store have?',
        answer:
          'Common starting points are a welcome flow, cart and checkout follow-up, post-purchase communication and a win-back flow for customers who have gone quiet. Replenishment or reorder reminders suit products that are used up or replaced. Which flows a store needs, and in what order, depends on its product, buying cycle, customer data, consent setup and platform, so the list is decided from the store and not applied as a template.',
        links: [{ label: 'Which Klaviyo flows a Shopify store needs first', href: '/insights/klaviyo-flows-shopify-store-needs-first' }],
      },
      {
        intent: 'Problem',
        question: 'Why do customers buy once and never return?',
        answer:
          'Common causes include a first experience that ends at the receipt, no communication that helps customers use the product or choose what to buy next, messages that do not distinguish new customers from returning ones, and products with a long or irregular buying cycle. Sometimes the cause lies outside lifecycle communication, such as product fit or the storefront experience. A retention review looks at what customers hear after ordering and where they stop returning.',
      },
      {
        intent: 'Problem',
        question: 'Why are abandoned-cart emails not recovering purchases?',
        answer:
          'Abandoned-cart emails recover fewer purchases when they arrive at the wrong time, repeat the same reminder, ignore the likely reason the shopper left, or go to the wrong people, and when tracking or integrations stop the flow from triggering correctly. A cart is abandoned before checkout begins and a checkout after it has begun, so each may need a different message. No flow brings back every shopper, and if shoppers leave because of friction in the storefront, the fix belongs on the page.',
        links: [
          { label: 'Explore Website & Conversion', href: '/services/commerce-experience' },
          { label: 'Explore Digital Systems & Analytics for flow tracking', href: '/services/digital-systems' },
        ],
      },
      {
        intent: 'Evaluation',
        question: 'When should an ecommerce brand build retention automations?',
        answer:
          'A brand should build retention automations once it has enough subscribers and customers for the messages to reach, and when the welcome, cart and post-purchase moments are going unused or are handled only by one-off campaigns. They are worth putting in place early because they run continuously. They do not replace acquisition or fix a storefront that loses shoppers, so check that relevant visitors arrive and can buy first.',
        links: [{ label: 'Explore Traffic & Visibility for acquiring relevant customers', href: '/services/discovery-traffic' }],
      },
      {
        intent: 'Evaluation',
        question: 'How can a Shopify brand increase repeat purchases?',
        answer:
          'Start with where customers stop returning, then make follow-up more relevant and better timed: a useful welcome, post-purchase guidance, reminders matched to the buying cycle, and segments so different customers receive different messages. Repeat purchase also depends on the product, its price and how often it is needed, so it may not be the right goal for every item. No specific increase can be promised.',
      },
      {
        intent: 'Commercial',
        question: 'What does an ecommerce retention and lifecycle engagement include?',
        answer:
          'Expect a review of the current lifecycle communication, customer segments and email platform setup, a prioritized plan of flows, segments and campaigns, build or improvement of the flows you approve in Klaviyo and Shopify, and a review of how they perform against reliable data. Existing accounts are improved, not replaced by default, and scope is agreed in advance. Hbee does not promise repeat purchases, recovery rates or revenue results.',
      },
    ],
  },
}
