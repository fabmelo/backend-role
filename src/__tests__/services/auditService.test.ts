import { logAudit } from '../../services/auditService'

// Mock firebase-admin app
jest.mock('firebase-admin/app', () => ({
  getApp: jest.fn(() => ({})),
}))

// Mock pino logger to observe info/warn calls
jest.mock('pino', () => {
  const instance = { info: jest.fn(), warn: jest.fn() }
  return () => instance
})

// Firestore mocks: simulate add success and failure
const addMock = jest.fn(async (_payload: any) => {})
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({ collection: jest.fn(() => ({ add: addMock })) })),
  Timestamp: { now: jest.fn(() => 'ts-now' as any) },
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pinoMod = require('pino')()

describe('auditService - logAudit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should store audit event and call logger.info on success', async () => {
    await logAudit({ action: 'role_create', uid: 'u1', roleId: 'r1', before: null, after: { foo: 'bar' } })
    expect(addMock).toHaveBeenCalled()
    expect(pinoMod.info).toHaveBeenCalled()
  })

  it('should not throw on failure and call logger.warn', async () => {
    addMock.mockRejectedValueOnce(new Error('fail'))
    await logAudit({ action: 'role_delete', uid: 'u2', roleId: 'r2', before: { a: 1 }, after: null })
    expect(pinoMod.warn).toHaveBeenCalled()
  })
})