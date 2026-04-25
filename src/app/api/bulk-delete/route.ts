export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { table, ids } = await request.json()

    if (!table || !ids || ids.length === 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Delete items from specified table
    const { error } = await supabase
      .from(table)
      .delete()
      .in('id', ids)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully deleted ${ids.length} items`
    })
  } catch (error) {
    console.error('Bulk delete error:', error)
    return NextResponse.json({ error: 'Failed to delete items' }, { status: 500 })
  }
}
