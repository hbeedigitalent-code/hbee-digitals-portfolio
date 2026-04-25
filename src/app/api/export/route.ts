import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Dynamic import to avoid build-time issues
    const { supabase } = await import('@/lib/supabase')
    
    const { table, format = 'csv' } = await request.json()

    if (!table) {
      return NextResponse.json({ error: 'Table name required' }, { status: 400 })
    }

    // Fetch data from specified table
    const { data, error } = await supabase.from(table).select('*')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (format === 'csv') {
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'No data to export' }, { status: 404 })
      }

      const headers = Object.keys(data[0])
      const csvRows = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header]
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          }).join(',')
        )
      ]

      const csvContent = csvRows.join('\n')
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=${table}-export-${Date.now()}.csv`
        }
      })
    }

    if (format === 'json') {
      return NextResponse.json(data, {
        headers: {
          'Content-Disposition': `attachment; filename=${table}-export-${Date.now()}.json`
        }
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
