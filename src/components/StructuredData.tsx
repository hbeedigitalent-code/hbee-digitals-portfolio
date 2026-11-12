export default function StructuredData() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://hbeedigitals.com#organization",
    name: "Hbee Digitals",
    url: "https://hbeedigitals.com",
    logo: "https://hbeedigitals.com/favicon.svg",
    email: "contact@hbeedigitals.com",
    description:
      "Hbee Digitals is a digital growth studio for Shopify and ecommerce brands, connecting brand and positioning, website and conversion, digital systems and analytics, creative and UGC, traffic and visibility, and retention and customer value.",
    sameAs: [
      "https://facebook.com/thehbeedigitals",
      "https://instagram.com/thehbeedigitals"
    ],
  }

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Hbee Digitals",
    url: "https://hbeedigitals.com",
    publisher: { "@id": "https://hbeedigitals.com#organization" },
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
    </>
  )
}
