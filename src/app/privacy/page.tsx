import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy | Hbee Digitals',
  description: 'Privacy Policy for Hbee Digitals.',
}

const sections = [
  {
    title: 'Information We Collect',
    body: 'We may collect your name, email address, phone number, company name, project details, and any information you submit through our contact forms or communication channels.',
  },
  {
    title: 'How We Use Your Information',
    body: 'We use your information to respond to enquiries, provide services, improve our website, manage client communication, send updates, and maintain business records.',
  },
  {
    title: 'Newsletter & Communication',
    body: 'If you subscribe to our newsletter, we may send you helpful updates, insights, and service-related content. You may unsubscribe at any time.',
  },
  {
    title: 'Cookies & Analytics',
    body: 'We may use cookies and analytics tools to understand website performance, improve user experience, and measure traffic behavior.',
  },
  {
    title: 'Data Protection',
    body: 'We take reasonable steps to protect your information from unauthorized access, loss, misuse, or disclosure.',
  },
  {
    title: 'Third-Party Services',
    body: 'We may use trusted third-party platforms such as Supabase, Vercel, Resend, analytics tools, and payment or communication providers to operate our services.',
  },
  {
    title: 'Your Rights',
    body: 'You may request access, correction, or deletion of your personal information by contacting us directly.',
  },
]

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#060E1C] px-5 pb-20 pt-32 text-white sm:px-6 md:px-10 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10">
            <p className="mb-4 inline-flex rounded-full border border-[#39D97A]/20 bg-white/[0.04] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#39D97A]">
              Legal
            </p>
            <h1 className="text-5xl font-black tracking-[-0.04em]">Privacy Policy</h1>
            <p className="mt-5 max-w-2xl text-white/60">
              This policy explains how Hbee Digitals collects, uses, and protects information shared with us.
            </p>
          </div>

          <div className="space-y-5">
            {sections.map((section) => (
              <section key={section.title} className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-6">
                <h2 className="text-2xl font-black">{section.title}</h2>
                <p className="mt-3 leading-7 text-white/62">{section.body}</p>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-[1.5rem] border border-[#39D97A]/20 bg-[#39D97A]/10 p-6">
            <h2 className="text-xl font-black">Contact Us</h2>
            <p className="mt-3 text-white/62">
              For privacy questions, contact us through our contact page.
            </p>
            <Link href="/contact" className="mt-5 inline-flex rounded-full bg-[#39D97A] px-6 py-3 text-sm font-black text-[#06101F]">
              Contact Hbee Digitals
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}