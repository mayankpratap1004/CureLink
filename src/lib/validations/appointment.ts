import { z } from 'zod'

export const createAppointmentSchema = z.object({
  patient_id:       z.string().uuid('Invalid patient'),
  doctor_id:        z.string().uuid('Invalid doctor'),
  department_id:    z.string().uuid().optional(),
  appointment_date: z.string().min(1, 'Date is required'),
  slot_start:       z.string().min(1, 'Start time is required'),
  slot_end:         z.string().min(1, 'End time is required'),
  type:             z.enum(['consultation','follow_up','emergency','procedure']).default('consultation'),
  notes:            z.string().max(500).optional(),
})

export const updateStatusSchema = z.object({
  appointment_id: z.string().uuid(),
  status: z.enum([
    'scheduled','confirmed','checked_in',
    'in_consultation','completed','cancelled','no_show'
  ]),
  cancellation_reason: z.string().optional(),
})

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>
export type UpdateStatusInput      = z.infer<typeof updateStatusSchema>