import { z } from 'zod'

// Schema de criação de Rôle conforme especificação técnica
export const RoleCreateSchema = z.object({
  title: z.string().min(1).max(120),
  state: z.string().min(2).max(2), // UF
  city: z.string().min(1),
  distanceKm: z.number().nonnegative().refine((v) => Number(v.toFixed(2)) === v, {
    message: 'distanceKm deve ter no máximo 2 casas decimais',
  }),
  startTime: z.string().datetime().or(z.date()),
  toleranceMin: z.number().int().min(0).max(120),
  meetingPoint: z.string().min(1),
  description: z.string().optional(),
  routeMapUrl: z.string().url().optional(),
  status: z.enum(['scheduled', 'canceled', 'done']).optional(),
})

// Schema de atualização: permite campos parciais
export const RoleUpdateSchema = RoleCreateSchema.partial().extend({
  status: z.enum(['scheduled', 'canceled', 'done']).optional(),
})

export type RoleCreateInput = z.infer<typeof RoleCreateSchema>
export type RoleUpdateInput = z.infer<typeof RoleUpdateSchema>