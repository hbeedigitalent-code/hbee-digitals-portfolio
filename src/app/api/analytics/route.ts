import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServerSupabaseClient()

  // Example: get total posts, services, etc. (adjust to your needs)
  const { count: postsCount } = await supabase
    .from('blog_posts')
    .select('*', { count: 'exact', head: true })
  const { count: servicesCount } = await supabase
    .from('services')
    .select('*', { count: 'exact', head: true })

  return NextResponse.json({
    posts: postsCount || 0,
    services: servicesCount || 0,
  })
}