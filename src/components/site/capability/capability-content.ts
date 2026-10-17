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

/** The module of the six-part Hbee system a capability is drawn as. */
export type SystemModule = 'Brand' | 'Experience' | 'Technology' | 'Creative' | 'Discovery' | 'Growth'

export interface CapabilityDetail {
  slug: string
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
  }
}

export const BRAND_POSITIONING: CapabilityDetail = {
  slug: 'brand-positioning',
  systemModule: 'Brand',
  hero: {
    headline: 'A clearer brand.',
    headlineAccent: 'Stronger growth.',
    summary:
      'We help ambitious businesses clarify who they are, what they stand for and how they should be understood — then turn that into a positioning foundation that shapes every customer experience and growth decision.',
    visualLabel:
      'Brand & Positioning, highlighted as the active module of the Hbee system, connected to Experience, Creative, Technology, Discovery and Growth.',
  },
  opportunity: {
    headline: 'Your brand is more than a logo.',
    copy:
      'A clear brand and positioning foundation helps the right people understand what you do, why it matters and why you’re different — creating stronger demand, clearer decision-making and a more consistent customer experience.',
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
  systemFit: {
    headline: 'One capability.',
    headlineAccent: 'A stronger whole.',
    copy:
      'Brand & Positioning becomes most powerful when it connects with the other parts of the business — from creative and discovery to digital systems, commerce and retention — turning clarity into consistent, compounding growth.',
    relations: {
      'digital-systems': 'Gives the platform a clear story to carry.',
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
  },
}

export const DIGITAL_SYSTEMS: CapabilityDetail = {
  slug: 'digital-systems',
  systemModule: 'Technology',
  hero: {
    headline: 'Better systems.',
    headlineAccent: 'Stronger foundations.',
    summary:
      'We build the technology and operational foundation your business runs on — from platforms and integrations to data, automation and workflows — so everything works together and can support sustainable growth.',
    visualLabel:
      'Digital Systems, highlighted as the active module of the Hbee system, connected to Experience, Creative, Brand, Discovery and Growth.',
  },
  opportunity: {
    headline: 'Growth becomes harder when the systems underneath it can’t keep up.',
    copy:
      'As your business grows, the technology, data and operational systems behind the scenes need to be reliable, integrated and scalable. Without the right systems, you end up with manual work, broken processes and missed opportunities.',
    outcomes: [
      { name: 'Reliability', text: 'Stable systems that reduce errors, downtime and dependence on manual work.' },
      { name: 'Integration', text: 'A connected platform, tools and data so every part of the business can work together.' },
      { name: 'Capacity', text: 'A scalable foundation that can support more traffic, orders, customers and new opportunities.' },
    ],
  },
  approach: {
    headline: 'From audit',
    headlineAccent: 'to systems that scale.',
    copy:
      'We combine technical expertise with practical execution to build, integrate and optimize the systems that support your business today and are ready for tomorrow’s growth.',
    steps: [
      { name: 'Audit', text: 'Understand the current platform, workflows, integrations, data and constraints.' },
      { name: 'Architect', text: 'Define the systems, architecture and connections required to support the business and its growth plans.' },
      { name: 'Build', text: 'Implement or improve the required digital infrastructure, tools, integrations and automations.' },
      { name: 'Connect', text: 'Integrate customer experience, data and operational components so the business works as one system.' },
    ],
  },
  work: {
    headline: 'Digital systems applied to real businesses.',
    empty: 'Real capability examples will appear here as related case studies are published.',
  },
  systemFit: {
    headline: 'Strong systems.',
    headlineAccent: 'A stronger whole.',
    copy:
      'Digital Systems becomes most valuable when the technology underneath the business supports every other growth capability — giving brand, creative, discovery, commerce and retention a reliable system to run on.',
    /* Owner-supplied relations, condensed to fit the diagram's node lines. */
    relations: {
      'brand-positioning': 'Turns positioning into a platform the business can deliver through.',
      'creative-ugc': 'Gives creative the pages and workflows to move customers forward.',
      'discovery-traffic': 'Lands acquired traffic on reliable, measurable experiences.',
      'commerce-experience': 'Powers the customer journey, transaction and operational flow.',
      'retention-growth': 'Connects customer data, automation and repeat-value systems.',
    },
  },
  cta: {
    eyebrow: 'Ready to build stronger systems for growth',
    headline: 'Let’s build what growth needs.',
    copy:
      'Start with a focused Growth Review and get a clearer view of how Digital Systems can strengthen the foundation your next stage of growth depends on.',
  },
}

export const CREATIVE_UGC: CapabilityDetail = {
  slug: 'creative-ugc',
  systemModule: 'Creative',
  hero: {
    headline: 'Creative that earns attention.',
    headlineAccent: 'Content that builds belief.',
    summary:
      'We turn product and brand value into creative communication that helps the right audience notice, understand and believe in the offer — from UGC and product storytelling to campaign-ready creative systems.',
    visualLabel:
      'Creative & UGC, highlighted as the active module of the Hbee system, connected to Experience, Brand, Technology, Discovery and Growth.',
    longHeadline: true,
  },
  opportunity: {
    headline: 'Attention is only useful when it moves people closer.',
    copy:
      'Brands do not just need more content. They need creative that communicates the product clearly, earns attention quickly and gives customers reasons to keep watching, clicking and buying.',
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
  systemFit: {
    headline: 'Strong creative.',
    headlineAccent: 'A stronger whole.',
    copy:
      'Creative & UGC becomes more effective when it connects with the rest of the growth system — supported by clear positioning, reliable technology, the right discovery channels, a strong buying experience and systems that keep customer value growing.',
    relations: {
      'brand-positioning': 'Gives creative a clear message and point of view.',
      'digital-systems': 'Gives creative the pages, tools and workflows needed to move customers forward.',
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
  },
}

export const DISCOVERY_TRAFFIC: CapabilityDetail = {
  slug: 'discovery-traffic',
  systemModule: 'Discovery',
  hero: {
    headline: 'The right audience.',
    headlineAccent: 'Stronger results.',
    summary:
      'We help businesses reach the right audience through a clearer discovery and traffic strategy — combining the appropriate mix of organic, paid, creator and emerging discovery channels so more of the right people can find the brand and move toward action.',
    visualLabel:
      'Discovery & Traffic, highlighted as the active module of the Hbee system, connected to Experience, Creative, Brand, Technology and Growth.',
  },
  opportunity: {
    headline: 'Great products don’t grow without visibility.',
    copy:
      'Even strong products and offers can go unnoticed without the right discovery strategy. The goal is not simply to generate more traffic — it is to help the right audience find the business through the right channels, with the right message and a clear path forward.',
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
    headline: 'From strategy',
    headlineAccent: 'to traffic that converts.',
    copy:
      'We combine audience insight, channel strategy, creative context and measurement to help the right people reach the business — then continuously improve how discovery turns into meaningful engagement and opportunity.',
    steps: [
      {
        name: 'Audit',
        text: 'Review current traffic sources, audience quality, channel performance, measurement and discovery constraints.',
      },
      {
        name: 'Strategy',
        text: 'Define priority audiences, channel mix, messaging context, budget direction and measurement priorities.',
      },
      {
        name: 'Execute',
        text: 'Launch or improve the selected discovery channels, campaigns and distribution activity based on the approved strategy.',
      },
      {
        name: 'Optimize',
        text: 'Measure traffic quality and downstream behavior, learn from results and refine channels, audiences, creative inputs and allocation over time.',
      },
    ],
  },
  work: {
    headline: 'Discovery and traffic applied to real businesses.',
    empty: 'Real capability examples will appear here as related case studies are published.',
  },
  systemFit: {
    headline: 'More discovery.',
    headlineAccent: 'A stronger whole.',
    copy:
      'Discovery & Traffic becomes most valuable when it connects with the rest of the growth system — supported by clear positioning, strong creative, reliable technology, a confident buying experience and retention systems that make every acquired customer more valuable.',
    /* Owner-supplied relations, condensed to fit the diagram's node lines. */
    relations: {
      'brand-positioning': 'Gives discovery a clear message and a reason for the right audience to pay attention.',
      'digital-systems': 'Lands traffic on reliable, measurable experiences with the data to understand performance.',
      'creative-ugc': 'Provides the hooks, stories and assets that earn attention across channels.',
      'commerce-experience': 'Turns traffic into a clearer, more confident path toward purchase.',
      'retention-growth': 'Turns acquired customers into repeat value, so growth relies less on buying the next visit.',
    },
  },
  cta: {
    eyebrow: 'Ready to grow your audience',
    headline: 'Let’s get the right people to you.',
    copy:
      'Start with a focused Growth Review and get a clearer view of which discovery channels deserve attention — and how they should connect with the rest of your growth system.',
  },
}

export const COMMERCE_EXPERIENCE: CapabilityDetail = {
  slug: 'commerce-experience',
  systemModule: 'Experience',
  hero: {
    headline: 'From interest to purchase.',
    headlineAccent: 'A better experience at every step.',
    summary:
      'We design and improve the customer journey so it’s clear, seamless and built to convert — from product discovery and content to checkout, fulfilment and post-purchase experience.',
    visualLabel:
      'Commerce Experience, highlighted as the active module of the Hbee system, connected to Creative, Brand, Technology, Discovery and Growth.',
    longHeadline: true,
  },
  opportunity: {
    headline: 'A great product deserves a better buying experience.',
    copy:
      'People may discover your brand and be interested in what you offer, but if the buying experience is confusing, slow or inconsistent, many will drop off before they become customers.',
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
  systemFit: {
    headline: 'Better experiences.',
    headlineAccent: 'A stronger whole.',
    copy:
      'Commerce Experience becomes more powerful when it connects with the rest of the growth system — supported by clear positioning, reliable technology, strong creative, the right discovery channels and retention systems that extend customer value beyond the first purchase.',
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
  },
}

export const RETENTION_GROWTH: CapabilityDetail = {
  slug: 'retention-growth',
  systemModule: 'Growth',
  hero: {
    headline: 'More customers.',
    headlineAccent: 'Greater value over time.',
    summary:
      'We help businesses keep more customers, increase repeat value and build long-term growth through retention strategy, lifecycle experiences and data-informed engagement.',
    visualLabel:
      'Retention & Growth, highlighted as the active module of the Hbee system, connected to Experience, Creative, Brand, Technology and Discovery.',
  },
  opportunity: {
    headline: 'Growth is stronger when customers stay.',
    copy:
      'Acquiring new customers is important, but long-term growth becomes stronger when businesses also keep customers, increase the value created over time and build relationships that reduce dependence on constantly finding the next buyer.',
    outcomes: [
      { name: 'Retention', text: 'Keep more of the customers the business has already worked to acquire.' },
      {
        name: 'Lifetime Value',
        text: 'Increase the value each customer creates over time through stronger repeat engagement and purchase behavior.',
      },
      {
        name: 'Sustainable Growth',
        text: 'Build more predictable growth by combining new customer acquisition with stronger repeat value and ongoing customer relationships.',
      },
    ],
  },
  approach: {
    headline: 'From customer relationships',
    headlineAccent: 'to lasting growth.',
    copy:
      'We combine customer understanding, lifecycle strategy, creative context and technology to build retention systems that help businesses stay connected, increase repeat value and create more predictable growth.',
    steps: [
      {
        name: 'Analyze',
        text: 'Review current customer behavior, retention patterns, lifecycle touchpoints, segmentation, repeat purchase behavior and growth opportunities.',
      },
      {
        name: 'Strategy',
        text: 'Define retention priorities, customer segments, lifecycle journeys, engagement opportunities, offers, content direction and measurement.',
      },
      {
        name: 'Implement',
        text: 'Build or improve the required retention systems, lifecycle experiences, customer communication, offers and automation across the relevant customer journey.',
      },
      {
        name: 'Optimize',
        text: 'Measure customer behavior and repeat-value performance, learn from results and refine journeys, segments, content, offers and automation over time.',
      },
    ],
  },
  work: {
    headline: 'Retention and growth applied to real businesses.',
    empty: 'Real capability examples will appear here as related case studies are published.',
  },
  systemFit: {
    headline: 'Stronger customers.',
    headlineAccent: 'A stronger whole.',
    copy:
      'Retention & Growth becomes more valuable when it connects with the rest of the growth system — supported by clear positioning, reliable technology, relevant creative, effective discovery and a commerce experience that gives customers reasons to return.',
    /* Owner-supplied relations, condensed (meaning unchanged) to fit the diagram's node lines. */
    relations: {
      'brand-positioning': 'Gives customers a clear reason to stay connected and keep choosing the brand.',
      'digital-systems': 'Provides the customer data, integrations and automation retention depends on.',
      'creative-ugc': 'Brings relevant stories, offers and communication beyond the first purchase.',
      'discovery-traffic': 'Brings in qualified new customers, so retention can grow the value of acquisition.',
      'commerce-experience': 'Creates the buying and post-purchase experience that gives customers reasons to return.',
    },
  },
  cta: {
    eyebrow: 'Ready to grow longer together',
    headline: 'Let’s build a more valuable customer base.',
    copy:
      'Start with a focused Growth Review and get a clearer view of how customer retention, repeat value and lifecycle systems can support more predictable growth.',
  },
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
