export type Role = 'admin' | 'doctor' | 'receptionist' | 'patient'

export type AppointmentStatus =
  | 'scheduled' | 'confirmed' | 'checked_in'
  | 'in_consultation' | 'completed' | 'cancelled' | 'no_show'

export type QueueStatus = 'waiting' | 'called' | 'in_progress' | 'completed' | 'skipped'

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled'

export interface Tenant {
  id: string
  name: string
  slug: string
  plan: 'starter' | 'growth' | 'enterprise'
  is_active: boolean
  settings: Record<string, unknown>
}

export interface CurrentUser {
  id: string
  tenant_id: string
  full_name: string
  email: string
  avatar_url: string | null
  role: Role
  permissions: Record<string, boolean>
}

export interface Department {
  id: string
  tenant_id: string
  name: string
  color: string
  is_active: boolean
}

export interface Doctor {
  id: string
  tenant_id: string
  user_id: string
  department_id: string | null
  full_name: string
  specialization: string
  license_number: string
  consultation_fee: number
  avg_consultation_min: number
  is_active: boolean
  department?: Department
}

export interface Patient {
  id: string
  tenant_id: string
  patient_code: string
  full_name: string
  date_of_birth: string | null
  gender: 'male' | 'female' | 'other' | null
  blood_group: string | null
  phone: string
  email: string | null
  is_active: boolean
}

export interface Appointment {
  id: string
  tenant_id: string
  patient_id: string
  doctor_id: string
  appointment_date: string
  slot_start: string
  slot_end: string
  status: AppointmentStatus
  token_number: number | null
  patient?: Patient
  doctor?: Doctor
}

export interface QueueEntry {
  id: string
  tenant_id: string
  appointment_id: string
  patient_id: string
  doctor_id: string
  queue_date: string
  token_number: number
  status: QueueStatus
  priority: number
  checked_in_at: string
  called_at: string | null
  patient?: Patient
  appointment?: Appointment
}

export interface PaginatedResult<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }