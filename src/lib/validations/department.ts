import { z } from 'zod'

export const createDepartmentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color').default('#6366f1'),
})

export const updateDepartmentSchema = createDepartmentSchema.partial()

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>