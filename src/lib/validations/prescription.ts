import { z } from 'zod'

export const medicineSchema = z.object({
  name:         z.string().min(1, 'Medicine name required'),
  dosage:       z.string().min(1, 'Dosage required'),
  frequency:    z.string().min(1, 'Frequency required'),
  duration:     z.string().min(1, 'Duration required'),
  instructions: z.string().optional(),
  quantity:     z.string().optional(),
})

export const createPrescriptionSchema = z.object({
  appointment_id: z.string().uuid('Appointment required'),
  patient_id:     z.string().uuid(),
  doctor_id:      z.string().uuid(),
  diagnosis:      z.string().min(1, 'Diagnosis required'),
  medicines:      z.array(medicineSchema).min(1, 'At least one medicine required'),
  instructions:   z.string().optional(),
  follow_up_date: z.string().optional(),
})

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>
export type Medicine                = z.infer<typeof medicineSchema>