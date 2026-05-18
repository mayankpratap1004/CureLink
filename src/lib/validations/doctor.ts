import { z } from 'zod'

export const createDoctorSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'Invalid phone number'),
  specialization: z.string().min(2, 'Specialization is required'),
  license_number: z.string().min(3, 'License number is required'),
  qualification: z.string().optional(),
  experience_years: z.coerce.number().min(0).max(60).default(0),
  consultation_fee: z.coerce.number().min(0, 'Fee must be positive'),
  avg_consultation_min: z.coerce.number().min(5).max(120).default(15),
  department_id: z.string().uuid().optional(),
  bio: z.string().max(1000).optional(),
})

export const updateDoctorSchema = createDoctorSchema.partial()

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>