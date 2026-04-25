import { NextResponse } from 'next/server'
import { writeFile, readFile, unlink, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: Request) {
  try {
    // Dynamic import to avoid build-time issues
    const { supabase } = await import('@/lib/supabase')
    
    const { action, tables, backupId } = await request.json()

    // Ensure backup directory exists
    const backupDir = path.join(process.cwd(), 'backups')
    await mkdir(backupDir, { recursive: true })

    // ... rest of the backup logic (same as before)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Backup error:', error)
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { supabase } = await import('@/lib/supabase')
    
    const { data } = await supabase
      .from('backup_records')
      .select('*')
      .order('created_at', { ascending: false })

    return NextResponse.json({ success: true, backups: data })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch backups' }, { status: 500 })
  }
}
