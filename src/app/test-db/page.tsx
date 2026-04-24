'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestDBPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProjects() {
      try {
        console.log('Testing Supabase connection...')
        console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
        
        const { data, error } = await supabase
          .from('projects')
          .select('*')
        
        if (error) {
          console.error('Supabase error:', error)
          setError(error.message)
        } else {
          console.log('Projects found:', data)
          setProjects(data || [])
        }
      } catch (err: any) {
        console.error('Fetch error:', err)
        setError(err.message || 'Failed to connect')
      } finally {
        setLoading(false)
      }
    }
    
    fetchProjects()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Database Connection Test</h1>
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            Loading...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Database Connection Test</h1>
        
        {error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
            <p className="text-sm mt-2">
              Make sure you've run the SQL in Supabase to create the projects table.
            </p>
          </div>
        ) : (
          <div>
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
              ✅ Connected to Supabase! Found {projects.length} project(s).
            </div>
            
            {projects.length > 0 ? (
              <div className="space-y-3">
                {projects.map((project) => (
                  <div key={project.id} className="bg-white p-4 rounded-lg shadow">
                    <h3 className="font-bold text-lg">{project.title}</h3>
                    <p className="text-gray-600">{project.description}</p>
                    <p className="text-sm text-gray-400">Status: {project.status}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                No projects found. Run the SQL in Supabase to create the projects table and sample data.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}