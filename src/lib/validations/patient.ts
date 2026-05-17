import { z } from 'zod'

export const createPatientSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().min(10, 'Invalid phone number'),
  email: z.string().email().optional().or(z.literal('')),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  blood_group: z.enum(['A+','A-','B+','B-','AB+','AB-','O+','O-']).optional(),
  address: z.string().max(500).optional(),
  emergency_contact: z.string().max(100).optional(),
  emergency_phone: z.string().optional(),
  allergies: z.array(z.string()).optional(),
})

export const updatePatientSchema = createPatientSchema.partial()

export type CreatePatientInput = z.infer<typeof createPatientSchema>
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>