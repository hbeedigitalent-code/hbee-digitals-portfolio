'use client'

import { useState } from 'react'

interface BulkDeleteProps {
  table: string
  items: any[]
  onDelete: () => void
  itemName?: string
}

export default function BulkDelete({ table, items, onDelete, itemName = 'items' }: BulkDeleteProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
    setMessage(null)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map(item => item.id)))
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
        <div className="flex justify-between items-center mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedIds.size === items.length && items.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-gray-600">
              Select All ({items.length})
            </span>
          </label>
          
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 text-sm"
            >
              {deleting ? 'Deleting...' : `Delete Selected (${selectedIds.size})`}
            </button>
          )}
        </div>
      )}

      <style jsx>{`
        input[type="checkbox"] {
          cursor: pointer;
        }
      `}</style>
    </>
  )
}