import type { CapabilitySemantic } from './capability-semantic'

/**
 * Digital Systems & Analytics (route: /services/digital-systems; Hbee module: Technology).
 * Semantic capability content for the shared capability template. DRAFT copy —
 * needs owner sign-off. No statistics, prices, timelines or guaranteed outcomes.
 *
 * Ownership: this capability owns analytics, tracking, measurement, integrations,
 * automation and diagnostics. Storefront design, redesign and conversion work
 * belong to Website & Conversion, so they are linked, never claimed here.
 * Platforms named are only those already evidenced on the site (Shopify, Klaviyo).
 *
 * Insight links use slugs already approved as published in
 * scripts/test-capability-seo.cjs.
 */
export const DIGITAL_SYSTEMS_SEMANTIC: CapabilitySemantic = {
  h1: { lead: 'Ecommerce Analytics, Tracking &', accent: 'Digital Systems' },
  serviceType: 'Ecommerce analytics, tracking and digital systems',
  definition:
    'Digital Systems & Analytics is the work of connecting the tools behind an ecommerce business and making its data trustworthy enough to act on. It covers tracking and analytics setup, funnel measurement, integrations, automation, reporting and the diagnostics that show where growth is constrained. It is especially relevant when a store’s numbers disagree, its tools do not talk to each other, or the cause of a growth problem is visible but not clear.',

  symptoms: {
    eyebrow: 'What it looks like when it is broken',
    headline: 'Signs that the data or the systems, not the strategy, are the constraint.',
    items: [
      { name: 'Analytics numbers do not agree', text: 'Shopify, analytics and ad-platform figures for the same period tell different stories.' },
      { name: 'Conversion events are missing', text: 'Add-to-cart, checkout or purchase events do not fire reliably, so funnel steps cannot be measured.' },
      { name: 'Ads and store data cannot be reconciled', text: 'Spend and orders cannot be matched to sources with any confidence.' },
      { name: 'Nobody can say what is driving results', text: 'Which channel, page or campaign deserves the credit is a matter of opinion.' },
      { name: 'Tools are disconnected', text: 'The store, email, support and reporting tools each hold a different version of the customer and the order.' },
      { name: 'Reporting is manual or inconsistent', text: 'Numbers are assembled by hand and change from week to week.' },
      { name: 'Automations fail silently', text: 'Flows, syncs and notifications stop working and nobody notices until a customer complains.' },
      { name: 'Growth problems are visible but the cause is unclear', text: 'Sales are flat or falling and no one can say whether traffic, conversion, offer or retention is responsible.' },
    ],
  },

  diagnose: {
    eyebrow: 'What we diagnose',
    headline: 'What a Shopify analytics and systems review examines before any work is recommended.',
    intro:
      'Hbee starts with whether the measurement can be trusted, then looks at how the tools connect, then at what the data says about growth. Each area below is judged against the decision the business has to make with it.',
    items: [
      { name: 'Tracking coverage', text: 'Whether the pages, events and conversions that matter are tracked at all, on desktop and on mobile.' },
      { name: 'Event reliability', text: 'Whether events fire once, carry the right values and survive theme, app and checkout changes.' },
      { name: 'Ecommerce funnel measurement', text: 'Whether each step from product view to purchase can be counted separately and reconciled with real orders.' },
      { name: 'Channel and source visibility', text: 'Whether traffic and orders are attributed consistently enough to compare channels, with the limits of attribution understood.' },
      { name: 'Storefront-to-marketing data flow', text: 'Whether store data reaches the advertising, email and reporting tools that depend on it.' },
      { name: 'Integrations and automation', text: 'Whether connected apps and workflows run reliably, and whether they fail visibly when they break.' },
      { name: 'Reporting and decision visibility', text: 'Whether the people making decisions can see the numbers they need without manual assembly.' },
      { name: 'Whether the right questions are measured', text: 'Whether the business tracks what its growth decisions actually depend on, not just what is easy to count.' },
    ],
  },

  deliverables: ['Tracking & integrations', 'Automation workflows', 'Reporting & diagnostics'],

  serviceArea: {
    id: 'analytics-and-diagnostics',
    title: 'Analytics & Diagnostics: finding what is actually limiting growth',
    answer:
      'Analytics & Diagnostics is the service area inside Digital Systems & Analytics that turns measurement into a clear view of the growth constraint. It compares traffic, conversion and retention signals, finds the gaps in measurement, and recommends what to fix first.',
    topics: [
      { name: 'Identifying growth constraints', text: 'Narrowing a flat or falling result to the stage that is limiting it: positioning, offer, storefront, traffic or retention.' },
      { name: 'Interpreting funnel behavior', text: 'Reading where shoppers drop out between landing, product view, cart and purchase, by device and by source.' },
      { name: 'Comparing traffic, conversion and retention signals', text: 'Looking at acquisition, on-site behavior and repeat purchasing side by side instead of in isolation.' },
      { name: 'Finding measurement gaps', text: 'Identifying what cannot yet be measured reliably, and what that is costing in decisions.' },
      { name: 'Prioritizing action', text: 'Ranking what to fix first by likely effect and effort, with the reasoning shown.' },
      { name: 'Reporting foundations', text: 'Setting up the views a team needs to keep watching the constraint after the first diagnosis.' },
    ],
    connection: {
      text: 'When a diagnosis points to the storefront journey, the work moves to the capability that owns it:',
      link: { label: 'Website & Conversion', href: '/services/commerce-experience' },
    },
    links: [{ label: 'Start a Growth Review to identify the constraint', href: '/growth-review' }],
  },

  questions: {
    headline: 'Questions merchants ask about ecommerce analytics and systems.',
    intro: 'Direct answers first, then the reasoning. Each answer stands on its own.',
    items: [
      {
        intent: 'Definition',
        question: 'What is ecommerce analytics?',
        answer:
          'Ecommerce analytics is the collection and interpretation of data about how shoppers find, browse and buy from an online store. It connects traffic sources, on-site behavior, orders and what customers do after purchase, so a business can see which parts of the journey are working and which are losing sales, and decide what to change with evidence rather than opinion.',
      },
      {
        intent: 'Definition',
        question: 'What does ecommerce tracking include?',
        answer:
          'Ecommerce tracking records the actions that matter along the buying journey: product views, add-to-cart, checkout steps, purchases and the source of each visit. It also covers how those events are passed to the advertising, email and reporting tools that use them. Tracking is complete when each funnel step can be counted separately and the totals can be reconciled with store orders.',
      },
      {
        intent: 'Problem',
        question: 'Why do Shopify analytics and ad-platform numbers differ?',
        answer:
          'Common reasons include different attribution rules and time windows, tracking that is blocked or missing for some visitors, events that fire twice or not at all, and platforms that count views, clicks and orders differently. Small differences are normal. Large or growing gaps usually point to a tracking or integration fault that should be diagnosed rather than averaged away.',
      },
      {
        intent: 'Problem',
        question: 'Why is my ecommerce tracking incomplete?',
        answer:
          'Tracking usually becomes incomplete after a theme change, a new app, a checkout change or a platform update, or because it was only partly set up in the first place. Typical gaps are missing purchase or add-to-cart events, mobile behavior that is not captured and checkout steps that cannot be measured. A tracking audit tests each event against real orders to find what is missing.',
      },
      {
        intent: 'Diagnostic',
        question: 'How do you diagnose why an ecommerce store is not growing?',
        answer:
          'Start with the funnel: compare traffic quality, on-site conversion and repeat purchasing, then find the stage where results fall furthest short of what the business needs. Check that the measurement is reliable before trusting any stage, because bad tracking can make a healthy stage look broken. The result should be a ranked view of constraints, not a long list of observations.',
        links: [
          { label: 'Identify Shopify conversion friction', href: '/insights/identify-shopify-conversion-friction' },
          { label: 'Start a Growth Review to identify the constraint', href: '/growth-review' },
        ],
      },
      {
        intent: 'Comparison',
        question: 'Which should be fixed first: traffic, conversion or retention?',
        answer:
          'Fix the stage that limits the others. If qualified visitors arrive but few buy, conversion comes first. If the store converts but too few of the right buyers arrive, traffic comes first. If first orders are healthy but customers do not return, retention comes first. Measurement decides which case applies, which is why reliable data usually comes before any of the three.',
        links: [
          { label: 'Explore Website & Conversion', href: '/services/commerce-experience' },
          { label: 'Explore Traffic & Visibility', href: '/services/discovery-traffic' },
          { label: 'Explore Retention & Customer Value', href: '/services/retention-growth' },
        ],
      },
      {
        intent: 'Evaluation',
        question: 'What analytics should a Shopify store track?',
        answer:
          'A Shopify store should track the full path from visit to purchase: sessions by source, product views, add-to-cart, checkout starts and purchases, with order value, device and whether the customer is new or returning. It should also track what follows a purchase, such as repeat orders and email or flow results where those are in use. Start with the questions the business must answer, then track what answers them.',
      },
      {
        intent: 'Evaluation',
        question: 'When does an ecommerce brand need better reporting or tracking?',
        answer:
          'A brand needs better tracking or reporting when its numbers disagree between tools, when it cannot say which channel or page drives orders, when reports are assembled by hand, or when budget decisions are made on partial data. It also helps before a redesign or a large increase in ad spend, so the effect of the change can actually be measured.',
      },
      {
        intent: 'Commercial',
        question: 'What does an ecommerce analytics and systems engagement include?',
        answer:
          'Expect an audit of tracking, integrations and reporting, a prioritized list of fixes with the reason for each, implementation of the changes you approve, and checks that events and reports match real orders. Scope is agreed around the business problem and can include connecting the store with email, advertising and reporting tools, or automating manual work. Hbee does not promise a specific revenue or conversion result.',
      },
    ],
  },
}
