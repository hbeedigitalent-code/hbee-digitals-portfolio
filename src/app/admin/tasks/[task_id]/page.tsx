'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'
import { TaskStatus, TaskPriority } from '@/types/admin-crm'

interface Task {
  id: string
  title: string
  description: string
  client_id: string | null
  project_id: string | null
  lead_id: string | null
  assigned_to: string | null
  priority: string
  status: string
  due_date: string
  created_at: string
  completed_at: string | null
}

const statusOptions: TaskStatus[] = ['Pending', 'In Progress', 'Waiting On Client', 'Completed', 'Cancelled']
const priorityOptions: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent']

const statusColors: Record<TaskStatus, string> = {
  'Pending': 'bg-yellow-500/20 text-yellow-400',
  'In Progress': 'bg-blue-500/20 text-blue-400',
  'Waiting On Client': 'bg-purple-500/20 text-purple-400',
  'Completed': 'bg-[var(--accent-lime)]/20 text-[var(--accent-lime)]',
  'Cancelled': 'bg-gray-500/20 text-gray-400',
}

export default function AdminTaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchTask()
  }, [params.task_id])

  async function fetchTask() {
    setLoading(true)

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', params.task_id)
      .single()

    if (error || !data) {
      router.push('/admin/tasks')
      return
    }

    setTask(data)
    setLoading(false)
  }

  async function updateTask(field: string, value: any) {
    if (!task) return

    setUpdating(true)

    const { error } = await supabase
      .from('tasks')
      .update({ [field]: value })
      .eq('id', task.id)

    if (!error) {
      setTask({ ...task, [field]: value })
    }

    setUpdating(false)
  }

  async function completeTask() {
    if (!task) return

    setUpdating(true)

    const { error } = await supabase
      .from('tasks')
      .update({
        status: 'Completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', task.id)

    if (!error) {
      setTask({ ...task, status: 'Completed', completed_at: new Date().toISOString() })
    }

    setUpdating(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-muted)]">Task not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/tasks"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-white transition"
          >
            <SvgIcon name="chevron-left" size={16} color="currentColor" />
            Back to Tasks
          </Link>
          <h1 className="text-2xl font-bold text-white mt-2">
            {task.title}
          </h1>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[task.status as TaskStatus]}`}>
          {task.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Task Management */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Task Management</h3>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Status</label>
                <select
                  value={task.status}
                  onChange={(e) => updateTask('status', e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Priority</label>
                <select
                  value={task.priority}
                  onChange={(e) => updateTask('priority', e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                >
                  {priorityOptions.map((priority) => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Due Date</label>
                <input
                  type="date"
                  value={task.due_date || ''}
                  onChange={(e) => updateTask('due_date', e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                />
              </div>

              {task.status !== 'Completed' && (
                <button
                  onClick={completeTask}
                  disabled={updating}
                  className="w-full rounded-full bg-[var(--accent-lime)] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-lime)]/80 disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Mark as Completed'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Task Info */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Task Details</h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-[var(--text-muted)]">Title</p>
                <p className="text-sm text-white">{task.title}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Priority</p>
                <p className="text-sm text-white">{task.priority}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-[var(--text-muted)]">Description</p>
                <p className="text-sm text-white">{task.description || 'No description'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Created</p>
                <p className="text-sm text-white">{new Date(task.created_at).toLocaleDateString()}</p>
              </div>
              {task.completed_at && (
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Completed</p>
                  <p className="text-sm text-white">{new Date(task.completed_at).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}