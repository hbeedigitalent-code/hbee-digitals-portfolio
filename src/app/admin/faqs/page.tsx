'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface FAQ {
  id: string
  question: string
  answer: string
  rich_answer: string
  category_id: string
  display_order: number
  is_active: boolean
}

interface Category {
  id: string
  name: string
}

export default function FAQsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<FAQ | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [useRichText, setUseRichText] = useState(false)
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    rich_answer: '',
    category_id: '',
    display_order: 0,
    is_active: true
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    fetchCategories()
    fetchFaqs()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/admin/login')
    }
  }

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('faq_categories')
      .select('id, name')
      .eq('is_active', true)
      .order('display_order')
    setCategories(data || [])
    if (data && data.length > 0 && !formData.category_id) {
      setFormData(prev => ({ ...prev, category_id: data[0].id }))
    }
  }

  const fetchFaqs = async () => {
    const { data } = await supabase
      .from('faqs')
      .select('*')
      .order('display_order', { ascending: true })
    
    setFaqs(data || [])
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({
      question: '',
      answer: '',
      rich_answer: '',
      category_id: categories[0]?.id || '',
      display_order: 0,
      is_active: true
    })
    setEditingItem(null)
    setShowForm(false)
    setUseRichText(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const submitData = useRichText 
      ? { ...formData, rich_answer: formData.rich_answer, answer: formData.rich_answer }
      : { ...formData, rich_answer: formData.answer, answer: formData.answer }

    if (editingItem) {
      const { error } = await supabase
        .from('faqs')
        .update({
          question: submitData.question,
          answer: submitData.answer,
          rich_answer: submitData.rich_answer,
          category_id: submitData.category_id,
          display_order: submitData.display_order,
          is_active: submitData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingItem.id)

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'FAQ updated successfully!' })
        fetchFaqs()
        resetForm()
      }
    } else {
      const { error } = await supabase
        .from('faqs')
        .insert([submitData])

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'FAQ created successfully!' })
        fetchFaqs()
        resetForm()
      }
    }
    setSaving(false)
  }

  const handleEdit = (item: FAQ) => {
    setEditingItem(item)
    const hasRichText = !!(item.rich_answer && item.rich_answer !== item.answer)
    setUseRichText(hasRichText)
    setFormData({
      question: item.question,
      answer: item.answer,
      rich_answer: item.rich_answer || item.answer,
      category_id: item.category_id || categories[0]?.id || '',
      display_order: item.display_order,
      is_active: item.is_active
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this FAQ?')) {
      const { error } = await supabase
        .from('faqs')
        .delete()
        .eq('id', id)

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'FAQ deleted successfully!' })
        fetchFaqs()
      }
    }
  }

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('faqs')
      .update({ is_active: !currentStatus })
      .eq('id', id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      fetchFaqs()
      setMessage({ type: 'success', text: `FAQ ${!currentStatus ? 'activated' : 'deactivated'}!` })
      setTimeout(() => setMessage(null), 2000)
    }
  }

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId)
    return cat ? cat.name : 'General'
  }

  const insertFormat = (type: string) => {
    const textarea = document.getElementById('richAnswer') as HTMLTextAreaElement
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    let newText = text
    let newStart = start
    
    switch(type) {
      case 'bold':
        newText = text.substring(0, start) + '<strong>' + text.substring(start, end) + '</strong>' + text.substring(end)
        newStart = start + 8
        break
      case 'italic':
        newText = text.substring(0, start) + '<em>' + text.substring(start, end) + '</em>' + text.substring(end)
        newStart = start + 5
        break
      case 'link':
        const url = prompt('Enter URL:', 'https://')
        if (url) {
          newText = text.substring(0, start) + '<a href="' + url + '" target="_blank" style="color: #007BFF; text-decoration: underline;">' + (text.substring(start, end) || 'link text') + '</a>' + text.substring(end)
          newStart = start + 20 + url.length
        }
        break
      case 'color-blue':
        newText = text.substring(0, start) + '<span style="color: #007BFF; font-weight: 500;">' + text.substring(start, end) + '</span>' + text.substring(end)
        break
      case 'color-green':
        newText = text.substring(0, start) + '<span style="color: #10B981; font-weight: 500;">' + text.substring(start, end) + '</span>' + text.substring(end)
        break
      case 'list':
        newText = text.substring(0, start) + '<ul style="margin: 8px 0 8px 20px;"><li>' + text.substring(start, end).split('\n').join('</li><li>') + '</li></ul>' + text.substring(end)
        break
      default:
        newText = text
    }
    
    setFormData({ ...formData, rich_answer: newText })
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newStart, newStart)
    }, 10)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-2 text-gray-600">Loading FAQs...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">FAQs Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage frequently asked questions with rich text formatting</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-white rounded-lg hover:opacity-90"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            + New FAQ
          </button>
        )}
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {editingItem ? 'Edit FAQ' : 'Add New FAQ'}
            </h3>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useRichText}
                onChange={(e) => setUseRichText(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-600">Enable Rich Text Formatting</span>
            </label>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Question *</label>
              <input
                type="text"
                required
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Enter the question"
              />
            </div>

            {useRichText ? (
              <div>
                <label className="block text-sm font-medium mb-2">Answer * (Rich Text)</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  <button type="button" onClick={() => insertFormat('bold')} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm font-bold">Bold</button>
                  <button type="button" onClick={() => insertFormat('italic')} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm italic">Italic</button>
                  <button type="button" onClick={() => insertFormat('link')} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm">Link</button>
                  <button type="button" onClick={() => insertFormat('color-blue')} className="px-3 py-1 bg-blue-100 rounded hover:bg-blue-200 text-sm text-blue-600">Blue Text</button>
                  <button type="button" onClick={() => insertFormat('color-green')} className="px-3 py-1 bg-green-100 rounded hover:bg-green-200 text-sm text-green-600">Green Text</button>
                  <button type="button" onClick={() => insertFormat('list')} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm">List</button>
                </div>
                <textarea
                  id="richAnswer"
                  required
                  value={formData.rich_answer}
                  onChange={(e) => setFormData({ ...formData, rich_answer: e.target.value })}
                  rows={8}
                  className="w-full p-2 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Enter your answer with HTML formatting..."
                />
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Preview:</p>
                  <div className="text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formData.rich_answer || 'Your formatted answer will appear here...' }} />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1">Answer *</label>
                <textarea
                  required
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  rows={5}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Enter the answer"
                />
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Display Order</label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="0, 1, 2..."
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Active (visible on website)</span>
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {saving ? 'Saving...' : (editingItem ? 'Update FAQ' : 'Create FAQ')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {faqs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">❓</div>
            <p className="text-gray-500">No FAQs yet. Create your first FAQ!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Question</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Category</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Rich Text</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Order</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {faqs.map((faq) => (
                  <tr key={faq.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-medium text-gray-800 max-w-md truncate">{faq.question}</td>
                    <td className="p-4 text-sm text-gray-500">{getCategoryName(faq.category_id)}</td>
                    <td className="p-4">
                      {faq.rich_answer && faq.rich_answer !== faq.answer ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">HTML</span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Plain</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-500">{faq.display_order}</td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleStatus(faq.id, faq.is_active)}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${faq.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {faq.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-3">
                        <button onClick={() => handleEdit(faq)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                        <button onClick={() => handleDelete(faq.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
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