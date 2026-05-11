import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServerSupabaseClient()

  // Example: export all blog_posts as JSON (adjust tables as you need)
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('*')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ posts })
}