'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface BlogPost {
  id: string
  title: string
  slug: string
  status: string
  views: number
  published_at: string
  created_at: string
  category: { name: string }
}

export default function BlogPostsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('blog_posts')
      .select(`
        *,
        category:blog_categories(name)
      `)
      .order('created_at', { ascending: false })
    
    setPosts(data || [])
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this post?')) {
      await supabase.from('blog_posts').delete().eq('id', id)
      fetchPosts()
    }
  }

  const filteredPosts = posts.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-2 text-gray-600">Loading posts...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Blog Posts</h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Link
            href="/admin/blog/new"
            className="px-4 py-2 text-white rounded-lg hover:opacity-90"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            + New Post
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {filteredPosts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-gray-500">No blog posts yet. Create your first post!</p>
            <Link
              href="/admin/blog/new"
              className="inline-block mt-4 text-blue-600 hover:underline"
            >
              Create New Post →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Title</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Category</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Views</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Date</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-medium text-gray-800">{post.title}</td>
                    <td className="p-4 text-sm text-gray-500">{post.category?.name || 'Uncategorized'}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        post.status === 'published' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">{post.views || 0}</td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(post.published_at || post.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-3">
                        <Link href={`/admin/blog/${post.id}`} className="text-blue-600 hover:text-blue-800 text-sm">
                          Edit
                        </Link>
                        <button 
                          onClick={() => handleDelete(post.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}