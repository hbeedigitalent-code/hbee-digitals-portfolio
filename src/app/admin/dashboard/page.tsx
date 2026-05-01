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
    totalMessages: 0,
    unreadMessages: 0,
  })
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      const [projects, services, faqs, totalMessages, unreadMessages] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('services').select('*', { count: 'exact', head: true }),
        supabase.from('faqs').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('is_read', false),
      ])
      
      setStats({
        projects: projects.count || 0,
        services: services.count || 0,
        faqs: faqs.count || 0,
        totalMessages: totalMessages.count || 0,
        unreadMessages: unreadMessages.count || 0,
      })
    }
    fetchStats()
  }, [])

  const notifications = [
    { id: 1, message: `${stats.unreadMessages} new message${stats.unreadMessages !== 1 ? 's' : ''}`, link: '/admin/messages', time: 'Just now' },
  ]

  return (
    <div>
      {/* Welcome Section with Notification Bell */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Welcome Back!</h2>
          <p className="text-gray-500 mt-1">Here's what's happening with your website today.</p>
        </div>
        
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-400 hover:text-gray-600 transition rounded-full hover:bg-gray-100"
          >
            <div className="w-6 h-6">
              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
            </div>
            {stats.unreadMessages > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {stats.unreadMessages > 9 ? '9+' : stats.unreadMessages}
              </span>
            )}
          </button>
          
          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
              <div className="p-3 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-800">Notifications</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {stats.unreadMessages > 0 ? (
                  notifications.map((notif) => (
                    <Link
                      key={notif.id}
                      href={notif.link}
                      onClick={() => setShowNotifications(false)}
                      className="block p-3 hover:bg-gray-50 transition border-b last:border-b-0"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <div className="w-4 h-4">
                            <Image 
                              src="/svgs/messages.svg" 
                              alt="Message" 
                              width={16} 
                              height={16} 
                              className="w-full h-full"
                              style={{ filter: 'brightness(0) saturate(100%) invert(24%) sepia(84%) saturate(2282%) hue-rotate(346deg) brightness(94%) contrast(94%)' }}
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-800">{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-400">
                    <div className="w-12 h-12 mx-auto mb-2">
                      <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <p className="text-sm">No new notifications</p>
                  </div>
                )}
              </div>
              {stats.unreadMessages > 0 && (
                <div className="p-2 border-t bg-gray-50 text-center">
                  <Link href="/admin/messages" className="text-xs text-blue-600 hover:underline">
                    View all messages
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Portfolio Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4" style={{ borderLeftColor: 'var(--primary-color)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Portfolio Items</p>
              <p className="text-3xl font-bold text-gray-800">{stats.projects}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <div className="w-6 h-6">
                <Image 
                  src="/svgs/portfolio-icon.svg" 
                  alt="Portfolio" 
                  width={24} 
                  height={24} 
                  className="w-full h-full"
                  style={{ filter: 'brightness(0) saturate(100%) invert(27%) sepia(91%) saturate(1896%) hue-rotate(202deg) brightness(92%) contrast(101%)' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Services Card */}
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

        {/* FAQs Card */}
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

        {/* Messages Card - Shows UNREAD count */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4" style={{ borderLeftColor: '#EF4444' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Unread Messages</p>
              <p className="text-3xl font-bold text-gray-800">{stats.unreadMessages}</p>
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

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link 
            href="/admin/portfolio/new" 
            className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition group"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <div className="w-5 h-5">
                <Image 
                  src="/svgs/portfolio-icon.svg" 
                  alt="New Portfolio" 
                  width={20} 
                  height={20} 
                  className="w-full h-full"
                  style={{ filter: 'brightness(0) saturate(100%) invert(27%) sepia(91%) saturate(1896%) hue-rotate(202deg) brightness(92%) contrast(101%)' }}
                />
              </div>
            </div>
            <div className="text-sm font-medium text-gray-700">Add Portfolio</div>
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