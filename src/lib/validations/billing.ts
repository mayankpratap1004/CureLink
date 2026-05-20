import { z } from 'zod'

export const lineItemSchema = z.object({
  description: z.string().min(1, 'Description required'),
  quantity:    z.coerce.number().min(1).default(1),
  unit_price:  z.coerce.number().min(0),
  total:       z.coerce.number().min(0),
})

export const createInvoiceSchema = z.object({
  patient_id:     z.string().uuid('Patient required'),
  appointment_id: z.string().uuid().optional(),
  line_items:     z.array(lineItemSchema).min(1, 'At least one item required'),
  discount:       z.coerce.number().min(0).default(0),
  tax:            z.coerce.number().min(0).default(0),
  notes:          z.string().optional(),
  due_date:       z.string().optional(),
  payment_method: z.string().optional(),
})

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type LineItem           = z.infer<typeof lineItemSchema>