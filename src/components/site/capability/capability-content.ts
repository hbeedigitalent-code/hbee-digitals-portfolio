/**
 * Capability-detail content — DESIGN-CONTROLLED copy (CMS policy: hybrid).
 *
 * One structured object per capability drives the whole detail template
 * (CapabilityDetailPage). All six approved capabilities use the same page
 * structure, with names and groups from the Services capability system.
 *
 * Names, slugs, groups and icons are NOT repeated here: they come from the
 * approved Services capability system (SERVICE_GROUPS), so the detail page
 * and the Services page can never disagree about them.
 *
 * Copy supplied in the Phase 5 brief is used verbatim. Copy marked DRAFT was
 * written for this phase and needs owner sign-off.
 */

import { SERVICE_GROUPS, type ServiceCapability, type ServiceGroup } from '../services/services-content'
import type { CapabilitySemantic } from './capability-semantic'
import { BRAND_POSITIONING_SEMANTIC } from './brand-positioning-semantic'
import { CREATIVE_UGC_SEMANTIC } from './creative-ugc-semantic'
import { DISCOVERY_TRAFFIC_SEMANTIC } from './discovery-traffic-semantic'
import { RETENTION_GROWTH_SEMANTIC } from './retention-growth-semantic'
import { DIGITAL_SYSTEMS_SEMANTIC } from './digital-systems-semantic'
import { WEBSITE_CONVERSION_SEMANTIC } from './website-conversion-semantic'

/** The module of the six-part Hbee system a capability is drawn as. */
export type SystemModule = 'Brand' | 'Experience' | 'Technology' | 'Creative' | 'Discovery' | 'Growth'

export interface CapabilityDetail {
  slug: string
  seo: {
    title: string
    description: string
  }
  /** Which module of the Hbee system this capability features in visuals. */
  systemModule: SystemModule
  hero: {
    headline: string
    /** Second headline line, in Royal Blue. */
    headlineAccent: string
    summary: string
    /** Accessible description of the hero visual. */
    visualLabel: string
    /**
     * Set when both headline lines wrap in the half-width hero column (a
     * 4-line H1 on desktop). On short desktop viewports the hero then uses a
     * tighter vertical rhythm — spacing only, never type size — so both CTAs
     * stay in view. Reusable for any capability with a long headline.
     */
    longHeadline?: boolean
  }
  opportunity: {
    headline: string
    copy: string
    bestFor: string
    outcomes: { name: string; text: string }[]
  }
  approach: {
    headline: string
    headlineAccent: string
    copy: string
    /** The workstream INSIDE this capability — not the canonical Hbee process. */
    steps: { name: string; text: string }[]
  }
  work: {
    headline: string
    empty: string
  }
  /** Published Insights are still DB-owned; these slugs only assign contextual relevance. */
  insightSlugs: string[]
  systemFit: {
    headline: string
    headlineAccent: string
    copy: string
    /** DRAFT — one line per related capability: what this one gives it. */
    relations: Record<string, string>
  }
  cta: {
    eyebrow: string
    headline: string
    copy: string
    secondaryLabel: string
  }
  faq: { question: string; answer: string }[]
  /** Opt-in semantic template (search / answer-engine layer). Absent = classic template. */
  semantic?: CapabilitySemantic
}

export const BRAND_POSITIONING: CapabilityDetail = {
  slug: 'brand-positioning',
  seo: {
    title: 'Ecommerce Brand Positioning & Strategy',
    description:
      'Ecommerce brand positioning for Shopify brands: audience clarity, differentiation, value proposition and messaging that help customers understand and choose.',
  },
  systemModule: 'Brand',
  hero: {
    headline: 'A clearer brand.',
    headlineAccent: 'Stronger growth.',
    summary:
      'We help ecommerce and product-led businesses clarify their positioning, value proposition and messaging — then carry that foundation into product storytelling, brand identity and the wider customer experience.',
    visualLabel:
      'Brand & Positioning, the Brand module, highlighted as the active module of the Hbee system, connected to Experience, Creative and Discovery, with Technology and Growth further back.',
  },
  opportunity: {
    headline: 'Your brand is more than a logo.',
    copy:
      'When the value proposition is unclear, product stories become generic and the brand looks different from one touchpoint to the next, customers have to work too hard to understand why they should choose you. Clear positioning gives the whole business a more coherent direction.',
    bestFor:
      'New or established ecommerce brands with an unclear offer, weak differentiation or an existing identity that no longer reflects the business.',
    outcomes: [
      { name: 'Clarity', text: 'A clearer story for who you are, who you’re for and why it matters.' },
      {
        name: 'Differentiation',
        text: 'A distinct position in your market that helps customers understand why they should choose you.',
      },
      {
        name: 'Impact',
        text: 'A stronger foundation for product communication, marketing, customer experience and future growth.',
      },
    ],
  },
  approach: {
    headline: 'From strategy',
    headlineAccent: 'to a brand that works.',
    copy:
      'We combine strategic thinking with practical execution to build brand and positioning foundations that support real business decisions — not just better-looking assets.',
    steps: [
      { name: 'Discover', text: 'Understand the business, market, customers and current position.' },
      { name: 'Define', text: 'Clarify purpose, positioning, audience, differentiation and core message pillars.' },
      { name: 'Develop', text: 'Build the brand strategy, identity direction and the assets required for the business.' },
      { name: 'Apply', text: 'Carry the positioning into digital presence, product communication, marketing and customer experience.' },
    ],
  },
  work: {
    headline: 'Brand and positioning applied to real businesses.',
    empty: 'Real capability examples will appear here as related case studies are published.',
  },
  insightSlugs: [
    'brand-positioning-vs-brand-identity',
    'first-five-things-customers-should-understand-about-your-brand',
    'how-to-write-clear-ecommerce-value-proposition',
  ],
  systemFit: {
    headline: 'One capability.',
    headlineAccent: 'A stronger whole.',
    copy:
      'Brand & Positioning becomes most powerful when it connects with the other parts of the business — from creative and discovery to digital systems, commerce and retention — turning clarity into consistent, compounding growth.',
    relations: {
      'digital-systems': 'Shows whether the positioning is reflected in how customers behave.',
      'creative-ugc': 'Gives creative a message worth expressing.',
      'discovery-traffic': 'Tells the right audience why to look closer.',
      'commerce-experience': 'Makes the offer easier to choose.',
      'retention-growth': 'Gives customers a reason to stay.',
    },
  },
  cta: {
    eyebrow: 'Ready to build your brand for growth',
    headline: 'Let’s explore what’s possible.',
    copy:
      'Start with a focused Growth Review and get a clearer view of how Brand & Positioning can contribute to your next stage of growth.',
    secondaryLabel: 'Discuss Brand & Positioning',
  },
  faq: [
    {
      question: 'What does ecommerce brand positioning include?',
      answer:
        'Depending on the engagement, work may include audience and market understanding, positioning, differentiation, value proposition, messaging, product or offer narrative, identity direction and guidance for applying the brand across customer touchpoints.',
    },
    {
      question: 'Is Brand & Positioning only for new businesses?',
      answer:
        'No. It can establish a new brand or help an established business clarify an offer, enter a new stage, resolve inconsistent messaging or create a stronger foundation before redesigning its storefront or marketing.',
    },
    {
      question: 'Can Hbee work with an existing brand identity?',
      answer:
        'Yes. The starting point is what already exists. We can retain useful brand elements while improving the positioning, messaging or application around them, with the exact scope agreed for the engagement.',
    },
  ],
  semantic: BRAND_POSITIONING_SEMANTIC,
}

export const DIGITAL_SYSTEMS: CapabilityDetail = {
  slug: 'digital-systems',
  seo: {
    title: 'Ecommerce Analytics, Tracking & Systems',
    description:
      'Ecommerce analytics, tracking and digital systems for Shopify brands: reliable measurement, connected tools and diagnostics that show what limits growth.',
  },
  systemModule: 'Technology',
  hero: {
    headline: 'Better systems.',
    headlineAccent: 'Stronger foundations.',
    summary:
      'We connect Shopify stores and ecommerce systems to the analytics, tracking, integrations and automation needed to measure performance and diagnose growth constraints.',
    visualLabel:
      'Digital Systems & Analytics, the Technology module, highlighted as the active module of the Hbee system, connected to Experience, Growth and Discovery, with Brand and Creative further back.',
    longHeadline: true,
  },
  opportunity: {
    headline: 'Growth decisions are only as good as the data and systems behind them.',
    copy:
      'When tracking is incomplete, tools are disconnected and reporting is manual, every growth initiative starts with an argument about the numbers. Reliable measurement and connected systems turn that argument into a decision, and make it clear which part of the business to improve first.',
    bestFor:
      'Shopify and ecommerce brands whose analytics disagree, whose tools are disconnected, or whose growth problem is visible but whose cause is not yet clear.',
    outcomes: [
      { name: 'Trust in the numbers', text: 'Tracking and reporting that agree with real orders, so decisions rest on evidence.' },
      { name: 'Connected systems', text: 'Store, marketing and retention tools that share the data each of them depends on.' },
      { name: 'Less manual work', text: 'Automation and reporting that run reliably and fail visibly when something breaks.' },
    ],
  },
  approach: {
    headline: 'From audit',
    headlineAccent: 'to measurement you can act on.',
    copy:
      'We work across the Shopify ecosystem, analytics and tracking, email and retention platform connections such as Klaviyo, reporting views and automation workflows that reduce manual work. Storefront design and conversion changes stay with Website & Conversion.',
    steps: [
      { name: 'Audit', text: 'Map the current tracking, integrations, automations and reporting, and test them against real orders.' },
      { name: 'Define', text: 'Decide what the business needs to measure and which questions its growth decisions depend on.' },
      { name: 'Build and connect', text: 'Implement the tracking, integrations and automations that close the gaps you approve.' },
      { name: 'Verify', text: 'Check that events, reports and workflows match what actually happens, and that failures are visible.' },
    ],
  },
  work: {
    headline: 'Analytics and systems work applied to real businesses.',
    empty: 'Real capability examples will appear here as related case studies are published.',
  },
  insightSlugs: [],
  systemFit: {
    headline: 'Reliable data.',
    headlineAccent: 'A clearer whole.',
    copy:
      'Digital Systems & Analytics makes every other capability measurable. It shows where the storefront loses shoppers, which channels bring qualified visitors and whether customers come back, and it connects the tools that act on those answers.',
    relations: {
      'brand-positioning': 'Shows whether positioning changes are reflected in how customers behave.',
      'creative-ugc': 'Shows which creative and content actually moves shoppers forward.',
      'discovery-traffic': 'Shows which channels bring qualified visitors and what they do next.',
      'commerce-experience': 'Measures where the storefront journey loses shoppers.',
      'retention-growth': 'Connects customer data and automation so repeat purchasing can be measured and acted on.',
    },
  },
  cta: {
    eyebrow: 'Ready to see what the data is telling you',
    headline: 'Let’s make growth measurable.',
    copy:
      'Start with a focused Growth Review and get a clearer view of whether measurement, traffic, conversion or retention should come first.',
    secondaryLabel: 'Discuss Your Analytics and Systems',
  },
  faq: [
    {
      question: 'Does Hbee set up ecommerce tracking and analytics?',
      answer:
        'Yes. Digital Systems & Analytics includes auditing and setting up tracking, funnel measurement and reporting for Shopify stores. The exact work depends on the tools in use and what the business needs to decide.',
    },
    {
      question: 'Can Hbee connect the tools my store already uses?',
      answer:
        'Often, yes. We first assess which tools hold which data and where manual work or failures occur, then connect what is worth connecting. That decision follows the audit rather than being assumed in advance.',
    },
    {
      question: 'Is this the same as redesigning my storefront?',
      answer:
        'No. Storefront design, redesign and conversion work sit with Website & Conversion. Digital Systems & Analytics covers the measurement, integrations and automation behind the store.',
    },
  ],
  semantic: DIGITAL_SYSTEMS_SEMANTIC,
}

export const CREATIVE_UGC: CapabilityDetail = {
  slug: 'creative-ugc',
  seo: {
    title: 'Ecommerce UGC & Creative Strategy',
    description:
      'Ecommerce UGC and creative for Shopify brands: product demonstrations, hooks, creator-led content and ad creative that help shoppers understand and act.',
  },
  systemModule: 'Creative',
  hero: {
    headline: 'Creative that earns attention.',
    headlineAccent: 'Content that builds belief.',
    summary:
      'We plan and produce UGC videos, product demonstrations and ecommerce creative that make products easier to understand — with concepts, hooks and adaptable assets for storefronts, social content and paid campaigns.',
    visualLabel:
      'Creative & UGC, the Creative module, highlighted as the active module of the Hbee system, connected to Discovery, Experience and Brand, with Technology and Growth further back.',
    longHeadline: true,
  },
  opportunity: {
    headline: 'Attention is only useful when it moves people closer.',
    copy:
      'When products are difficult to understand visually, demonstrations are missing or the same few assets carry every campaign, creative fatigue sets in quickly. More content is not the answer unless each asset makes the offer clearer and gives the audience a reason to keep moving.',
    bestFor:
      'Ecommerce brands that need clearer product demonstrations, creator-led communication or a more useful supply of storefront, social and advertising creative.',
    outcomes: [
      { name: 'Attention', text: 'Creative built to stop the right people and earn the next few seconds.' },
      {
        name: 'Belief',
        text: 'Clear product storytelling, proof and demonstration that help customers understand why the offer matters.',
      },
      {
        name: 'Action',
        text: 'Creative designed around the next step — whether that is learning more, visiting the store or moving toward purchase.',
      },
    ],
  },
  approach: {
    headline: 'From message',
    headlineAccent: 'to creative that moves.',
    copy:
      'We combine strategy, product understanding and production to create creative that communicates clearly and can be adapted across the places customers discover, evaluate and buy.',
    steps: [
      { name: 'Frame', text: 'Clarify the product, audience, message, proof points and creative objective.' },
      { name: 'Script', text: 'Develop hooks, concepts, story structure, demonstrations and calls to action.' },
      { name: 'Produce', text: 'Create UGC, product-led assets and campaign-ready creative around the approved direction.' },
      { name: 'Adapt', text: 'Build variations for channels, formats, audiences and ongoing creative learning.' },
    ],
  },
  work: {
    headline: 'Creative applied to real businesses.',
    empty: 'Real capability examples will appear here as related case studies are published.',
  },
  insightSlugs: ['types-of-ugc-ecommerce-brand-needs'],
  systemFit: {
    headline: 'Strong creative.',
    headlineAccent: 'A stronger whole.',
    copy:
      'Creative & UGC becomes more effective when it connects with the rest of the growth system — supported by clear positioning, reliable technology, the right discovery channels, a strong buying experience and systems that keep customer value growing.',
    relations: {
      'brand-positioning': 'Gives creative a clear message and point of view.',
      'digital-systems': 'Shows which creative and formats are producing results.',
      'discovery-traffic': 'Places creative in front of the audiences most likely to respond.',
      'commerce-experience': 'Turns creative interest into a clear path toward purchase.',
      'retention-growth': 'Extends creative into repeat engagement and customer value.',
    },
  },
  cta: {
    eyebrow: 'Ready to create with more purpose',
    headline: 'Let’s create what your growth needs.',
    copy:
      'Start with a focused Growth Review and get a clearer view of how Creative & UGC can support the next stage of your growth.',
    secondaryLabel: 'Discuss Creative & UGC',
  },
  faq: [
    {
      question: 'What types of UGC and product videos can Hbee produce?',
      answer:
        'Depending on the engagement, work may include UGC concepts, creator-led videos, product demonstrations, product showcases, campaign creative, hooks and format variations. The mix is shaped around the product, audience and intended channel.',
    },
    {
      question: 'Can the creative be used for ads and storefronts?',
      answer:
        'It can be planned for paid social, organic social, product pages or broader campaign use. Usage, formats and variations are agreed before production so the work is created for the places it needs to perform.',
    },
    {
      question: 'Does the brand need to provide products?',
      answer:
        'Physical product requirements depend on the concept and production plan. Product access, shipping, creator requirements and usage needs are confirmed as part of scoping before production begins.',
    },
  ],
  semantic: CREATIVE_UGC_SEMANTIC,
}

export const DISCOVERY_TRAFFIC: CapabilityDetail = {
  slug: 'discovery-traffic',
  seo: {
    title: 'Ecommerce Traffic & Search Visibility',
    description:
      'Ecommerce traffic and search visibility for Shopify brands: organic discovery, traffic quality and landing-page alignment that bring relevant buyers.',
  },
  systemModule: 'Discovery',
  hero: {
    headline: 'The right audience.',
    headlineAccent: 'Stronger results.',
    summary:
      'We improve Shopify and ecommerce SEO through technical foundations, search architecture, relevant page content and internal linking — helping the right products, services and ideas become easier to discover over time.',
    visualLabel:
      'Traffic & Visibility, the Discovery module, highlighted as the active module of the Hbee system, connected to Experience, Creative and Brand, with Technology and Growth further back.',
  },
  opportunity: {
    headline: 'Great products don’t grow without visibility.',
    copy:
      'Products and services can be useful and still remain difficult to find when pages are poorly targeted, internal links are weak, technical signals conflict or useful search content is missing. The goal is not traffic for its own sake; it is sustainable organic visibility for commercially relevant searches.',
    bestFor:
      'Ecommerce businesses with weak search visibility, unclear page targeting, indexing or discoverability issues, or too much dependence on paid and outbound traffic.',
    outcomes: [
      {
        name: 'Visibility',
        text: 'Help the business appear in the places the right audience is already searching, scrolling and discovering.',
      },
      {
        name: 'Relevance',
        text: 'Reach people who are more likely to care about the offer, rather than chasing traffic for its own sake.',
      },
      {
        name: 'Sustainable Growth',
        text: 'Build a healthier discovery mix that can be measured, improved and developed over time instead of relying on one source of traffic.',
      },
    ],
  },
  approach: {
    headline: 'From diagnosis',
    headlineAccent: 'to discovery that reaches the right buyers.',
    copy:
      'We connect technical search foundations, commercial intent, useful page content and acquisition pathways so the right products are easier for the right buyers to find, then adjust as search behavior and the business change.',
    steps: [
      {
        name: 'Audit',
        text: 'Review crawlability, indexing, site structure, page targeting, internal links, the current traffic mix and search visibility.',
      },
      {
        name: 'Map',
        text: 'Define priority commercial searches, intent ownership, page architecture, content gaps and which channels fit the business.',
      },
      {
        name: 'Improve',
        text: 'Strengthen technical signals, metadata, page content, product or service discoverability and purposeful internal linking.',
      },
      {
        name: 'Review',
        text: 'Check search visibility and landing-page quality against reliable data, then prioritize the next useful improvement. Tracking setup sits with Digital Systems & Analytics.',
      },
    ],
  },
  work: {
    headline: 'Discovery and traffic applied to real businesses.',
    empty: 'Real capability examples will appear here as related case studies are published.',
  },
  insightSlugs: ['why-shopify-store-not-appearing-google'],
  systemFit: {
    headline: 'More discovery.',
    headlineAccent: 'A stronger whole.',
    copy:
      'Traffic & Visibility becomes most valuable when it connects with the rest of the growth system — supported by clear positioning, strong creative, reliable technology, a confident buying experience and retention systems that make every acquired customer more valuable.',
    /* Owner-supplied relations, condensed to fit the diagram's node lines. */
    relations: {
      'brand-positioning': 'Gives discovery a clear message and a reason for the right audience to pay attention.',
      'digital-systems': 'Shows which sources bring qualified visitors, and whether the tracking can be trusted.',
      'creative-ugc': 'Provides the hooks, stories and assets that earn attention across channels.',
      'commerce-experience': 'Turns traffic into a clearer, more confident path toward purchase.',
      'retention-growth': 'Turns acquired customers into repeat value, so growth relies less on buying the next visit.',
    },
  },
  cta: {
    eyebrow: 'Ready to grow your audience',
    headline: 'Let’s get the right people to you.',
    copy:
      'Start with a focused Growth Review and get a clearer view of where traffic or visibility is constrained, and how discovery should connect with the rest of your growth system.',
    secondaryLabel: 'Discuss Traffic & Visibility',
  },
  faq: [
    {
      question: 'What does ecommerce SEO include?',
      answer:
        'Depending on the engagement, work may include a technical and search audit, search architecture, page targeting, metadata and content improvements, product or service discoverability, internal linking and a prioritized organic visibility plan.',
    },
    {
      question: 'How is Shopify SEO different from paid advertising?',
      answer:
        'SEO improves how a store is understood and discovered through organic search, while paid advertising buys placement for selected audiences and terms. They can support each other, but they use different systems, timelines and measurement.',
    },
    {
      question: 'How long does organic visibility take?',
      answer:
        'There is no responsible universal timeline or ranking guarantee. Progress depends on the site, competition, technical condition, content, authority and how quickly approved improvements are implemented. We define priorities and measure movement over time.',
    },
  ],
  semantic: DISCOVERY_TRAFFIC_SEMANTIC,
}

export const COMMERCE_EXPERIENCE: CapabilityDetail = {
  slug: 'commerce-experience',
  seo: {
    title: 'Shopify Website Design & Conversion',
    description:
      'Shopify website design and conversion optimization for product pages, offers, navigation, mobile UX, trust and checkout, helping qualified visitors buy.',
  },
  systemModule: 'Experience',
  hero: {
    headline: 'From interest to purchase.',
    headlineAccent: 'A better experience at every step.',
    summary:
      'We improve Shopify conversion and ecommerce customer experience across product discovery, product pages, navigation, trust, mobile UX and the path to checkout — helping shoppers move forward with less friction and more confidence.',
    visualLabel:
      'Website & Conversion, the Experience module, highlighted as the active module of the Hbee system, connected to Creative, Brand, Technology, Discovery and Growth.',
    longHeadline: true,
  },
  opportunity: {
    headline: 'A great product deserves a better buying experience.',
    copy:
      'Traffic may already be reaching the store, but product pages that do not persuade, weak trust signals, mobile friction and a confusing purchase journey can leave shoppers without enough reason or confidence to convert.',
    bestFor:
      'Shopify and ecommerce businesses attracting visitors but seeing hesitation, abandonment or weak sales across product pages and the wider buying journey.',
    outcomes: [
      { name: 'Conversion', text: 'Turn interest into action through a clearer, lower-friction buying journey.' },
      { name: 'Confidence', text: 'Give customers the information, reassurance and experience they need to move forward.' },
      {
        name: 'Customer Value',
        text: 'Create an experience that supports repeat purchase, stronger customer relationships and long-term growth.',
      },
    ],
  },
  approach: {
    headline: 'From journey design',
    headlineAccent: 'to real results.',
    copy:
      'We combine customer understanding, experience design and technical implementation to create commerce experiences that are easier to use, built to convert and ready to grow with the business.',
    steps: [
      {
        name: 'Map',
        text: 'Understand the customer, current journey, friction points, questions, decision barriers and growth opportunities.',
      },
      {
        name: 'Design',
        text: 'Define the experience, information hierarchy, content structure, interaction patterns and conversion path.',
      },
      {
        name: 'Build',
        text: 'Implement or improve the commerce experience across the relevant customer journey — from product discovery and product pages to cart, checkout and post-purchase touchpoints.',
      },
      {
        name: 'Optimize',
        text: 'Measure behavior, remove friction, test improvements and continuously increase clarity, confidence, conversion and customer value.',
      },
    ],
  },
  work: {
    headline: 'Commerce experiences applied to real businesses.',
    empty: 'Real capability examples will appear here as related case studies are published.',
  },
  insightSlugs: [
    'ecommerce-conversion-mistakes-costing-sales',
    'how-to-build-product-pages-that-answer-buying-questions',
    'identify-shopify-conversion-friction',
    'shopify-redesign-vs-optimization',
  ],
  systemFit: {
    headline: 'Better experiences.',
    headlineAccent: 'A stronger whole.',
    copy:
      'Website & Conversion becomes more powerful when it connects with the rest of the growth system — supported by clear positioning, reliable technology, strong creative, the right discovery channels and retention systems that extend customer value beyond the first purchase.',
    /* Owner-supplied relations; the first two condensed to fit the diagram's node lines. */
    relations: {
      'brand-positioning': 'Gives the experience clear positioning, product meaning and reasons to choose.',
      'digital-systems': 'Provides the platform, integrations and data a reliable commerce experience needs.',
      'creative-ugc': 'Brings product value, proof and customer understanding into the buying journey.',
      'discovery-traffic': 'Brings the right audience into an experience designed to help them move forward.',
      'retention-growth': 'Extends the customer journey beyond the first transaction into repeat value.',
    },
  },
  cta: {
    eyebrow: 'Ready to improve your commerce experience',
    headline: 'Let’s turn more interest into customers.',
    copy:
      'Start with a focused Growth Review and get a clearer view of where your commerce experience is creating friction — and what deserves attention first.',
    secondaryLabel: 'Discuss Conversion Optimization',
  },
  faq: [
    {
      question: 'What is Shopify conversion optimization?',
      answer:
        'It is the structured work of understanding and reducing friction in the shopping journey. Depending on the engagement, that may include product pages, navigation, mobile usability, trust, content hierarchy, cart behavior and the path to checkout.',
    },
    {
      question: 'Do I need more traffic or a better conversion experience?',
      answer:
        'That depends on what the data and journey show. If qualified visitors already arrive but hesitate or leave, the experience may deserve attention before more traffic is added. The Growth Review helps identify which constraint should be addressed first.',
    },
    {
      question: 'What areas of the store are reviewed?',
      answer:
        'A review can cover entry pages, navigation, collection and product discovery, product pages, mobile interactions, trust and reassurance, cart behavior and the route into checkout. Scope is agreed around the actual business problem.',
    },
  ],
  semantic: WEBSITE_CONVERSION_SEMANTIC,
}

export const RETENTION_GROWTH: CapabilityDetail = {
  slug: 'retention-growth',
  seo: {
    title: 'Ecommerce Retention & Lifecycle Marketing',
    description:
      'Ecommerce retention and lifecycle marketing for Shopify brands: welcome, cart follow-up, post-purchase and win-back journeys that support repeat customer value.',
  },
  systemModule: 'Growth',
  hero: {
    headline: 'More customers.',
    headlineAccent: 'Greater value over time.',
    summary:
      'We build and improve Shopify email marketing and Klaviyo lifecycle systems — including welcome, abandonment, post-purchase, winback, segmentation and campaign planning — to support stronger customer relationships and repeat value.',
    visualLabel:
      'Retention & Customer Value, the Growth module, highlighted as the active module of the Hbee system, connected to Experience, Technology and Creative, with Brand and Discovery further back.',
  },
  opportunity: {
    headline: 'Growth is stronger when customers stay.',
    copy:
      'When customers purchase once and disappear, welcome journeys are absent, carts go unrecovered and post-purchase communication stops at the receipt, the business keeps paying to restart the relationship. Connected lifecycle communication creates a more reliable path back.',
    bestFor:
      'Shopify businesses with weak repeat purchase, disconnected email activity or a Klaviyo account that needs clearer flows, segmentation and lifecycle direction.',
    outcomes: [
      { name: 'Retention', text: 'Stay useful to the customers the business has already worked to acquire.' },
      {
        name: 'Customer value',
        text: 'Support more value from each customer over time through relevant, well-timed communication and repeat engagement.',
      },
      {
        name: 'Less reacquisition',
        text: 'Reduce reliance on winning a brand-new customer for every sale by building value after acquisition.',
      },
    ],
  },
  approach: {
    headline: 'From lifecycle review',
    headlineAccent: 'to reasons to return.',
    copy:
      'We review what customers receive at each stage, then plan and build the lifecycle communication in Shopify and Klaviyo that keeps the brand useful and gives customers timely reasons to come back.',
    steps: [
      {
        name: 'Analyze',
        text: 'Review lifecycle touchpoints, segments, repeat-purchase behavior and the existing Klaviyo setup, and find where customer value is being lost.',
      },
      {
        name: 'Strategy',
        text: 'Define retention priorities, customer segments, lifecycle journeys and content direction.',
      },
      {
        name: 'Implement',
        text: 'Build or improve the flows, segments and campaigns you approve, across the stages where customers need them.',
      },
      {
        name: 'Review',
        text: 'Check how journeys perform against reliable data, then refine flows, segments and content. Tracking and integration reliability sit with Digital Systems & Analytics.',
      },
    ],
  },
  work: {
    headline: 'Retention and growth applied to real businesses.',
    empty: 'Real capability examples will appear here as related case studies are published.',
  },
  insightSlugs: ['klaviyo-flows-shopify-store-needs-first'],
  systemFit: {
    headline: 'Stronger customers.',
    headlineAccent: 'A stronger whole.',
    copy:
      'Retention & Customer Value becomes more valuable when it connects with the rest of the growth system — supported by clear positioning, reliable technology, relevant creative, effective discovery and a commerce experience that gives customers reasons to return.',
    /* Owner-supplied relations, condensed (meaning unchanged) to fit the diagram's node lines. */
    relations: {
      'brand-positioning': 'Gives customers a clear reason to stay connected and keep choosing the brand.',
      'digital-systems': 'Keeps the tracking and integrations behind lifecycle flows reliable.',
      'creative-ugc': 'Brings relevant stories, offers and communication beyond the first purchase.',
      'discovery-traffic': 'Brings in qualified new customers, so retention can grow the value of acquisition.',
      'commerce-experience': 'Creates the buying and post-purchase experience that gives customers reasons to return.',
    },
  },
  cta: {
    eyebrow: 'Ready to grow longer together',
    headline: 'Let’s build a more valuable customer base.',
    copy:
      'Start with a focused Growth Review and get a clearer view of how retention and lifecycle communication can build more value from the customers you already have.',
    secondaryLabel: 'Discuss Retention & Customer Value',
  },
  faq: [
    {
      question: 'What Klaviyo flows should a Shopify store have?',
      answer:
        'Common starting points include welcome, browse or cart abandonment, post-purchase and winback journeys. The right sequence, triggers and messages depend on the store, customer behavior, consent setup and buying cycle.',
    },
    {
      question: 'Can Hbee improve an existing Klaviyo account?',
      answer:
        'Yes. Work can begin with the existing integration, lists, segments, flows, campaigns and performance signals, then prioritize the gaps that matter most. Existing systems are not replaced by default.',
    },
    {
      question: 'Is retention only email marketing?',
      answer:
        'No. Email and Klaviyo can be important delivery systems, but retention also depends on the product, customer experience, post-purchase journey, segmentation, offers, service and reasons customers have to return.',
    },
  ],
  semantic: RETENTION_GROWTH_SEMANTIC,
}

/** Capabilities that have a detail page — the complete six-capability set (Phase 10). */
export const CAPABILITY_DETAILS: Record<string, CapabilityDetail> = {
  [BRAND_POSITIONING.slug]: BRAND_POSITIONING,
  [DIGITAL_SYSTEMS.slug]: DIGITAL_SYSTEMS,
  [CREATIVE_UGC.slug]: CREATIVE_UGC,
  [DISCOVERY_TRAFFIC.slug]: DISCOVERY_TRAFFIC,
  [COMMERCE_EXPERIENCE.slug]: COMMERCE_EXPERIENCE,
  [RETENTION_GROWTH.slug]: RETENTION_GROWTH,
}

/** Name, group and icon from the Services capability system. */
export function capabilityIdentity(slug: string): { capability: ServiceCapability; group: ServiceGroup } | null {
  for (const group of SERVICE_GROUPS) {
    const capability = group.capabilities.find((c) => c.slug === slug)
    if (capability) return { capability, group }
  }
  return null
}

/** The other five capabilities, in system order, with their group. */
export function relatedCapabilities(slug: string) {
  return SERVICE_GROUPS.flatMap((group) =>
    group.capabilities.filter((c) => c.slug !== slug).map((capability) => ({ capability, group })),
  )
}
