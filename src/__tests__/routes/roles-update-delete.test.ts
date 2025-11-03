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
import { updateRole as updateRoleFn, deleteRole as deleteRoleFn } from '../../services/rolesService'

describe('roles routes - update and delete', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    verifyIdTokenMock.mockResolvedValue({ uid: 'author-1' })
  })

  it('PUT /api/roles/:id should return 200 on success', async () => {
    ;(updateRoleFn as unknown as jest.Mock).mockResolvedValue({ id: 'r1', title: 'Updated' })
    const res = await request(app)
      .put('/api/roles/r1')
      .set('Authorization', 'Bearer tok')
      .send({ title: 'Updated' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ id: 'r1', title: 'Updated' })
  })

  it('PUT /api/roles/:id should return 400 on validation error', async () => {
    // No need to mock updateRole; validation fails before calling service
    const res = await request(app)
      .put('/api/roles/r1')
      .set('Authorization', 'Bearer tok')
      .send({ title: '' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('ValidationError')
    expect(Array.isArray(res.body.details)).toBe(true)
  })

  it('PUT /api/roles/:id should propagate 403 from service', async () => {
    ;(updateRoleFn as unknown as jest.Mock).mockRejectedValue({ status: 403, message: 'Forbidden' })
    const res = await request(app)
      .put('/api/roles/r1')
      .set('Authorization', 'Bearer tok')
      .send({ title: 'Updated' })

    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'Forbidden', code: undefined })
  })

  it('DELETE /api/roles/:id should return 204 on success', async () => {
    ;(deleteRoleFn as unknown as jest.Mock).mockResolvedValue(undefined)
    const res = await request(app)
      .delete('/api/roles/r1')
      .set('Authorization', 'Bearer tok')

    expect(res.status).toBe(204)
    expect(res.text).toBe('')
  })

  it('DELETE /api/roles/:id should return 404 when not found', async () => {
    ;(deleteRoleFn as unknown as jest.Mock).mockRejectedValue({ status: 404, message: 'Not found' })
    const res = await request(app)
      .delete('/api/roles/unknown')
      .set('Authorization', 'Bearer tok')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Not found', code: undefined })
  })
})