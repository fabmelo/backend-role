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

// Mock pino as a singleton instance to verify .info calls
jest.mock('pino', () => {
  const instance = { info: jest.fn() }
  return () => instance
})
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pinoMod = require('pino')()

// Firestore mock: metrics collection add
const addMock = jest.fn(async (_payload: any) => {})
const collectionMock = jest.fn(() => ({ add: addMock }))
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({ collection: collectionMock })),
  Timestamp: { now: jest.fn(() => 'ts-now' as any) },
}))

import request from 'supertest'
import app from '../../app'

describe('metrics routes - web vitals', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('POST /api/metrics/web-vitals should persist metric and return 201', async () => {
    const payload = {
      name: 'LCP',
      value: 2500,
      id: 'id-123',
      delta: 100,
      rating: 'good',
      navigationType: 'navigate',
      url: 'https://example.test/roles',
      userAgent: 'UA',
    }
    const res = await request(app).post('/api/metrics/web-vitals').send(payload)
    expect(res.status).toBe(201)
    expect(res.body).toEqual({ ok: true })
    expect(collectionMock).toHaveBeenCalledWith('metrics_web_vitals')
    expect(addMock).toHaveBeenCalled()
    expect(pinoMod.info).toHaveBeenCalled()
  })

  it('POST /api/metrics/web-vitals should return 400 on invalid payload', async () => {
    const bad = { value: 'not-a-number', id: '' }
    const res = await request(app).post('/api/metrics/web-vitals').send(bad as any)
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'InvalidMetricPayload' })
    // No write should happen
    expect(addMock).not.toHaveBeenCalled()
  })
})