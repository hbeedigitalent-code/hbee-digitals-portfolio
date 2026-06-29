// src/app/client-portal/files/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import SvgIcon from '@/components/ui/SvgIcon'
import EmptyState from '@/components/client-portal/EmptyState'
import StatusBadge from '@/components/client-portal/StatusBadge'

interface File {
  id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  uploaded_at: string
}

export default function ClientFilesPage() {
  const supabase = createClientComponentClient()
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [clientId, setClientId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchFiles()
  }, [])

  async function fetchFiles() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (clientData) {
        setClientId(clientData.id)
        const { data: fileData } = await supabase
          .from('project_files')
          .select('*')
          .eq('client_id', clientData.id)
          .order('uploaded_at', { ascending: false })
        setFiles(fileData || [])
      }
    }

    setLoading(false)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !clientId) return

    setUploading(true)

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${file.name}`
      const filePath = `client-files/${clientId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath)

      // Save to database
      const { error: dbError } = await supabase
        .from('project_files')
        .insert({
          client_id: clientId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type || 'application/octet-stream',
          file_size: file.size,
          uploaded_by: 'client',
        })

      if (dbError) throw dbError

      // Refresh files
      await fetchFiles()
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload file. Please try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Files</h1>
          <p className="text-[var(--text-muted)]">Upload and manage your project files</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[var(--accent-orange)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)] disabled:opacity-50"
          >
            <SvgIcon name="upload" size={16} color="white" />
            {uploading ? 'Uploading...' : 'Upload File'}
          </label>
        </div>
      </div>

      {files.length === 0 ? (
        <EmptyState
          title="No files uploaded"
          description="Upload your project files, documents, and assets here."
          icon="file"
          actionText="Upload File"
          onAction={() => fileInputRef.current?.click()}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <table className="w-full">
            <thead className="border-b border-[var(--border)] bg-[var(--bg-section)]">
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                <th className="px-4 py-3">File Name</th>
                <th className="px-4 py-3 hidden sm:table-cell">Type</th>
                <th className="px-4 py-3 hidden md:table-cell">Size</th>
                <th className="px-4 py-3 hidden lg:table-cell">Uploaded</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-[var(--bg-section)] transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <SvgIcon name="file" size={16} color="var(--text-muted)" />
                      <span className="text-sm font-medium text-[var(--text-primary)]">{file.file_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-sm text-[var(--text-muted)]">{file.file_type?.split('/').pop() || 'Unknown'}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-sm text-[var(--text-muted)]">
                    {formatFileSize(file.file_size)}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-sm text-[var(--text-muted)]">
                    {new Date(file.uploaded_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-[var(--accent-orange)] hover:underline"
                    >
                      Download
                      <SvgIcon name="download" size={14} color="var(--accent-orange)" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}