// Mocks to avoid Firebase Admin initialization at import time
jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(() => ({})),
  applicationDefault: jest.fn(() => ({})),
  cert: jest.fn(() => ({})),
  getApp: jest.fn(() => ({})),
}))
// Mock auth to prevent real getAuth initialization inside firebaseAdmin config
jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({ verifyIdToken: jest.fn() })),
}))

// Firestore mock with success and failure controls
const getMock = jest.fn(async () => ({ size: 1 }))
const limitMock = jest.fn(() => ({ get: getMock }))
const collectionMock = jest.fn(() => ({ limit: limitMock }))
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({ collection: collectionMock })),
}))

import request from 'supertest'
import app from '../../app'

describe('diag routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET /api/_diag should return ok', async () => {
    const res = await request(app).get('/api/_diag')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('GET /api/_diag/firestore should return ok true and count from snapshot', async () => {
    getMock.mockResolvedValueOnce({ size: 2 })
    const res = await request(app).get('/api/_diag/firestore')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, count: 2 })
    expect(collectionMock).toHaveBeenCalledWith('roles')
    expect(limitMock).toHaveBeenCalledWith(1)
  })

  it('GET /api/_diag/firestore should return 500 on error with message and code', async () => {
    const err: any = new Error('Boom')
    err.code = 'permission-denied'
    getMock.mockRejectedValueOnce(err)
    const res = await request(app).get('/api/_diag/firestore')
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ ok: false, error: 'Boom', code: 'permission-denied' })
  })
})