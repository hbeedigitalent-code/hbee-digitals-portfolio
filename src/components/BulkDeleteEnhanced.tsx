'use client'

import { useState, useEffect } from 'react'

interface BulkDeleteEnhancedProps {
  table: string
  items: any[]
  onDelete: () => void
  itemName?: string
}

export default function BulkDeleteEnhanced({ table, items, onDelete, itemName = 'items' }: BulkDeleteEnhancedProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Listen for checkbox changes from the table
  useEffect(() => {
    const handleToggleSelect = (event: Event) => {
      const customEvent = event as CustomEvent
      const { id, checked } = customEvent.detail
      
      setSelectedIds(prev => {
        const newSet = new Set(prev)
        if (checked) {
          newSet.add(id)
        } else {
          newSet.delete(id)
        }
        return newSet
      })
    }

    document.addEventListener('toggleSelect', handleToggleSelect)
    return () => document.removeEventListener('toggleSelect', handleToggleSelect)
  }, [])

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
      // Uncheck all checkboxes
      document.querySelectorAll('.select-checkbox').forEach((checkbox: any) => {
        checkbox.checked = false
      })
    } else {
      setSelectedIds(new Set(items.map(item => item.id)))
      // Check all checkboxes
      document.querySelectorAll('.select-checkbox').forEach((checkbox: any) => {
        checkbox.checked = true
      })
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    
    if (confirm(`Are you sure you want to delete ${selectedIds.size} ${itemName}? This action cannot be undone.`)) {
      setDeleting(true)
      setMessage(null)

      try {
        const response = await fetch('/api/bulk-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table,
            ids: Array.from(selectedIds)
          })
        })

        const result = await response.json()
        
        if (result.success) {
          setMessage({ type: 'success', text: result.message })
          setSelectedIds(new Set())
          onDelete()
        } else {
          setMessage({ type: 'error', text: result.error || 'Delete failed' })
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to delete items' })
      } finally {
        setDeleting(false)
      }
    }
  }

  return (
    <>
      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-700 border border-green-200' 
            : 'bg-red-100 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {items.length > 0 && (
        <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 rounded-lg">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.size === items.length && items.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded cursor-pointer"
            />
            <span className="text-sm text-gray-700">
              Select All ({items.length} {itemName})
            </span>
          </label>
          
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {deleting ? 'Deleting...' : `Delete Selected (${selectedIds.size})`}
            </button>
          )}
        </div>
      )}
    </>
  )
}