// Mocks to avoid Firebase Admin initialization at import time
jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(() => ({})),
  applicationDefault: jest.fn(() => ({})),
  cert: jest.fn(() => ({})),
}))
jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({ verifyIdToken: jest.fn() })),
}))
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({ collection: jest.fn(() => ({ limit: jest.fn(() => ({ get: jest.fn(async () => ({ docs: [] })) })) })) })),
  Timestamp: { now: jest.fn(() => 'ts-now' as any), fromDate: jest.fn(() => 'ts-from' as any) },
  FieldValue: { serverTimestamp: jest.fn(() => 'server-ts' as any) },
}))

// Mock rolesService functions used by routes
jest.mock('../../services/rolesService', () => ({
  __esModule: true,
  listRoles: jest.fn(),
  getRoleById: jest.fn(),
  createRole: jest.fn(),
  updateRole: jest.fn(),
  deleteRole: jest.fn(),
}))

import request from 'supertest'
import app from '../../app'
import { listRoles as listRolesFn, getRoleById as getRoleByIdFn } from '../../services/rolesService'

describe('roles routes - list and detail', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET /api/roles should return items and pass parsed query params to listRoles', async () => {
    const items = [{ id: '1', title: 'Role 1' }]
    ;(listRolesFn as unknown as jest.Mock).mockResolvedValue(items)

    const res = await request(app).get(
      '/api/roles?state=SP&city=SaoPaulo&order=asc&limit=5&page=2&status=published&startFrom=2024-01-01T00:00:00.000Z'
    )

    expect(res.status).toBe(200)
    expect(res.body).toEqual(items)
    const callArg = ((listRolesFn as unknown as jest.Mock).mock.calls[0] as any[])[0]
    expect(callArg).toEqual(
      expect.objectContaining({
        state: 'SP',
        city: 'SaoPaulo',
        status: 'published',
        orderBy: 'startTime',
        order: 'asc',
        limit: 5,
        page: 2,
      })
    )
    expect(callArg.startFrom).toBeInstanceOf(Date)
  })

  it('GET /api/roles should handle errors from service via errorHandler', async () => {
    ;(listRolesFn as unknown as jest.Mock).mockRejectedValue({ status: 500, message: 'Boom', code: 'X' })

    const res = await request(app).get('/api/roles')

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'Boom', code: 'X' })
  })

  it('GET /api/roles/:id should return 404 when not found', async () => {
    ;(getRoleByIdFn as unknown as jest.Mock).mockResolvedValue(undefined)

    const res = await request(app).get('/api/roles/unknown-id')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Role not found' })
  })
})