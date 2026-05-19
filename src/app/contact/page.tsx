import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ContactSection from '@/components/sections/ContactSection'

export const metadata = {
  title: 'Contact Hbee Digitals | Start Your Growth System',
  description:
    'Start a project with Hbee Digitals. Website design, Shopify optimization, brand experience, and digital growth systems.',
}

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main>
        <ContactSection />
      </main>
      <Footer />
    </>
  )
}