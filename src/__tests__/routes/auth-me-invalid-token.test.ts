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
// Mock Firebase Admin to simulate token verification failure
jest.mock('../../config/firebaseAdmin', () => ({
  adminAuth: {
    verifyIdToken: jest.fn(async () => { throw new Error('bad token') }),
    getUser: jest.fn(),
  },
}))
import app from '../../app'

describe('GET /api/auth/me com token inválido', () => {
  it('deve responder 401 quando verifyIdToken falha', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401)

    expect(res.body).toEqual(expect.objectContaining({ error: 'Invalid or expired token' }))
  })
})