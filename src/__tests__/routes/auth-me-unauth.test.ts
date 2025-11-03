import request from 'supertest'
// Mock firebase-admin app and firestore to prevent diag/app initialization errors
jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(() => ({})),
  applicationDefault: jest.fn(() => ({})),
  cert: jest.fn(() => ({})),
  getApp: jest.fn(() => ({})),
}))
jest.mock('firebase-admin/firestore', () => {
  const limitMock = jest.fn(() => ({ get: jest.fn(async () => ({ size: 0 })) }))
  const collectionMock = jest.fn(() => ({ limit: limitMock }))
  return {
    getFirestore: jest.fn(() => ({ collection: collectionMock })),
    Timestamp: { now: jest.fn(() => new Date() as any) },
  }
})
// Mock adminAuth to avoid calling getAuth from firebase-admin/auth
jest.mock('../../config/firebaseAdmin', () => ({
  adminAuth: { verifyIdToken: jest.fn() },
}))
import app from '../../app'

describe('GET /api/auth/me sem token', () => {
  it('deve responder 401 quando Authorization Bearer está ausente', async () => {
    const res = await request(app).get('/api/auth/me').expect(401)
    expect(res.body).toEqual(expect.objectContaining({ error: expect.stringMatching(/Missing Authorization/i) }))
  })
})