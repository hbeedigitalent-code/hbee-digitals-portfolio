export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'
import { writeFile, readFile, unlink, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: Request) {
  try {
    const { action, tables, backupId } = await request.json()
    const backupDir = path.join(process.cwd(), 'backups')
    await mkdir(backupDir, { recursive: true })

    if (action === 'create') {
      const backupData: Record<string, any> = {}
      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*')
        if (error) throw error
        backupData[table] = data
      }

      const backup = {
        version: '1.0',
        created_at: new Date().toISOString(),
        tables: tables,
        data: backupData
      }

      const filename = `backup-${Date.now()}.json`
      const filepath = path.join(backupDir, filename)
      await writeFile(filepath, JSON.stringify(backup, null, 2), 'utf-8')
      const stats = await (await import('fs/promises')).stat(filepath)

      await supabase.from('backup_records').insert({
        filename,
        size_bytes: stats.size,
        tables_backup: tables,
        created_by: (await supabase.auth.getUser()).data.user?.email
      })

      return NextResponse.json({ success: true, filename, message: 'Backup created successfully!' })
    }

    if (action === 'restore') {
      const { data: backupRecord } = await supabase
        .from('backup_records')
        .select('*')
        .eq('id', backupId)
        .single()

      if (!backupRecord) {
        return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
      }

      const filepath = path.join(backupDir, backupRecord.filename)
      const fileContent = await readFile(filepath, 'utf-8')
      const backup = JSON.parse(fileContent)

      for (const [table, data] of Object.entries(backup.data)) {
        await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (Array.isArray(data) && data.length > 0) {
          await supabase.from(table).insert(data)
        }
      }

      await supabase
        .from('backup_records')
        .update({ restored_at: new Date().toISOString() })
        .eq('id', backupId)

      return NextResponse.json({ success: true, message: 'Backup restored successfully!' })
    }

    if (action === 'delete') {
      const { data: backupRecord } = await supabase
        .from('backup_records')
        .select('*')
        .eq('id', backupId)
        .single()

      if (backupRecord) {
        const filepath = path.join(backupDir, backupRecord.filename)
        await unlink(filepath).catch(() => {})
        await supabase.from('backup_records').delete().eq('id', backupId)
      }

      return NextResponse.json({ success: true, message: 'Backup deleted successfully!' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Backup error:', error)
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { data } = await supabase
      .from('backup_records')
      .select('*')
      .order('created_at', { ascending: false })

    return NextResponse.json({ success: true, backups: data })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch backups' }, { status: 500 })
  }
}
