'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface BackupRecord {
  id: string
  filename: string
  size_bytes: number
  tables_backup: string[]
  created_by: string
  created_at: string
  restored_at: string | null
}

export default function BackupPage() {
  const [backups, setBackups] = useState<BackupRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedTables, setSelectedTables] = useState<string[]>([
    'projects', 'services', 'faqs', 'testimonials', 'team_members', 
    'blog_posts', 'blog_categories', 'subscribers', 'messages'
  ])
  const router = useRouter()

  const allTables = [
    { name: 'projects', label: 'Projects' },
    { name: 'services', label: 'Services' },
    { name: 'faqs', label: 'FAQs' },
    { name: 'testimonials', label: 'Testimonials' },
    { name: 'team_members', label: 'Team Members' },
    { name: 'blog_posts', label: 'Blog Posts' },
    { name: 'blog_categories', label: 'Blog Categories' },
    { name: 'subscribers', label: 'Subscribers' },
    { name: 'messages', label: 'Messages' },
    { name: 'menu_items', label: 'Menu Items' },
    { name: 'faq_categories', label: 'FAQ Categories' },
    { name: 'hero_section', label: 'Hero Section' },
    { name: 'about_section', label: 'About Section' },
    { name: 'cta_section', label: 'CTA Section' },
    { name: 'footer_settings', label: 'Footer Settings' },
    { name: 'site_settings', label: 'Site Settings' },
    { name: 'seo_settings', label: 'SEO Settings' },
  ]

  useEffect(() => {
    checkAuth()
    fetchBackups()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/admin/login')
    }
  }

  const fetchBackups = async () => {
    const response = await fetch('/api/backup')
    const result = await response.json()
    if (result.success) {
      setBackups(result.backups)
    }
    setLoading(false)
  }

  const createBackup = async () => {
    if (selectedTables.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one table to backup' })
      return
    }

    setCreating(true)
    setMessage(null)

    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          tables: selectedTables
        })
      })

      const result = await response.json()
      if (result.success) {
        setMessage({ type: 'success', text: result.message })
        fetchBackups()
      } else {
        setMessage({ type: 'error', text: result.error || 'Backup failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create backup' })
    } finally {
      setCreating(false)
    }
  }

  const restoreBackup = async (backupId: string) => {
    if (confirm('WARNING: Restoring will overwrite current data. Continue?')) {
      setRestoring(backupId)
      setMessage(null)

      try {
        const response = await fetch('/api/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'restore',
            backupId
          })
        })

        const result = await response.json()
        if (result.success) {
          setMessage({ type: 'success', text: result.message })
          fetchBackups()
        } else {
          setMessage({ type: 'error', text: result.error || 'Restore failed' })
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to restore backup' })
      } finally {
        setRestoring(null)
      }
    }
  }

  const deleteBackup = async (backupId: string, filename: string) => {
    if (confirm(`Delete backup "${filename}"?`)) {
      try {
        const response = await fetch('/api/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            backupId
          })
        })

        const result = await response.json()
        if (result.success) {
          setMessage({ type: 'success', text: result.message })
          fetchBackups()
        } else {
          setMessage({ type: 'error', text: result.error || 'Delete failed' })
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to delete backup' })
      }
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const toggleTable = (tableName: string) => {
    if (selectedTables.includes(tableName)) {
      setSelectedTables(selectedTables.filter(t => t !== tableName))
    } else {
      setSelectedTables([...selectedTables, tableName])
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-2 text-gray-600">Loading backups...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Backup & Restore</h2>
        <p className="text-sm text-gray-500 mt-1">Create and manage database backups to protect your data</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-700 border border-green-200' 
            : 'bg-red-100 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Create Backup Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--primary-color)' }}>
          Create New Backup
        </h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select Tables to Backup:</label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {allTables.map((table) => (
              <label key={table.name} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedTables.includes(table.name)}
                  onChange={() => toggleTable(table.name)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">{table.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={createBackup}
            disabled={creating || selectedTables.length === 0}
            className="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            {creating ? 'Creating...' : 'Create Backup'}
          </button>
          <button
            onClick={() => setSelectedTables(allTables.map(t => t.name))}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Select All
          </button>
          <button
            onClick={() => setSelectedTables([])}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Backups List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold">Backup History</h3>
        </div>
        
        {backups.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">💾</div>
            <p className="text-gray-500">No backups created yet. Create your first backup!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Filename</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Size</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Tables</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Created By</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Created At</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Restored</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {backups.map((backup) => (
                  <tr key={backup.id} className="hover:bg-gray-50">
                    <td className="p-4 text-sm font-mono">{backup.filename}</td>
                    <td className="p-4 text-sm">{formatFileSize(backup.size_bytes)}</td>
                    <td className="p-4 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {backup.tables_backup.slice(0, 3).map((table, i) => (
                          <span key={i} className="px-1 py-0.5 bg-gray-100 text-xs rounded">
                            {table}
                          </span>
                        ))}
                        {backup.tables_backup.length > 3 && (
                          <span className="px-1 py-0.5 bg-gray-100 text-xs rounded">
                            +{backup.tables_backup.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm">{backup.created_by || 'Admin'}</td>
                    <td className="p-4 text-sm">
                      {new Date(backup.created_at).toLocaleString()}
                    </td>
                    <td className="p-4 text-sm">
                      {backup.restored_at ? (
                        <span className="text-green-600">
                          {new Date(backup.restored_at).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">Never</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => restoreBackup(backup.id)}
                          disabled={restoring === backup.id}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                        >
                          {restoring === backup.id ? 'Restoring...' : 'Restore'}
                        </button>
                        <button
                          onClick={() => deleteBackup(backup.id, backup.filename)}
                          className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
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

      {/* Info Box */}
      <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
        <h4 className="font-semibold text-yellow-800 mb-3">⚠️ Important Notes</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Backups are stored on the server and included in the backup file</li>
          <li>• Restoring will OVERWRITE current data in selected tables</li>
          <li>• Always download a backup before major changes</li>
          <li>• Regular backups are recommended (weekly or before major updates)</li>
          <li>• Backups include: Projects, Services, FAQs, Blog Posts, Subscribers, Messages, and more</li>
        </ul>
      </div>
    </div>
  )
}