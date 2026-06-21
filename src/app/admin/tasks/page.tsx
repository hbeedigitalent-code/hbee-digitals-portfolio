'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'
import { Task, TaskStatus } from '@/types/admin-crm'

const statusColumns: TaskStatus[] = ['Pending', 'In Progress', 'Waiting On Client', 'Completed', 'Cancelled']

const statusColors: Record<TaskStatus, string> = {
  'Pending': 'bg-yellow-500/20 text-yellow-400',
  'In Progress': 'bg-blue-500/20 text-blue-400',
  'Waiting On Client': 'bg-purple-500/20 text-purple-400',
  'Completed': 'bg-[var(--accent-lime)]/20 text-[var(--accent-lime)]',
  'Cancelled': 'bg-gray-500/20 text-gray-400',
}

const priorityColors: Record<string, string> = {
  'Urgent': 'border-l-4 border-l-red-500',
  'High': 'border-l-4 border-l-orange-500',
  'Medium': 'border-l-4 border-l-yellow-500',
  'Low': 'border-l-4 border-l-blue-500',
}

export default function AdminTasksPage() {
  const supabase = createClientComponentClient()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchTasks()
  }, [])

  async function fetchTasks() {
    setLoading(true)

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setTasks(data)
    }

    setLoading(false)
  }

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter(task => task.status === status)
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Tasks</h1>
        <Link
          href="/admin/tasks/new"
          className="rounded-full bg-[var(--accent-orange)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)]"
        >
          + New Task
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <SvgIcon name="search" size={16} color="var(--text-muted)" className="absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] pl-10 pr-4 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {statusColumns.map((status) => (
          <div key={status} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white">{status}</span>
              <span className="rounded-full bg-[var(--bg-navy-mid)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                {getTasksByStatus(status).length}
              </span>
            </div>

            <div className="space-y-2">
              {getTasksByStatus(status)
                .filter(task => task.title.toLowerCase().includes(search.toLowerCase()))
                .map((task) => (
                  <Link
                    key={task.id}
                    href={`/admin/tasks/${task.id}`}
                    className={`block rounded-lg bg-[var(--bg-navy-mid)] p-3 transition hover:bg-[var(--bg-navy-mid)]/50 ${priorityColors[task.priority] || ''}`}
                  >
                    <p className="text-sm font-medium text-white">{task.title}</p>
                    {task.description && (
                      <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2">{task.description}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[task.status as TaskStatus]}`}>
                        {task.status}
                      </span>
                      {task.due_date && (
                        <span className="text-xs text-[var(--text-muted)]">
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}

              {getTasksByStatus(status).filter(task => task.title.toLowerCase().includes(search.toLowerCase())).length === 0 && (
                <p className="py-4 text-center text-xs text-[var(--text-muted)]">No tasks</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}