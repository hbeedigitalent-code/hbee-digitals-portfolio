import { NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'

export async function POST(request: Request) {
  try {
    const { sitemap } = await request.json()
    
    const publicDir = path.join(process.cwd(), 'public')
    const sitemapPath = path.join(publicDir, 'sitemap.xml')
    
    await writeFile(sitemapPath, sitemap, 'utf-8')
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Sitemap generation error:', error)
    return NextResponse.json({ error: 'Failed to generate sitemap' }, { status: 500 })
  }
}
