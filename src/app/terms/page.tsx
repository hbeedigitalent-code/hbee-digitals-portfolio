import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service | Hbee Digitals',
  description: 'Terms of Service for Hbee Digitals.',
}

const sections = [
  {
    title: 'Acceptance of Terms',
    body: 'By using our website or requesting our services, you agree to these terms and any project-specific agreement provided by Hbee Digitals.',
  },
  {
    title: 'Services',
    body: 'We provide digital services including website design, Shopify optimization, branding, digital systems, support, consulting, and related services.',
  },
  {
    title: 'Project Scope',
    body: 'Each project will follow the agreed scope, deliverables, timeline, and pricing discussed before work begins. Additional requests may require a revised quote.',
  },
  {
    title: 'Payments',
    body: 'Payments must be made according to the agreed invoice or payment schedule. Work may be paused if payment is delayed.',
  },
  {
    title: 'Client Responsibilities',
    body: 'Clients are responsible for providing accurate information, required access, brand materials, content, feedback, and approvals needed to complete the project.',
  },
  {
    title: 'Revisions',
    body: 'Revisions are handled based on the agreed project scope. Extra revisions or major direction changes may attract additional fees.',
  },
  {
    title: 'Limitation of Liability',
    body: 'Hbee Digitals is not liable for indirect losses, third-party platform issues, hosting outages, payment provider issues, or business losses outside our direct control.',
  },
  {
    title: 'Changes to Terms',
    body: 'We may update these terms when necessary. Continued use of our website or services means you accept the updated terms.',
  },
]

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#060E1C] px-5 pb-20 pt-32 text-white sm:px-6 md:px-10 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10">
            <p className="mb-4 inline-flex rounded-full border border-[#39D97A]/20 bg-white/[0.04] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#39D97A]">
              Legal
            </p>
            <h1 className="text-5xl font-black tracking-[-0.04em]">Terms of Service</h1>
            <p className="mt-5 max-w-2xl text-white/60">
              These terms explain how our services, projects, payments, and responsibilities are handled.
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
            <h2 className="text-xl font-black">Need clarification?</h2>
            <p className="mt-3 text-white/62">
              Contact us before starting a project if you need any part of these terms explained.
            </p>
            <Link href="/contact" className="mt-5 inline-flex rounded-full bg-[#39D97A] px-6 py-3 text-sm font-black text-[#06101F]">
              Contact Us
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}