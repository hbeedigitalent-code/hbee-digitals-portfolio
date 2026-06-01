'use client'

import { useState } from 'react'

interface SearchFilterProps {
  onSearch: (query: string) => void
  onFilter?: (filter: string) => void
  placeholder?: string
  filterOptions?: { value: string; label: string }[]
}

export default function SearchFilter({ 
  onSearch, 
  onFilter, 
  placeholder = "Search...", 
  filterOptions = [] 
}: SearchFilterProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    onSearch(value)
  }

  const handleFilter = (value: string) => {
    setActiveFilter(value)
    onFilter?.(value)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <div className="relative flex-1">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 pl-9 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]"
        />
        <svg className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      
      {filterOptions.length > 0 && (
        <select
          value={activeFilter}
          onChange={(e) => handleFilter(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]"
        >
          {filterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
    </div>
  )
}