'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import BulkDeleteEnhanced from '@/components/BulkDeleteEnhanced'

interface Project {
  id: string
  title: string
  status: string
  created_at: string
}

export default function ProjectsList() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    setProjects(data || [])
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this project?')) {
      await supabase.from('projects').delete().eq('id', id)
      fetchProjects()
    }
  }

  const handleToggleSelect = (id: string, checked: boolean) => {
    const event = new CustomEvent('toggleSelect', { detail: { id, checked } })
    document.dispatchEvent(event)
  }

  if (loading) {
    return <div className="text-center py-12">Loading projects...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">All Projects</h2>
        <Link href="/admin/projects/new" className="px-4 py-2 text-white rounded-lg" style={{ backgroundColor: 'var(--primary-color)' }}>
          + New Project
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {projects.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No projects yet.</p>
          </div>
        ) : (
          <>
            <BulkDeleteEnhanced 
              table="projects" 
              items={projects} 
              onDelete={fetchProjects}
              itemName="projects"
            />
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-4 text-left w-10"></th>
                    <th className="p-4 text-left">Title</th>
                    <th className="p-4 text-left">Status</th>
                    <th className="p-4 text-left">Created</th>
                    <th className="p-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id} className="border-t hover:bg-gray-50">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          data-id={project.id}
                          className="select-checkbox w-4 h-4 cursor-pointer"
                          onChange={(e) => handleToggleSelect(project.id, e.target.checked)}
                        />
                      </td>
                      <td className="p-4 font-medium">{project.title}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs ${project.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-500">{new Date(project.created_at).toLocaleDateString()}</td>
                      <td className="p-4">
                        <Link href={`/admin/projects/${project.id}`} className="text-blue-600 hover:text-blue-800 mr-3">
                          Edit
                        </Link>
                        <button onClick={() => handleDelete(project.id)} className="text-red-600 hover:text-red-800">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}