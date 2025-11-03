import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authMiddleware } from '../middlewares/auth'
import { RoleCreateSchema, RoleUpdateSchema } from '../validators/roleValidator'
import { createRole, deleteRole, getRoleById, listRoles, updateRole } from '../services/rolesService'

/**
 * Roles Routes (CRUD)
 * - GET /api/roles           -> Lista públicos (com filtros opcionais)
 * - GET /api/roles/:id       -> Detalhe público
 * - POST /api/roles          -> Criação (autenticado)
 * - PUT /api/roles/:id       -> Atualização (autor)
 * - DELETE /api/roles/:id    -> Remoção (autor)
 */
const router = Router()

// Stricter rate limit for write operations (per IP)
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
})

// List
router.get('/', async (req, res, next) => {
  try {
    const { state, city, order = 'desc', limit, page, status, startFrom, startTo, cursorStartTime, cursorId } =
      req.query as Record<string, string>
    const parsedLimit = limit ? Math.max(1, Math.min(100, Number(limit))) : undefined
    const parsedPage = page ? Math.max(1, Number(page)) : undefined
    const startFromDate = startFrom ? new Date(startFrom) : undefined
    const startToDate = startTo ? new Date(startTo) : undefined
    const cursorStartTimeDate = cursorStartTime ? new Date(cursorStartTime) : undefined
    const items = await listRoles({
      state,
      city,
      status: status as any,
      startFrom: startFromDate && !isNaN(startFromDate.getTime()) ? startFromDate : undefined,
      startTo: startToDate && !isNaN(startToDate.getTime()) ? startToDate : undefined,
      cursorStartTime:
        cursorStartTimeDate && !isNaN(cursorStartTimeDate.getTime()) ? cursorStartTimeDate : undefined,
      cursorId,
      orderBy: 'startTime',
      order: order === 'asc' ? 'asc' : 'desc',
      limit: parsedLimit,
      page: parsedPage,
    })
    res.json(items)
  } catch (err) {
    next(err)
  }
})

// List authenticated user's roles
router.get('/mine', authMiddleware, async (req, res, next) => {
  try {
    const { order = 'desc', limit, page, status, startFrom, startTo, cursorStartTime, cursorId } =
      req.query as Record<string, string>
    const parsedLimit = limit ? Math.max(1, Math.min(100, Number(limit))) : undefined
    const parsedPage = page ? Math.max(1, Number(page)) : undefined
    const startFromDate = startFrom ? new Date(startFrom) : undefined
    const startToDate = startTo ? new Date(startTo) : undefined
    const cursorStartTimeDate = cursorStartTime ? new Date(cursorStartTime) : undefined
    const uid = (req as any).uid as string
    const items = await listRoles({
      authorId: uid,
      status: status as any,
      startFrom: startFromDate && !isNaN(startFromDate.getTime()) ? startFromDate : undefined,
      startTo: startToDate && !isNaN(startToDate.getTime()) ? startToDate : undefined,
      cursorStartTime:
        cursorStartTimeDate && !isNaN(cursorStartTimeDate.getTime()) ? cursorStartTimeDate : undefined,
      cursorId,
      orderBy: 'startTime',
      order: order === 'asc' ? 'asc' : 'desc',
      limit: parsedLimit,
      page: parsedPage,
    })
    res.json(items)
  } catch (err) {
    next(err)
  }
})

// Detail
router.get('/:id', async (req, res, next) => {
  try {
    const item = await getRoleById(req.params.id)
    if (!item) return res.status(404).json({ error: 'Role not found' })
    res.json(item)
  } catch (err) {
    next(err)
  }
})

// Create (auth required)
router.post('/', authMiddleware, writeLimiter, async (req, res, next) => {
  try {
    const parsed = RoleCreateSchema.parse(req.body)
    const uid = (req as any).uid as string
    const created = await createRole(uid, parsed)
    res.status(201).json(created)
  } catch (err) {
    // Zod validation errors
    if ((err as any).issues) {
      return res.status(400).json({ error: 'ValidationError', details: (err as any).issues })
    }
    next(err)
  }
})

// Update (auth required, only author)
router.put('/:id', authMiddleware, writeLimiter, async (req, res, next) => {
  try {
    const parsed = RoleUpdateSchema.parse(req.body)
    const uid = (req as any).uid as string
    const updated = await updateRole(uid, req.params.id, parsed)
    res.json(updated)
  } catch (err) {
    if ((err as any).issues) {
      return res.status(400).json({ error: 'ValidationError', details: (err as any).issues })
    }
    next(err)
  }
})

// Delete (auth required, only author)
router.delete('/:id', authMiddleware, writeLimiter, async (req, res, next) => {
  try {
    const uid = (req as any).uid as string
    await deleteRole(uid, req.params.id)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

export const rolesRoutes = router