import { createRole, updateRole, deleteRole } from '../../services/rolesService'

// Mock firebase-admin app
jest.mock('firebase-admin/app', () => ({
  getApp: jest.fn(() => ({})),
}))

// Firestore mocks implemented within the mock factory to avoid hoisting issues
jest.mock('firebase-admin/firestore', () => {
  // local state for this mocked module
  const state: { lastAddedData: any } = { lastAddedData: null }
  const queryMock: any = {
    where: jest.fn(() => queryMock),
    orderBy: jest.fn(() => queryMock),
    startAfter: jest.fn(() => queryMock),
    limit: jest.fn(() => queryMock),
    get: jest.fn(async () => ({ docs: [] })),
  }
  const updateMock = jest.fn(async () => {})
  const deleteMock = jest.fn(async () => {})
  const addMock = jest.fn(async (data: any) => {
    state.lastAddedData = data
    return {
      id: 'new-id',
      get: jest.fn(async () => ({ exists: true, id: 'new-id', data: jest.fn(() => state.lastAddedData) })),
    }
  })
  const collectionMock = jest.fn((_name: string) => ({
    add: addMock,
    doc: (_id: string) => ({
      get: jest.fn(async () => {
        const behavior = (global as any).__rs_doc_behavior || 'notFound'
        if (behavior === 'forbidden') {
          return { exists: true, data: jest.fn(() => ({ authorId: 'other' })) }
        }
        if (behavior === 'created') {
          return { exists: true, id: 'new-id', data: jest.fn(() => state.lastAddedData) }
        }
        return { exists: false }
      }),
      update: updateMock,
      delete: deleteMock,
    }),
    where: jest.fn(() => queryMock),
  }))
  return {
    getFirestore: jest.fn(() => ({ collection: collectionMock })),
    Timestamp: { now: jest.fn(() => 'ts-now' as any), fromDate: jest.fn(() => 'ts-from' as any) },
    FieldValue: { serverTimestamp: jest.fn(() => 'server-ts' as any) },
  }
})

// Mock audit service to observe calls
jest.mock('../../services/auditService', () => ({
  __esModule: true,
  logAudit: jest.fn(async () => {}),
}))
import { logAudit as logAuditFn } from '../../services/auditService'

describe('rolesService business logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global as any).__rs_doc_behavior = 'notFound'
  })

  it('createRole should add document and call logAudit', async () => {
    const result = await createRole('uid-1', {
      title: 'Trail Run',
      state: 'SP',
      city: 'SaoPaulo',
      distanceKm: 10.0,
      startTime: new Date('2024-01-01T10:00:00Z'),
      toleranceMin: 15,
      meetingPoint: 'Park Entrance',
      description: 'Training role',
    })
    expect(result.id).toBe('new-id')
    expect(logAuditFn).toHaveBeenCalled()
    const call = ((logAuditFn as unknown as jest.Mock).mock.calls[0] as any[])[0]
    expect(call).toEqual(expect.objectContaining({ action: 'role_create', uid: 'uid-1', roleId: 'new-id' }))
  })

  it('updateRole should throw 403 when user is not author', async () => {
    ;(global as any).__rs_doc_behavior = 'forbidden'
    await expect(updateRole('uid-1', 'role-1', { title: 'New' })).rejects.toEqual(expect.objectContaining({ status: 403 }))
  })

  it('deleteRole should throw 404 when document does not exist', async () => {
    ;(global as any).__rs_doc_behavior = 'notFound'
    await expect(deleteRole('uid-1', 'role-1')).rejects.toEqual(expect.objectContaining({ status: 404 }))
  })
})