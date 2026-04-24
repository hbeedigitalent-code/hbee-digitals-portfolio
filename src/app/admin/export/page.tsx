'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ExportData from '@/components/ExportData'

interface TableConfig {
  name: string
  label: string
  description: string
  count: number
}

export default function ExportPage() {
  const [tables, setTables] = useState<TableConfig[]>([
    { name: 'projects', label: 'Projects', description: 'Export all project data including titles, descriptions, and status', count: 0 },
    { name: 'services', label: 'Services', description: 'Export service information with features and display order', count: 0 },
    { name: 'faqs', label: 'FAQs', description: 'Export frequently asked questions and answers', count: 0 },
    { name: 'testimonials', label: 'Testimonials', description: 'Export client testimonials with ratings', count: 0 },
    { name: 'team_members', label: 'Team Members', description: 'Export team member profiles and social links', count: 0 },
    { name: 'blog_posts', label: 'Blog Posts', description: 'Export blog posts with content and metadata', count: 0 },
    { name: 'subscribers', label: 'Newsletter Subscribers', description: 'Export email subscriber list', count: 0 },
    { name: 'messages', label: 'Contact Messages', description: 'Export all contact form submissions', count: 0 },
    { name: 'menu_items', label: 'Menu Items', description: 'Export navigation menu structure', count: 0 },
    { name: 'seo_settings', label: 'SEO Settings', description: 'Export meta tags and SEO configuration', count: 0 },
  ])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true
    
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error || !user) {
          if (isMounted) {
            router.replace('/admin/login')
          }
        } else {
          if (isMounted) {
            setIsAuthenticated(true)
            fetchCounts()
          }
        }
      } catch (err) {
        console.error('Auth error:', err)
        if (isMounted) {
          router.replace('/admin/login')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    checkAuth()
    
    return () => {
      isMounted = false
    }
  }, [router])

  const fetchCounts = async () => {
    for (const table of tables) {
      const { count } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true })
      
      table.count = count || 0
    }
    setTables([...tables])
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-2 text-gray-600">Loading export options...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const totalRecords = tables.reduce((sum, table) => sum + table.count, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Export Data</h2>
        <p className="text-sm text-gray-500 mt-1">Export your data to CSV or JSON format</p>
      </div>

      {/* Stats Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--primary-color)' }}>
              Database Overview
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Total records across all tables: <span className="font-bold">{totalRecords}</span>
            </p>
          </div>
          <button
            onClick={() => fetchCounts()}
            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition"
          >
            Refresh Counts
          </button>
        </div>
      </div>

      {/* Export Cards Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {tables.map((table) => (
          <ExportData
            key={table.name}
            table={table.name}
            label={table.label}
            description={`${table.count} records • ${table.description}`}
          />
        ))}
      </div>

      {/* Bulk Export Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--primary-color)' }}>
          Bulk Export All Data
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Export all data from all tables at once (ZIP file containing all CSV files)
        </p>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              let allData: any = {}
              for (const table of tables) {
                const response = await fetch('/api/export', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ table: table.name, format: 'json' })
                })
                if (response.ok) {
                  const data = await response.json()
                  allData[table.name] = data
                }
              }
              
              // Download as single JSON file
              const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `full-database-export-${Date.now()}.json`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Export All (JSON)
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-3">📋 Export Instructions</h4>
        <ul className="text-sm text-blue-700 space-y-2">
          <li>• Click CSV to export data in spreadsheet-compatible format</li>
          <li>• Click JSON to export data in structured JSON format</li>
          <li>• Exported files will be automatically downloaded to your computer</li>
          <li>• Use CSV format for Excel, Google Sheets, or database imports</li>
          <li>• Use JSON format for API integration or development</li>
          <li>• Bulk export downloads all tables as a single JSON file</li>
        </ul>
      </div>
    </div>
  )
}