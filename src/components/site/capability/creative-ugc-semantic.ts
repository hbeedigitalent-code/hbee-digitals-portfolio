import type { CapabilitySemantic } from './capability-semantic'

/**
 * Creative & UGC (route: /services/creative-ugc; Hbee module: Creative).
 * Semantic capability content for the shared capability template. DRAFT copy —
 * needs owner sign-off. No statistics, prices, timelines or performance claims.
 *
 * Scope follows the existing page: Hbee plans AND produces UGC, product
 * demonstrations and campaign creative. Benefits are framed as what creative can
 * do (demonstrate, explain, answer objections, add format variety), never as
 * guaranteed ad or sales results. Page structure and CRO belong to Website &
 * Conversion; acquisition belongs to Traffic & Visibility; measurement belongs
 * to Digital Systems & Analytics. Those are linked, never claimed here.
 *
 * Insight links use slugs already approved as published in
 * scripts/test-capability-seo.cjs, and render only when published.
 */
export const CREATIVE_UGC_SEMANTIC: CapabilitySemantic = {
  h1: { lead: 'Ecommerce UGC &', accent: 'Creative Strategy' },
  serviceType: 'Ecommerce UGC and creative strategy',
  definition:
    'Creative & UGC is the work of planning and producing product-focused creative that helps shoppers understand, trust and act on what an ecommerce brand sells. It covers UGC and creator-led content, product demonstrations, hooks and concepts, ad creative, and the creative support that product pages and landing pages need. It is especially relevant when ads look polished but do not explain the product, creative wears out quickly, or shoppers still have unanswered questions about what they are buying.',

  symptoms: {
    eyebrow: 'What it looks like when it is broken',
    headline: 'Signs that the creative, not the product, is the constraint.',
    items: [
      { name: 'Ads look polished but do not explain the product', text: 'The creative is attractive, yet a viewer still cannot say what the product does or why it is worth buying.' },
      { name: 'Creative becomes repetitive quickly', text: 'A small set of assets carries every campaign, and the same people see the same thing again and again.' },
      { name: 'There is product footage but no strong hook', text: 'The material exists, but nothing in the first seconds gives a viewer a reason to keep watching.' },
      { name: 'Creator videos feel generic or scripted', text: 'Content reads like an advertisement in disguise, not a real person showing a real product.' },
      { name: 'Shoppers still have unanswered product questions', text: 'Size, use, results and common doubts are not addressed in the creative they see.' },
      { name: 'Benefits are described but not demonstrated', text: 'Claims appear as text on screen instead of being shown in use.' },
      { name: 'UGC exists but is disconnected from the pages', text: 'Creator content is not used on landing pages or product pages, or does not match the message that brought the visitor.' },
      { name: 'One creative serves every funnel stage', text: 'The same asset is shown to cold audiences and to shoppers who are ready to buy.' },
    ],
  },

  diagnose: {
    eyebrow: 'What we diagnose',
    headline: 'What a creative review examines before any concepts are recommended.',
    intro:
      'Hbee reviews the creative the way a shopper meets it, then decides what is missing. Each area below is judged against the question a buyer has at that moment. Measuring results is handled through Digital Systems & Analytics.',
    items: [
      { name: 'Product understanding', text: 'Whether someone who has never seen the product can tell what it is, who it is for and what it does.' },
      { name: 'Buyer objections', text: 'Which doubts stop a purchase, and whether the creative answers them.' },
      { name: 'Creative angles', text: 'Which reasons to buy are being used, and which strong ones are missing.' },
      { name: 'Hooks', text: 'Whether the opening seconds give the right viewer a reason to keep watching.' },
      { name: 'Demonstration opportunities', text: 'Where the product can be shown in use instead of described.' },
      { name: 'Social proof', text: 'What real customer evidence exists and how it is presented.' },
      { name: 'Creative-to-page match', text: 'Whether the message in the creative continues on the landing page or product page it leads to.' },
      { name: 'Funnel stage, format and repetition', text: 'Whether each asset suits its stage and channel, and whether the same few assets are being reused.' },
    ],
  },

  serviceArea: {
    id: 'ugc-for-ecommerce',
    title: 'UGC for ecommerce: creator-style product content that shows the product in use',
    answer:
      'In ecommerce, UGC can mean genuine content created by customers, while brands also commission creators to produce UGC-style product content built around demonstration, experience and buyer questions. Creator-made UGC-style content does not require the creator to publish it to their own audience; that distribution model belongs to influencer marketing. Either way, ecommerce UGC is planned around a product question, an objection or a demonstration, which is what separates it from a generic testimonial.',
    topics: [
      { name: 'Creator-led product storytelling', text: 'A real person introduces the product, shows it in use and explains what it solves, in their own voice.' },
      { name: 'Product demonstrations', text: 'Showing how the product works, fits or is used, so benefits are seen and not only stated.' },
      { name: 'Hooks and buyer objections', text: 'Opening with the moment that matters to a viewer and answering the doubt that would otherwise stop a purchase.' },
      { name: 'Social proof', text: 'Using real customer voices and visible use to support the claims the brand makes.' },
      { name: 'UGC for ads', text: 'Formats and variations for paid and organic social, planned together with Traffic & Visibility.' },
      { name: 'UGC for product and landing pages', text: 'Clips and stills that answer buying questions where the shopper makes the decision.' },
    ],
    connection: {
      text: 'How UGC is placed and structured on a product page or landing page belongs to',
      link: { label: 'Website & Conversion', href: '/services/commerce-experience' },
    },
    links: [{ label: 'Types of UGC an ecommerce brand needs', href: '/insights/types-of-ugc-ecommerce-brand-needs' }],
  },

  moreServiceAreas: [
    {
      id: 'creative-strategy-for-ecommerce',
      title: 'Creative strategy: the thinking behind the asset',
      answer:
        'Creative strategy is the planning that decides what a piece of creative should say, show and test before anything is produced. It turns product understanding and buyer objections into concepts, hooks and briefs, and plans the variations that let a brand learn which angles work. Hbee plans and directs this work and also produces the resulting UGC, product demonstrations and campaign creative, so the strategy and the asset stay connected.',
      topics: [
        { name: 'Concepts and angles', text: 'The reasons to buy, and the different ways of showing each one.' },
        { name: 'Hooks', text: 'The opening seconds, designed for a specific viewer at a specific stage.' },
        { name: 'Scripts and briefs', text: 'Direction for creators and editors that keeps the product story clear without making it sound scripted.' },
        { name: 'Demonstrations and objections', text: 'Which moments to show and which doubts to answer.' },
        { name: 'Format and variation planning', text: 'Which formats suit which channel and stage, and how one idea becomes several assets.' },
        { name: 'Creative testing hypotheses', text: 'Planning which message or variation should be tested, and what each one is meant to show.' },
      ],
      connection: {
        text: 'Creative can make an offer visible and understandable, but the offer itself, its structure and how its value is communicated sit in Product & Offer, inside',
        link: { label: 'Website & Conversion', href: '/services/commerce-experience#product-and-offer' },
      },
      links: [{ label: 'Explore Traffic & Visibility for where creative is placed', href: '/services/discovery-traffic' }],
    },
  ],

  questions: {
    headline: 'Questions merchants ask about ecommerce UGC and creative.',
    intro: 'Direct answers first, then the reasoning. Each answer stands on its own.',
    items: [
      {
        intent: 'Definition',
        question: 'What is UGC for ecommerce?',
        answer:
          'In ecommerce, UGC can mean genuine content created by customers about a product or brand, such as photos, videos and reviews. Brands also commission creators to make UGC-style product content: a person showing, using and explaining the product in a native, human style, built around demonstration and buyer questions. Either kind can appear in ads, on product pages and in organic social content.',
      },
      {
        intent: 'Definition',
        question: 'What is creator-led commerce creative?',
        answer:
          'Creator-led commerce creative is content built around a person demonstrating, using or talking about a product so that a shopper can understand it and decide. It is usually commissioned UGC-style content rather than something a customer made unprompted. The creator carries the product story through demonstration and personal experience instead of a polished brand voice, and does not need to be a famous or paid influencer.',
      },
      {
        intent: 'Comparison',
        question: 'What is the difference between UGC and influencer marketing?',
        answer:
          'UGC is a type of content: either genuinely created by customers, or commissioned from creators in a native, demonstration-led style. Influencer marketing is a distribution approach: promotion through a creator’s existing audience. They overlap when an influencer’s own content is also used as UGC-style creative, but commissioned UGC-style content can run in a brand’s own ads and pages without the creator publishing it to their audience. The focus of this capability is the content and the creative strategy behind it, not audience promotion.',
      },
      {
        intent: 'Comparison',
        question: 'UGC vs polished brand creative: when should each be used?',
        answer:
          'Use UGC when the job is to show a product in use, answer a question or make a claim feel believable. Use polished brand creative when the job is to establish a look, a premium feel or a consistent identity. Many brands need both, assigned to different stages and placements. The choice depends on the product, the audience and the question the creative has to answer, not on one format being better than the other.',
        links: [{ label: 'Explore Brand & Positioning for the look and message', href: '/services/brand-positioning' }],
      },
      {
        intent: 'Problem',
        question: 'Why do ecommerce ads lose performance over time?',
        answer:
          'Common reasons include audience fatigue from seeing the same creative repeatedly, a message that no longer matches the audience’s questions, a hook or format that has become familiar, and changes in the audience or in competing ads. Results can also fall for reasons outside the creative, such as tracking changes or traffic quality, so it is worth checking the measurement before concluding the creative is the cause. A steady supply of distinct angles and hooks reduces repetition.',
        links: [{ label: 'Explore Digital Systems & Analytics for measurement', href: '/services/digital-systems' }],
      },
      {
        intent: 'Diagnostic',
        question: 'Why does product creative get views but not clicks or sales?',
        answer:
          'Views without clicks or sales often mean the creative earns attention but does not explain the product, answer an objection or give a clear next step. Other causes include a mismatch between the creative and the page it leads to, a weak presentation of the offer, or an audience that does not fit the product. A review compares what the creative promises with what the viewer needs to know and with what the landing page or product page then shows.',
        links: [
          { label: 'Explore Website & Conversion for page and offer presentation', href: '/services/commerce-experience' },
          { label: 'Explore Traffic & Visibility for audience and placement', href: '/services/discovery-traffic' },
        ],
      },
      {
        intent: 'Evaluation',
        question: 'What makes a good UGC ad?',
        answer:
          'A good UGC ad opens with a hook that matters to a specific viewer, shows the product in use, answers a real buyer question or objection, and ends with a clear next step. It feels like a real person speaking about a real product rather than a script read aloud, and it fits the format and placement where it runs. Whether it works for a particular brand is learned by testing, not assumed.',
      },
      {
        intent: 'Evaluation',
        question: 'When should a Shopify brand use UGC on product pages?',
        answer:
          'A Shopify brand should consider UGC on product pages when shoppers need to see the product in use, when questions about size, fit, use or results come up repeatedly, or when written descriptions and static images do not make the product clear. Demonstration clips and customer-style content can support the page without replacing clear product information. Where that content sits and how the page is structured is a storefront decision.',
        links: [{ label: 'How to build product pages that answer buying questions', href: '/insights/how-to-build-product-pages-that-answer-buying-questions' }],
      },
      {
        intent: 'Commercial',
        question: 'What does an ecommerce UGC and creative engagement include?',
        answer:
          'Expect a review of the product, audience and existing creative, a creative strategy with concepts, hooks and briefs, production of the UGC, product demonstrations or campaign creative you approve, and variations planned for the channels where it will run. Usage, formats, product access and creator requirements are confirmed during scoping. Hbee does not promise specific ad performance or sales results.',
      },
    ],
  },
}
