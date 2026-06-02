import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

import { supabase } from '@/lib/supabase'

interface PortfolioItem {
  id: string
  slug: string
  title?: string
  client_name?: string
  category?: string
  project_type?: string
  description?: string
  image_url?: string
  metric_label?: string
  metric_value?: string
  industry?: string
  technology?: string
  website_url?: string
  brief?: string
  results_summary?: string
  before_image?: string
  after_image?: string
  gallery_images?: string[]
  result_metrics?: { label: string; value: string }[]
  is_before_after?: boolean
  featured?: boolean
  is_active?: boolean
  // New case study fields
  challenge?: string
  solution?: string
  results?: string
  technologies_used?: string[]
  testimonial?: string
  seo_title?: string
  seo_description?: string
}

async function getProject(slug: string) {
  const { data } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  return data as PortfolioItem | null
}

async function getRelatedProjects(currentId: string, category?: string) {
  let query = supabase
    .from('portfolio_items')
    .select('id, title, client_name, slug, category, image_url, featured_image')
    .eq('is_active', true)
    .neq('id', currentId)
    .limit(3)

  if (category) {
    query = query.eq('category', category)
  }

  const { data } = await query
  return data || []
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const project = await getProject(params.slug)

  if (!project) {
    return { title: 'Case Study Not Found | Hbee Digitals' }
  }

  const title = project.seo_title || `${project.client_name || project.title || 'Case Study'} | Hbee Digitals`

  return {
    title,
    description: project.seo_description || project.description || 'Conversion-focused ecommerce and digital growth case study.',
    openGraph: {
      title,
      description: project.seo_description || project.description,
      images: project.image_url ? [{ url: project.image_url }] : [],
    },
  }
}

export default async function PortfolioDetailPage({ params }: { params: { slug: string } }) {
  const project = await getProject(params.slug)

  if (!project) {
    notFound()
  }

  const title = project.client_name || project.title || 'Portfolio Project'
  const metrics = project.result_metrics || []
  const technologies = project.technologies_used || []
  const gallery = project.gallery_images?.length ? project.gallery_images : project.image_url ? [project.image_url] : []
  const relatedProjects = await getRelatedProjects(project.id, project.category)

  return (
    <>
      <Navbar />

      <main className="relative overflow-hidden bg-[var(--bg-page)] text-[var(--text-primary)]">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[var(--accent)]/8 blur-[140px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-20" />
        </div>

        {/* Hero Section */}
        <section className="relative px-5 pb-16 pt-32 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-5xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/18 bg-[var(--bg-card)]/90 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                <SvgIcon name="portfolio" size={14} color="var(--accent)" />
                Case Study
              </div>

              <p className="mb-5 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                {project.category || project.industry || 'Digital Growth'}
              </p>

              <h1 className="text-5xl font-black leading-[0.94] tracking-[-0.055em] text-[var(--text-primary)] sm:text-6xl lg:text-7xl">
                {title}
              </h1>

              <div className="mt-5 flex flex-wrap gap-3">
                <span className="rounded-full bg-[var(--accent)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--btn-primary-text)]">
                  {project.metric_value || 'Growth'}
                  {project.metric_label ? ` ${project.metric_label}` : ''}
                </span>
                {project.is_before_after && (
                  <span className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--text-primary)]">
                    Before / After Transformation
                  </span>
                )}
              </div>

              <p className="mt-7 max-w-3xl text-base leading-8 text-[var(--text-secondary)] md:text-lg">
                {project.description ||
                  'Conversion-focused ecommerce growth system designed to improve user trust, brand positioning, and long-term scalability.'}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-gradient-orange-green px-6 py-3 text-sm font-black text-white transition hover:scale-[1.02]"
                >
                  Get Free Audit
                  <SvgIcon name="arrow-diagonal" size={15} color="white" />
                </Link>
                {project.website_url && (
                  <a
                    href={project.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-6 py-3 text-sm font-black text-[var(--accent)]"
                  >
                    Visit Website
                    <SvgIcon name="arrow-diagonal" size={15} color="var(--accent)" />
                  </a>
                )}
              </div>
            </div>

            {project.image_url && (
              <div className="mt-14 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-[var(--shadow-lg)]">
                <img src={project.image_url} alt={title} className="w-full rounded-xl object-cover" />
              </div>
            )}
          </div>
        </section>

        {/* Challenge & Solution Section */}
        {(project.challenge || project.solution || project.brief) && (
          <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <div className="grid gap-8 lg:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                      <SvgIcon name="warning" size={18} color="#ef4444" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-wider text-[var(--accent)]">The Challenge</p>
                  </div>
                  <p className="text-base leading-7 text-[var(--text-secondary)]">
                    {project.challenge || project.brief ||
                      'The project focused on improving trust signals, simplifying the customer journey, enhancing the mobile experience, and positioning the brand more professionally online.'}
                  </p>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
                      <SvgIcon name="check-circle" size={18} color="#10b981" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-wider text-[var(--accent)]">The Solution</p>
                  </div>
                  <p className="text-base leading-7 text-[var(--text-secondary)]">
                    {project.solution ||
                      'A comprehensive digital strategy was implemented, focusing on conversion-centered design, improved user experience, and performance optimization.'}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Project Info Sidebar */}
        <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_360px]">
            {/* Results Section */}
            <div>
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">Results & Impact</p>
              <h2 className="text-4xl font-black tracking-[-0.04em] text-[var(--text-primary)]">
                Measurable <GradientHeading>outcomes.</GradientHeading>
              </h2>
              <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <p className="text-base leading-8 text-[var(--text-secondary)]">
                  {project.results || project.results_summary ||
                    'The project successfully improved brand perception, user engagement, conversion rates, and overall digital presence.'}
                </p>
              </div>

              {/* Metrics Grid */}
              {metrics.length > 0 && (
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {metrics.map((metric, index) => (
                    <div key={index} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
                      <p className="text-2xl font-black text-[var(--accent)]">{metric.value}</p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">{metric.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar Info */}
            <aside className="space-y-5">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">Project Details</p>
                <div className="space-y-4">
                  <InfoCard label="Industry" value={project.industry || 'E-Commerce'} />
                  <InfoCard label="Project Type" value={project.project_type || 'Growth System'} />
                  <InfoCard label="Technology" value={project.technology || 'Shopify'} />
                  {project.website_url && <InfoCard label="Website" value={project.website_url} link={project.website_url} />}
                </div>
              </div>

              {/* Technologies Used */}
              {technologies.length > 0 && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                  <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">Technologies Used</p>
                  <div className="flex flex-wrap gap-2">
                    {technologies.map((tech) => (
                      <span key={tech} className="rounded-full border border-[var(--border)] bg-[var(--bg-section)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Testimonial */}
              {project.testimonial && (
                <div className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-6">
                  <SvgIcon name="quote" size={24} color="var(--accent)" className="mb-3" />
                  <p className="text-sm italic text-[var(--text-secondary)]">"{project.testimonial}"</p>
                  <p className="mt-3 text-xs font-bold text-[var(--accent)]">— {title}</p>
                </div>
              )}
            </aside>
          </div>
        </section>

        {/* Before/After Section */}
        {project.is_before_after && project.before_image && project.after_image && (
          <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">Before & After</p>
              <h2 className="text-4xl font-black tracking-[-0.04em] text-[var(--text-primary)]">
                From outdated to <GradientHeading>premium.</GradientHeading>
              </h2>
              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <BeforeAfterCard title="Before" image={project.before_image} />
                <BeforeAfterCard title="After" image={project.after_image} highlight />
              </div>
            </div>
          </section>
        )}

        {/* Gallery Section */}
        {gallery.length > 0 && (
          <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">Gallery</p>
              <h2 className="text-4xl font-black tracking-[-0.04em] text-[var(--text-primary)]">
                Project <GradientHeading>showcase.</GradientHeading>
              </h2>
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {gallery.map((image, index) => (
                  <div key={index} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-2 transition hover:shadow-lg">
                    <img src={image} alt={`${title} showcase ${index + 1}`} className="w-full rounded-xl" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Related Projects */}
        {relatedProjects.length > 0 && (
          <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">Related Work</p>
              <h2 className="text-4xl font-black tracking-[-0.04em] text-[var(--text-primary)]">
                More <GradientHeading>case studies.</GradientHeading>
              </h2>
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {relatedProjects.map((project) => (
                  <Link key={project.id} href={`/portfolio/${project.slug}`} className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] transition hover:-translate-y-1 hover:shadow-lg">
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={project.featured_image || project.image_url || ''}
                        alt={project.client_name || project.title || 'Project'}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-bold text-[var(--accent)]">{project.category || 'Case Study'}</p>
                      <h3 className="mt-1 font-black text-[var(--text-primary)]">{project.client_name || project.title}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Final CTA */}
        <section className="px-5 pb-24 pt-10 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="overflow-hidden rounded-2xl border border-[var(--accent)]/20 bg-gradient-to-r from-[var(--accent)]/5 to-transparent p-8 text-center sm:p-12">
              <p className="text-xs font-black uppercase tracking-wider text-[var(--accent)]">Ready for your transformation?</p>
              <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-black leading-tight text-[var(--text-primary)] sm:text-4xl">
                Let's create a digital experience that works harder for your business.
              </h2>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/contact" className="inline-flex min-h-[50px] items-center justify-center rounded-full bg-gradient-orange-green px-8 py-3 text-sm font-black text-white transition hover:scale-[1.02]">
                  Get Free Consultation
                </Link>
                <Link href="/portfolio" className="inline-flex min-h-[50px] items-center justify-center rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-8 py-3 text-sm font-black text-[var(--accent)] transition hover:bg-[var(--accent)]/15">
                  View More Projects
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}

function InfoCard({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-sm font-bold text-[var(--accent)]">
          {value}
        </a>
      ) : (
        <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">{value}</p>
      )}
    </div>
  )
}

function BeforeAfterCard({ title, image, highlight = false }: { title: string; image: string; highlight?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-2xl border p-3 transition hover:shadow-lg ${highlight ? 'border-[var(--accent)]/30 bg-[var(--accent)]/5' : 'border-[var(--border)] bg-[var(--bg-card)]'}`}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--text-primary)]">{title}</p>
        {highlight && <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-black text-[var(--btn-primary-text)]">Optimized</span>}
      </div>
      <img src={image} alt={title} className="w-full rounded-xl" />
    </div>
  )
}