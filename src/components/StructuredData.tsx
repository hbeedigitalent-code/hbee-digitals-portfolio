export default function StructuredData() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Hbee Digitals",
    url: "https://hbeedigitals.com",
    logo: "https://hbeedigitals.com/favicon.svg",
    email: "contact@hbeedigitals.com",
    description:
      "Premium websites, Shopify optimization, brand systems, and conversion-focused digital experiences for ambitious businesses.",
    sameAs: [
      "https://facebook.com",
      "https://instagram.com",
      "https://linkedin.com",
      "https://twitter.com"
    ],
  }

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Hbee Digitals",
    url: "https://hbeedigitals.com",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://hbeedigitals.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  }

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Hbee Digitals",
    url: "https://hbeedigitals.com",
    areaServed: "Worldwide",
    serviceType: [
      "Website Design",
      "Shopify Optimization",
      "Ecommerce Solutions",
      "Brand Experience",
      "Technical Consulting"
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(serviceSchema),
        }}
      />
    </>
  )
}