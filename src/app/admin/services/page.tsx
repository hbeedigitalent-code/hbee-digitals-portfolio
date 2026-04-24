'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BulkDeleteEnhanced from '@/components/BulkDeleteEnhanced'

interface Service {
  id: string
  title: string
  description: string
  icon: string
  features: string[]
  display_order: number
  is_active: boolean
}

export default function ServicesAdmin() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/admin/login')
      } else {
        fetchServices()
      }
    }
    checkUser()
  }, [])

  const fetchServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('*')
      .order('display_order', { ascending: true })
    setServices(data || [])
    setLoading(false)
  }

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('services')
      .update({ is_active: !currentStatus })
      .eq('id', id)
    
    if (error) {
      alert('Error: ' + error.message)
    } else {
      fetchServices()
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this service?')) {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id)
      
      if (error) {
        alert('Error: ' + error.message)
      } else {
        fetchServices()
      }
    }
  }

  const handleToggleSelect = (id: string, checked: boolean) => {
    const event = new CustomEvent('toggleSelect', { detail: { id, checked } })
    document.dispatchEvent(event)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="p-4" style={{ backgroundColor: 'var(--primary-color)' }}>
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Manage Services</h1>
          <Link href="/admin/dashboard" className="text-white hover:opacity-80">
            ← Back to Dashboard
          </Link>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        {/* Add Button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">All Services</h2>
          <Link
            href="/admin/services/new"
            className="px-4 py-2 text-white rounded-lg"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            + Add New Service
          </Link>
        </div>

        {/* Services Grid */}
        {services.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No services yet. Click "Add New Service" to create one.</p>
          </div>
        ) : (
          <>
            {/* Bulk Delete Component */}
            <BulkDeleteEnhanced 
              table="services" 
              items={services} 
              onDelete={fetchServices}
              itemName="services"
            />
            
            <div className="grid gap-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="bg-white rounded-lg shadow p-4 flex justify-between items-center hover:shadow-md transition"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {/* Checkbox for bulk delete */}
                      <input
                        type="checkbox"
                        data-id={service.id}
                        className="select-checkbox w-4 h-4 cursor-pointer"
                        onChange={(e) => handleToggleSelect(service.id, e.target.checked)}
                      />
                      <h3 className="font-semibold text-lg">{service.title}</h3>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          service.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {service.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-gray-400 text-sm">Order: {service.display_order}</span>
                    </div>
                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">{service.description}</p>
                    {service.features && service.features.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {service.features.slice(0, 3).map((feature, i) => (
                          <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {feature}
                          </span>
                        ))}
                        {service.features.length > 3 && (
                          <span className="text-xs text-gray-400">+{service.features.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleStatus(service.id, service.is_active)}
                      className={`px-3 py-1 rounded text-sm ${
                        service.is_active
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {service.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <Link
                      href={`/admin/services/${service.id}`}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}