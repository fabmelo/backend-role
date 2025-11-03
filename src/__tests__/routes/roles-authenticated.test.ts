// Mocks to avoid Firebase Admin initialization at import time
jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(() => ({})),
  applicationDefault: jest.fn(() => ({})),
  cert: jest.fn(() => ({})),
}))
const verifyIdTokenMock = jest.fn()
jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({ verifyIdToken: verifyIdTokenMock })),
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
import { listRoles as listRolesFn, createRole as createRoleFn } from '../../services/rolesService'

describe('roles routes - authenticated flows', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET /api/roles/mine should use uid from auth and return items', async () => {
    verifyIdTokenMock.mockResolvedValue({ uid: 'u1' })
    ;(listRolesFn as unknown as jest.Mock).mockResolvedValue([{ id: 'r1' }])

    const res = await request(app)
      .get('/api/roles/mine')
      .set('Authorization', 'Bearer anytoken')

    expect(res.status).toBe(200)
    const callArg = ((listRolesFn as unknown as jest.Mock).mock.calls[0] as any[])[0]
    expect(callArg).toEqual(expect.objectContaining({ authorId: 'u1' }))
  })

  it('POST /api/roles should return 400 on Zod validation error', async () => {
    verifyIdTokenMock.mockResolvedValue({ uid: 'u1' })
    ;(createRoleFn as unknown as jest.Mock).mockResolvedValue({ id: 'new-id' })

    const res = await request(app)
      .post('/api/roles')
      .set('Authorization', 'Bearer token')
      .send({ title: '' }) // invalid: missing required fields and title too short

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('ValidationError')
    expect(Array.isArray(res.body.details)).toBe(true)
  })
})