import Link from 'next/link'
import BlogPostEditor from '@/components/admin/BlogPostEditor'

export default function NewBlogPostPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)]">
            New Blog Post
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Create a formatted, SEO-ready Hbee Digitals article.
          </p>
        </div>

        <Link href="/admin/blog" className="font-bold text-[var(--accent)]">
          Back to Blog
        </Link>
      </div>

      <BlogPostEditor mode="new" />
    </div>
  )
}