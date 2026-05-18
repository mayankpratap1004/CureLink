'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Building2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { StatusBadge } from '@/components/shared/status-badge'
import { TableSkeleton } from '@/components/shared/loading-skeleton'
import { useCurrentUser } from '@/hooks/use-current-user'
import { createClient } from '@/lib/supabase/client'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const PRESET_COLORS = [
  '#6366f1', '#ef4444', '#f59e0b', '#10b981',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
]

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  color: z.string().min(1, 'Color is required'),
})

type FormInput = z.infer<typeof schema>

interface Department {
  id: string
  name: string
  description: string | null
  color: string
  is_active: boolean
  tenant_id: string
}

export default function DepartmentsPage() {
  const { user } = useCurrentUser()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(schema) as any,
    defaultValues: { color: '#6366f1' },
  })

  const selectedColor = watch('color')

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function fetchDepartments() {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('departments')
      .select('*')
      .eq('tenant_id', user.tenant_id)
      .is('deleted_at', null)
      .order('name')
    setDepartments(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (user) fetchDepartments()
  }, [user])

  async function onSubmit(values: FormInput) {
    if (!user) return
    setSaving(true)
    const supabase = createClient()

    if (editingId) {
      const { error } = await supabase
        .from('departments')
        .update(values)
        .eq('id', editingId)
        .eq('tenant_id', user.tenant_id)
      if (error) showToast(error.message, 'error')
      else showToast('Department updated', 'success')
    } else {
      const { error } = await supabase
        .from('departments')
        .insert({ ...values, tenant_id: user.tenant_id })
      if (error) showToast(error.message, 'error')
      else showToast('Department created', 'success')
    }

    setSaving(false)
    setShowForm(false)
    setEditingId(null)
    reset()
    fetchDepartments()
  }

  function openEdit(dept: Department) {
    setEditingId(dept.id)
    reset({ name: dept.name, description: dept.description ?? '', color: dept.color })
    setShowForm(true)
  }

  async function handleDelete() {
    if (!deleteId || !user) return
    const supabase = createClient()
    await supabase
      .from('departments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', deleteId)
      .eq('tenant_id', user.tenant_id)
    showToast('Department deleted', 'success')
    setDeleteId(null)
    fetchDepartments()
  }

  async function toggleStatus(dept: Department) {
    if (!user) return
    const supabase = createClient()
    await supabase
      .from('departments')
      .update({ is_active: !dept.is_active })
      .eq('id', dept.id)
    showToast(`Department ${dept.is_active ? 'deactivated' : 'activated'}`, 'success')
    fetchDepartments()
  }

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}

      <PageHeader
        title="Departments"
        description="Manage hospital departments and specialties"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Departments' }]}
        action={
          <button
            onClick={() => { setShowForm(true); setEditingId(null); reset({ color: '#6366f1' }) }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Department
          </button>
        }
      />

      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4">
              {editingId ? 'Edit Department' : 'New Department'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Name</label>
                <input
                  {...register('name')}
                  placeholder="e.g. Cardiology"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Description (optional)</label>
                <textarea
                  {...register('description')}
                  placeholder="Brief description..."
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setValue('color', color)}
                      className={`w-7 h-7 rounded-full transition-all ${
                        selectedColor === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={e => setValue('color', e.target.value)}
                    className="w-7 h-7 rounded-full cursor-pointer border-0 p-0"
                    title="Custom color"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Department"
        description="This will permanently delete the department. Doctors assigned to it will be unassigned."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {loading ? (
        <TableSkeleton rows={4} />
      ) : departments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState
            icon={Building2}
            title="No departments yet"
            description="Add your first department to start organizing your hospital."
            action={
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg"
              >
                <Plus className="w-4 h-4" /> Add Department
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(dept => (
            <div key={dept.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: dept.color + '20' }}
                  >
                    <Building2 className="w-5 h-5" style={{ color: dept.color }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">{dept.name}</h3>
                    <StatusBadge
                      label={dept.is_active ? 'Active' : 'Inactive'}
                      variant={dept.is_active ? 'success' : 'neutral'}
                    />
                  </div>
                </div>
              </div>

              {dept.description && (
                <p className="text-xs text-slate-500 mb-4 line-clamp-2">{dept.description}</p>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => toggleStatus(dept)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  title={dept.is_active ? 'Deactivate' : 'Activate'}
                >
                  {dept.is_active
                    ? <ToggleRight className="w-4 h-4 text-green-500" />
                    : <ToggleLeft className="w-4 h-4" />
                  }
                </button>
                <button
                  onClick={() => openEdit(dept)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteId(dept.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
