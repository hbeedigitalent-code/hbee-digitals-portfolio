'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Category {
  id: string
  name: string
}

export default function NewFAQ() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [richAnswer, setRichAnswer] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [displayOrder, setDisplayOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('faq_categories')
      .select('id, name')
      .eq('is_active', true)
      .order('display_order')

    setCategories(data || [])

    if (data && data.length > 0) {
      setCategoryId(data[0].id)
      setCategoryName(data[0].name)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (question.trim().length < 8) {
      setMessage('Question is too short.')
      setLoading(false)
      return
    }

    if (answer.trim().length < 25) {
      setMessage('Answer should be more detailed.')
      setLoading(false)
      return
    }

    const selectedCategory = categories.find((cat) => cat.id === categoryId)

    const { error } = await supabase.from('faqs').insert([
      {
        question: question.trim(),
        answer: answer.trim(),
        rich_answer: richAnswer.trim() || null,
        category_id: categoryId || null,
        category: selectedCategory?.name || categoryName || null,
        display_order: displayOrder,
        is_active: isActive,
      },
    ])

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      router.push('/admin/faqs')
    }

    setLoading(false)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Create New FAQ</h2>
          <p className="mt-1 text-sm text-gray-500">
            Add useful, clear answers that help visitors trust your process.
          </p>
        </div>

        <Link href="/admin/faqs" className="text-gray-600 hover:text-gray-800">
          ← Back
        </Link>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-100 p-4 text-sm text-red-700">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium">Question *</label>
          <input
            type="text"
            required
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full rounded-lg border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Example: How long does a typical website project take?"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Simple Answer *</label>
          <textarea
            required
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={5}
            className="w-full rounded-lg border p-2 leading-7 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Write a clear and helpful answer."
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Rich Answer HTML / Optional
          </label>
          <textarea
            value={richAnswer}
            onChange={(e) => setRichAnswer(e.target.value)}
            rows={5}
            className="w-full rounded-lg border p-2 font-mono text-sm leading-7 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="<p>You can add formatted HTML here if needed.</p>"
          />
          <p className="mt-1 text-xs text-gray-400">
            Leave empty if you only want to use the simple answer.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Category</label>
            <select
              value={categoryId}
              onChange={(e) => {
                const selected = categories.find((cat) => cat.id === e.target.value)
                setCategoryId(e.target.value)
                setCategoryName(selected?.name || '')
              }}
              className="w-full rounded-lg border p-2"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Display Order</label>
            <input
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value || '0', 10))}
              className="w-full rounded-lg border p-2"
              placeholder="0, 1, 2..."
            />
          </div>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4"
          />

          <span className="text-sm font-medium">Active / visible on website</span>
        </label>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            {loading ? 'Saving...' : 'Create FAQ'}
          </button>

          <Link href="/admin/faqs" className="rounded-lg bg-gray-300 px-4 py-2 hover:bg-gray-400">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}