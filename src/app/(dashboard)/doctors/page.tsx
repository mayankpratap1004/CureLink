import { getCurrentUser } from '@/services/auth.service'
import { getDoctors } from '@/services/doctor.service'
import { getDepartments } from '@/services/department.service'
import { DoctorsClient } from './doctors-client'

export default async function DoctorsPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const [doctors, departments] = await Promise.all([
    getDoctors(user.tenant_id),
    getDepartments(user.tenant_id),
  ])

  return <DoctorsClient doctors={doctors} departments={departments} tenantId={user.tenant_id} />
}