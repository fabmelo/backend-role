import request from 'supertest'

// Mock Firestore to avoid real writes and allow failure simulation
const addMock = jest.fn(async () => ({}))
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({ add: addMock })),
  })),
  Timestamp: { now: () => ({}) },
}))
jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(() => ({})),
  applicationDefault: jest.fn(() => ({})),
  cert: jest.fn(() => ({})),
  getApp: jest.fn(() => ({})),
}))
// Avoid initializing real Firebase Auth in app.ts import
jest.mock('../../config/firebaseAdmin', () => ({ adminAuth: {} }))

import app from '../../app'

describe('POST /api/metrics/web-vitals', () => {
  it('deve validar payload e retornar 400 quando inválido', async () => {
    const res = await request(app)
      .post('/api/metrics/web-vitals')
      .send({ name: '', value: 'invalid', id: '' })
      .expect(400)
    expect(res.body).toEqual(expect.objectContaining({ error: 'InvalidMetricPayload' }))
  })

  it('deve aceitar payload válido e responder 201', async () => {
    const res = await request(app)
      .post('/api/metrics/web-vitals')
      .send({ name: 'CLS', value: 0.12, id: 'abc123' })
      .expect(201)
    expect(res.body).toEqual({ ok: true })
    expect(addMock).toHaveBeenCalledTimes(1)
  })

  it('deve delegar ao errorHandler quando persistência falha', async () => {
    addMock.mockRejectedValueOnce(new Error('db fail'))
    const res = await request(app)
      .post('/api/metrics/web-vitals')
      .send({ name: 'LCP', value: 2.5, id: 'xyz789' })
      .expect(500)
    expect(res.body).toEqual(expect.objectContaining({ error: 'db fail' }))
  })
})