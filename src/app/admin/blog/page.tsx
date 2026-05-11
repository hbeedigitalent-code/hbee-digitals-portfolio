'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Search, Plus, Edit, Trash2, Eye } from 'lucide-react'

interface BlogPost {
  id: string
  title: string
  slug: string
  status: string
  excerpt: string
  featured_image: string
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
    if (confirm('Delete this post? This action cannot be undone.')) {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id)
      if (!error) fetchPosts()
      else alert('Error deleting post: ' + error.message)
    }
  }

  const filteredPosts = posts.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.excerpt && p.excerpt.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="inline-block w-8 h-8 rounded-full border-2 border-gray-300 border-t-gray-800 animate-spin mb-3" />
        <p className="text-gray-500">Loading posts...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Blog Posts</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-64 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <Link
            href="/admin/blog/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Post
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        {filteredPosts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-3">📝</div>
            <p className="text-gray-500 mb-4">No blog posts yet. Create your first post!</p>
            <Link
              href="/admin/blog/new"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
            >
              <Plus className="w-4 h-4" />
              Create New Post
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Title</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 hidden md:table-cell">Category</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 hidden lg:table-cell">Views</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 hidden lg:table-cell">Date</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {post.featured_image ? (
                          <img src={post.featured_image} alt="" className="w-8 h-8 rounded object-cover hidden sm:block" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-gray-200 hidden sm:block" />
                        )}
                        <div>
                          <Link href={`/admin/blog/${post.id}`} className="font-medium text-gray-800 hover:text-blue-600 transition line-clamp-1">
                            {post.title}
                          </Link>
                          {post.excerpt && (
                            <p className="text-xs text-gray-400 line-clamp-1 hidden sm:block">{post.excerpt}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-500 hidden md:table-cell">{post.category?.name || 'Uncategorized'}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        post.status === 'published' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500 hidden lg:table-cell">{post.views || 0}</td>
                    <td className="p-4 text-sm text-gray-500 hidden lg:table-cell">
                      {new Date(post.published_at || post.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/blog/${post.id}`} className="p-1.5 text-gray-500 hover:text-blue-600 transition" title="Edit">
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button 
                          onClick={() => handleDelete(post.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
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