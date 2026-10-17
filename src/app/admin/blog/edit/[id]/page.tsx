'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BlogPostEditor from '@/components/admin/BlogPostEditor'
import { insightTags } from '@/lib/blog-utils'

type EditorPost = {
  id: string
  title?: string
  slug?: string
  excerpt?: string
  content?: string
  featured_image?: string
  featured_image_alt?: string
  alt_text?: string
  author?: string
  tags?: string[]
  status?: string
  is_featured?: boolean
  seo_title?: string
  seo_description?: string
  focus_keyword?: string
  og_title?: string
  og_description?: string
  og_image?: string
  canonical_url?: string
  read_time?: string
  published_at?: string | null
}

function normalizePost(data: any): EditorPost {
  return {
    id: data.id,
    title: data.title || '',
    slug: data.slug || '',
    excerpt: data.excerpt || '',
    content: data.content || '',
    featured_image: data.featured_image || '',
    featured_image_alt: data.featured_image_alt ?? data.alt_text ?? '',
    alt_text: data.alt_text || '',
    author: data.author || '',
    tags: insightTags(data.tags),
    status: data.status || 'draft',
    is_featured: Boolean(data.is_featured),
    seo_title: data.seo_title || '',
    seo_description: data.seo_description || '',
    focus_keyword: data.focus_keyword || '',
    og_title: data.og_title || '',
    og_description: data.og_description || '',
    og_image: data.og_image || '',
    canonical_url: data.canonical_url || '',
    read_time: data.read_time || '',
    published_at: data.published_at || null,
  }
}

export default function EditBlogPage({ params }: { params: { id: string } }) {
  const router = useRouter()

  const [post, setPost] = useState<EditorPost | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadPost() {
      const { data: authData } = await supabase.auth.getUser()

      if (!authData.user) {
        router.push('/admin/login')
        return
      }

      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error || !data) {
        setErrorMessage(error?.message || 'Article not found.')
        setLoading(false)
        return
      }

      setPost(normalizePost(data))
      setLoading(false)
    }

    loadPost()
  }, [params.id, router])

  if (errorMessage) return <p role="alert" className="p-6 text-red-500">{errorMessage}</p>
  if (loading || !post) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[var(--bg-page)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#39D97A] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-4 sm:p-8">
      <BlogPostEditor mode="edit" initialPost={post} />
    </div>
  )
}
