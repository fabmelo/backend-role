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
// Mock Firebase Admin to avoid real dependencies
jest.mock('../../config/firebaseAdmin', () => ({
  adminAuth: {
    verifyIdToken: jest.fn(async (_t: string) => ({ uid: 'user-123' })),
    getUser: jest.fn(async (uid: string) => ({
      uid,
      email: 'user@example.com',
      displayName: 'Test User',
      phoneNumber: null,
      photoURL: null,
      emailVerified: true,
      disabled: false,
      customClaims: { role: 'tester' },
      providerData: [{ providerId: 'password', uid }],
    })),
  },
}))
import app from '../../app'

describe('GET /api/auth/me com token válido', () => {
  it('deve responder 200 e retornar dados básicos do usuário', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer valid-token')
      .expect(200)

    expect(res.body).toEqual(
      expect.objectContaining({
        uid: 'user-123',
        email: 'user@example.com',
        displayName: 'Test User',
        emailVerified: true,
      })
    )
  })
})