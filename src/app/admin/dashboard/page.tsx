'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    projects: 0,
    services: 0,
    faqs: 0,
    messages: 0,
  })

  useEffect(() => {
    const fetchStats = async () => {
      const [projects, services, faqs, messages] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('services').select('*', { count: 'exact', head: true }),
        supabase.from('faqs').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
      ])
      
      setStats({
        projects: projects.count || 0,
        services: services.count || 0,
        faqs: faqs.count || 0,
        messages: messages.count || 0,
      })
    }
    fetchStats()
  }, [])

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Welcome Back!</h2>
        <p className="text-gray-500 mt-1">Here's what's happening with your website today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4" style={{ borderLeftColor: 'var(--primary-color)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Projects</p>
              <p className="text-3xl font-bold text-gray-800">{stats.projects}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <div className="w-6 h-6">
                <Image 
                  src="/svgs/projects.svg" 
                  alt="Projects" 
                  width={24} 
                  height={24} 
                  className="w-full h-full"
                  style={{ filter: 'brightness(0) saturate(100%) invert(27%) sepia(91%) saturate(1896%) hue-rotate(202deg) brightness(92%) contrast(101%)' }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4" style={{ borderLeftColor: '#10B981' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Services</p>
              <p className="text-3xl font-bold text-gray-800">{stats.services}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <div className="w-6 h-6">
                <Image 
                  src="/svgs/services.svg" 
                  alt="Services" 
                  width={24} 
                  height={24} 
                  className="w-full h-full"
                  style={{ filter: 'brightness(0) saturate(100%) invert(35%) sepia(91%) saturate(1235%) hue-rotate(98deg) brightness(96%) contrast(89%)' }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4" style={{ borderLeftColor: '#F59E0B' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total FAQs</p>
              <p className="text-3xl font-bold text-gray-800">{stats.faqs}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <div className="w-6 h-6">
                <Image 
                  src="/svgs/faq.svg" 
                  alt="FAQs" 
                  width={24} 
                  height={24} 
                  className="w-full h-full"
                  style={{ filter: 'brightness(0) saturate(100%) invert(54%) sepia(72%) saturate(1915%) hue-rotate(359deg) brightness(101%) contrast(106%)' }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4" style={{ borderLeftColor: '#EF4444' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Unread Messages</p>
              <p className="text-3xl font-bold text-gray-800">{stats.messages}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <div className="w-6 h-6">
                <Image 
                  src="/svgs/messages.svg" 
                  alt="Messages" 
                  width={24} 
                  height={24} 
                  className="w-full h-full"
                  style={{ filter: 'brightness(0) saturate(100%) invert(24%) sepia(84%) saturate(2282%) hue-rotate(346deg) brightness(94%) contrast(94%)' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions with SVG Icons */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link 
            href="/admin/projects/new" 
            className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition group"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <div className="w-5 h-5">
                <Image 
                  src="/svgs/projects.svg" 
                  alt="New Project" 
                  width={20} 
                  height={20} 
                  className="w-full h-full"
                  style={{ filter: 'brightness(0) saturate(100%) invert(27%) sepia(91%) saturate(1896%) hue-rotate(202deg) brightness(92%) contrast(101%)' }}
                />
              </div>
            </div>
            <div className="text-sm font-medium text-gray-700">New Project</div>
          </Link>

          <Link 
            href="/admin/services/new" 
            className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition group"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <div className="w-5 h-5">
                <Image 
                  src="/svgs/services.svg" 
                  alt="New Service" 
                  width={20} 
                  height={20} 
                  className="w-full h-full"
                  style={{ filter: 'brightness(0) saturate(100%) invert(35%) sepia(91%) saturate(1235%) hue-rotate(98deg) brightness(96%) contrast(89%)' }}
                />
              </div>
            </div>
            <div className="text-sm font-medium text-gray-700">New Service</div>
          </Link>

          <Link 
            href="/admin/faqs/new" 
            className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition group"
          >
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <div className="w-5 h-5">
                <Image 
                  src="/svgs/faq.svg" 
                  alt="New FAQ" 
                  width={20} 
                  height={20} 
                  className="w-full h-full"
                  style={{ filter: 'brightness(0) saturate(100%) invert(54%) sepia(72%) saturate(1915%) hue-rotate(359deg) brightness(101%) contrast(106%)' }}
                />
              </div>
            </div>
            <div className="text-sm font-medium text-gray-700">New FAQ</div>
          </Link>

          <Link 
            href="/admin/messages" 
            className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition group"
          >
            <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <div className="w-5 h-5">
                <Image 
                  src="/svgs/messages.svg" 
                  alt="Messages" 
                  width={20} 
                  height={20} 
                  className="w-full h-full"
                  style={{ filter: 'brightness(0) saturate(100%) invert(24%) sepia(84%) saturate(2282%) hue-rotate(346deg) brightness(94%) contrast(94%)' }}
                />
              </div>
            </div>
            <div className="text-sm font-medium text-gray-700">View Messages</div>
          </Link>
        </div>
      </div>
    </div>
  )
}