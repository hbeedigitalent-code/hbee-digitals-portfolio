'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import { ClientPortalLayout } from '@/components/client-portal/ClientPortalLayout'
import SvgIcon from '@/components/ui/SvgIcon'

interface Client {
  id: string
  full_name: string
  business_name: string
}

interface FileItem {
  id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  category: string
  uploaded_by: string
  uploaded_at: string
  project_id: string
  project_name: string
}

export default function ClientFilesPage() {
  const supabase = createClientComponentClient()
  const [client, setClient] = useState<Client | null>(null)
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')

  const categories = ['all', 'Logos', 'Brand Guidelines', 'Product Images', 'Product Videos', 'Website Content', 'Screenshots', 'Audit Reports', 'Other']

  useEffect(() => {
    fetchClientData()
  }, [])

  async function fetchClientData() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (clientData) {
        setClient(clientData)

        const { data: fileData } = await supabase
          .from('project_files')
          .select(`
            *,
            projects (project_name)
          `)
          .eq('client_id', clientData.id)
          .order('uploaded_at', { ascending: false })

        setFiles(fileData || [])
      }
    }

    setLoading(false)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !client) return

    setUploading(true)

    try {
      const filePath = `client-${client.id}/${Date.now()}-${file.name}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('client-portal-files')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('client-portal-files')
        .getPublicUrl(filePath)

      const { error: insertError } = await supabase
        .from('project_files')
        .insert({
          client_id: client.id,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          file_size: file.size,
          category: 'Other',
          uploaded_by: 'Client'
        })

      if (insertError) throw insertError

      await fetchClientData()
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

  const filteredFiles = selectedCategory === 'all' 
    ? files 
    : files.filter(f => f.category === selectedCategory)

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-navy)]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-navy)]">
        <p className="text-[var(--text-muted)]">No client profile found</p>
      </div>
    )
  }

  return (
    <ClientPortalLayout clientName={client.full_name} businessName={client.business_name}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Files</h1>
          
          <div className="flex items-center gap-3">
            <label className="cursor-pointer rounded-full bg-[var(--accent-orange)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)]">
              {uploading ? 'Uploading...' : 'Upload File'}
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                selectedCategory === category
                  ? 'bg-[var(--accent-orange)] text-white'
                  : 'border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-orange)]'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        {/* File List */}
        {files.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-12 text-center">
            <SvgIcon name="file" size={48} color="var(--text-muted)" className="mx-auto mb-4" />
            <p className="text-[var(--text-muted)]">No files uploaded yet.</p>
            <p className="text-sm text-[var(--text-muted)]">Upload your first file above.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card-dark)] p-4 transition hover:border-[var(--accent-orange)]"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-[var(--bg-navy-mid)] p-2">
                    <SvgIcon name="file" size={24} color="var(--accent-orange)" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{file.file_name}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                      <span>{formatFileSize(file.file_size)}</span>
                      <span>•</span>
                      <span>{file.category || 'Other'}</span>
                      {file.project_name && (
                        <>
                          <span>•</span>
                          <span>{file.project_name}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>Uploaded {new Date(file.uploaded_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <a
                  href={file.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-[var(--accent-orange)] hover:underline"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </ClientPortalLayout>
  )
}