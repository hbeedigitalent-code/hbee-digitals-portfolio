'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BulkDeleteEnhanced from '@/components/BulkDeleteEnhanced'

interface TableConfig {
  name: string
  label: string
  items: any[]
}

export default function BulkDeletePage() {
  const [tables, setTables] = useState<TableConfig[]>([
    { name: 'projects', label: 'Projects', items: [] },
    { name: 'services', label: 'Services', items: [] },
    { name: 'faqs', label: 'FAQs', items: [] },
    { name: 'testimonials', label: 'Testimonials', items: [] },
    { name: 'team_members', label: 'Team Members', items: [] },
    { name: 'blog_posts', label: 'Blog Posts', items: [] },
    { name: 'subscribers', label: 'Subscribers', items: [] },
    { name: 'messages', label: 'Messages', items: [] },
  ])
  const [loading, setLoading] = useState(true)
  const [activeTable, setActiveTable] = useState('projects')
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    fetchAllData()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/admin/login')
    }
  }

  const fetchAllData = async () => {
    for (const table of tables) {
      const { data } = await supabase.from(table.name).select('id, title, name, email, question').limit(100)
      table.items = data || []
    }
    setTables([...tables])
    setLoading(false)
  }

  const refreshTable = async (tableName: string) => {
    const { data } = await supabase.from(tableName).select('id, title, name, email, question').limit(100)
    const updatedTables = tables.map(t => 
      t.name === tableName ? { ...t, items: data || [] } : t
    )
    setTables(updatedTables)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    )
  }

  const currentTable = tables.find(t => t.name === activeTable)

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Bulk Delete Manager</h2>
        <p className="text-sm text-gray-500 mt-1">Delete multiple items at once from any table</p>
      </div>

      <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
        {tables.map((table) => (
          <button
            key={table.name}
            onClick={() => setActiveTable(table.name)}
            className={`px-4 py-2 rounded-lg transition ${
              activeTable === table.name
                ? 'text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            style={{ backgroundColor: activeTable === table.name ? 'var(--primary-color)' : undefined }}
          >
            {table.label} ({table.items.length})
          </button>
        ))}
      </div>

      {currentTable && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--primary-color)' }}>
            Delete {currentTable.label}
          </h3>
          <BulkDeleteEnhanced 
            table={currentTable.name}
            items={currentTable.items}
            onDelete={() => refreshTable(currentTable.name)}
            itemName={currentTable.label.toLowerCase()}
          />
          
          {currentTable.items.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No {currentTable.label.toLowerCase()} to delete.
            </div>
          )}
        </div>
      )}

      <div className="mt-6 bg-yellow-50 rounded-xl p-4 border border-yellow-200">
        <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Warning</h4>
        <p className="text-sm text-yellow-700">
          Bulk delete operations are permanent and cannot be undone. Please use with caution.
          Always backup your data before performing bulk deletions.
        </p>
      </div>
    </div>
  )
}