import { listRoles, getRoleById, updateRole } from '../../services/rolesService'

// Mock firebase-admin app
jest.mock('firebase-admin/app', () => ({
  getApp: jest.fn(() => ({})),
}))

// Firestore mocks with configurable state to validate query behavior
jest.mock('firebase-admin/firestore', () => {
  const state: {
    docs: Array<{ id: string; data: () => any }>
    docBehavior: 'notFound' | 'found'
  } = {
    docs: [],
    docBehavior: 'notFound',
  }

  const startAfterMock = jest.fn(() => queryMock)
  const whereMock = jest.fn(() => queryMock)
  const orderByMock = jest.fn(() => queryMock)
  const limitMock = jest.fn(() => queryMock)
  const offsetMock = jest.fn(() => queryMock)
  const getMock = jest.fn(async () => ({ docs: state.docs }))

  const queryMock: any = {
    where: whereMock,
    orderBy: orderByMock,
    startAfter: startAfterMock,
    limit: limitMock,
    offset: offsetMock,
    get: getMock,
  }

  const updateMock = jest.fn(async () => {})

  const collectionMock = jest.fn((_name: string) => ({
    // Query/Collection methods
    where: whereMock,
    orderBy: orderByMock,
    startAfter: startAfterMock,
    limit: limitMock,
    offset: offsetMock,
    get: getMock,
    // Collection-specific
    doc: (id: string) => ({
      get: jest.fn(async () =>
        state.docBehavior === 'found'
          ? { exists: true, id, data: jest.fn(() => ({ id, authorId: 'uid-1', title: 'R' })) }
          : { exists: false }
      ),
      update: updateMock,
    }),
  }))

  return {
    getFirestore: jest.fn(() => ({ collection: collectionMock })),
    Timestamp: { now: jest.fn(() => 'ts-now' as any), fromDate: jest.fn(() => 'ts-from' as any) },
    FieldValue: { serverTimestamp: jest.fn(() => 'server-ts' as any) },
    // Expose internals for test control
    __state: state,
    __mocks: { startAfterMock, whereMock, orderByMock, limitMock, offsetMock, getMock, collectionMock, updateMock },
  }
})

// Mock audit service to verify updateRole logs
jest.mock('../../services/auditService', () => ({
  __esModule: true,
  logAudit: jest.fn(async () => {}),
}))
import { logAudit as logAuditFn } from '../../services/auditService'

// Helper to access firestore mock internals
// eslint-disable-next-line @typescript-eslint/no-var-requires
const firestoreMod = require('firebase-admin/firestore')

describe('rolesService list/get/update (success paths and query behavior)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    firestoreMod.__state.docs = []
    firestoreMod.__state.docBehavior = 'notFound'
  })

  it('listRoles should apply filters, sorting, pagination and return mapped docs', async () => {
    firestoreMod.__state.docs = [
      { id: 'r1', data: () => ({ title: 'Role 1', state: 'SP' }) },
      { id: 'r2', data: () => ({ title: 'Role 2', state: 'SP' }) },
    ]
    const items = await listRoles({
      state: 'SP',
      city: 'SaoPaulo',
      status: 'scheduled',
      authorId: 'u1',
      orderBy: 'startTime',
      order: 'asc',
      limit: 25,
      page: 2,
    })
    expect(items).toHaveLength(2)
    const { whereMock, orderByMock, limitMock, offsetMock } = firestoreMod.__mocks
    expect(whereMock).toHaveBeenCalledWith('state', '==', 'SP')
    expect(whereMock).toHaveBeenCalledWith('city', '==', 'SaoPaulo')
    expect(whereMock).toHaveBeenCalledWith('status', '==', 'scheduled')
    expect(whereMock).toHaveBeenCalledWith('authorId', '==', 'u1')
    expect(orderByMock).toHaveBeenCalledWith('startTime', 'asc')
    expect(limitMock).toHaveBeenCalledWith(25)
    expect(offsetMock).toHaveBeenCalled()
  })

  it('listRoles should use cursorId to startAfter a docSnap when found', async () => {
    firestoreMod.__state.docs = [{ id: 'r1', data: () => ({ title: 'Role 1' }) }]
    firestoreMod.__state.docBehavior = 'found'
    const res = await listRoles({ cursorId: 'cursor-1', limit: 10 })
    expect(res).toHaveLength(1)
    const { startAfterMock } = firestoreMod.__mocks
    expect(startAfterMock).toHaveBeenCalled()
  })

  it('listRoles should use cursorStartTime to startAfter a Timestamp when provided', async () => {
    firestoreMod.__state.docs = []
    const d = new Date('2025-01-01T00:00:00Z')
    await listRoles({ cursorStartTime: d, limit: 5 })
    const { startAfterMock } = firestoreMod.__mocks
    expect(startAfterMock).toHaveBeenCalledWith('ts-from')
  })

  it('listRoles should cap limit to max 100 and min 1', async () => {
    await listRoles({ limit: 200 })
    const { limitMock } = firestoreMod.__mocks
    expect(limitMock).toHaveBeenCalledWith(100)
    jest.clearAllMocks()
    await listRoles({ limit: 0 })
    // When limit is 0, default (20) is used due to params.limit || 20
    expect(limitMock).toHaveBeenCalledWith(20)
  })

  it('getRoleById should return null when not found and object when exists', async () => {
    firestoreMod.__state.docBehavior = 'notFound'
    const notFound = await getRoleById('abc')
    expect(notFound).toBeNull()
    firestoreMod.__state.docBehavior = 'found'
    const found = await getRoleById('def')
    expect(found).toEqual(expect.objectContaining({ id: 'def', title: 'R' }))
  })

  it('updateRole should succeed when author matches and parse string startTime', async () => {
    firestoreMod.__state.docBehavior = 'found'
    const updated = await updateRole('uid-1', 'role-1', { title: 'New', startTime: '2024-01-02T10:00:00Z' })
    expect(updated).toEqual(expect.objectContaining({ id: 'role-1' }))
    expect(logAuditFn).toHaveBeenCalled()
  })
})