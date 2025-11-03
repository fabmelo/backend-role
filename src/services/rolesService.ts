import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import { getApp } from 'firebase-admin/app'
import { env } from '../config/env'
import { logAudit } from './auditService'
import { RoleCreateInput, RoleUpdateInput } from '../validators/roleValidator'

// Use explicit Firestore database if provided; otherwise use the project's default database
const db = env.FIRESTORE_DB_ID ? getFirestore(getApp(), env.FIRESTORE_DB_ID) : getFirestore()
const ROLES_COLLECTION = 'roles'

export type RoleDocument = RoleCreateInput & {
  id: string
  authorId: string
  createdAt: FirebaseFirestore.Timestamp
  updatedAt: FirebaseFirestore.Timestamp
}

// Remove quaisquer campos obsoletos que não devem ser expostos pela API
function sanitizeRoleData(data: any): any {
  if (!data || typeof data !== 'object') return data
  const { images: _omitImages, ...rest } = data
  return rest
}

// Cria um rôle com authorId do usuário autenticado
function normalizeStartTime(input: { startTime?: string | Date }) {
  if (!input.startTime) return {}
  const v = input.startTime
  if (v instanceof Date) {
    return { startTime: Timestamp.fromDate(v) }
  }
  // When string, attempt to parse ISO date
  const d = new Date(v)
  if (!isNaN(d.getTime())) {
    return { startTime: Timestamp.fromDate(d) }
  }
  // Fallback: keep as-is (string)
  return { startTime: v as any }
}

export async function createRole(uid: string, data: RoleCreateInput): Promise<RoleDocument> {
  const now = Timestamp.now()
  const docRef = await db.collection(ROLES_COLLECTION).add({
    ...data,
    ...normalizeStartTime(data),
    authorId: uid,
    createdAt: now,
    updatedAt: now,
  })
  const snap = await docRef.get()
  // Audit
  const createdData = snap.data() as any
  await logAudit({ action: 'role_create', uid, roleId: docRef.id, before: null, after: createdData })
  return { id: docRef.id, ...sanitizeRoleData(createdData) } as unknown as RoleDocument
}

// Busca um rôle pelo ID
export async function getRoleById(roleId: string): Promise<RoleDocument | null> {
  const docRef = db.collection(ROLES_COLLECTION).doc(roleId)
  const snap = await docRef.get()
  if (!snap.exists) return null
  const data = snap.data() as any
  return { id: snap.id, ...sanitizeRoleData(data) } as unknown as RoleDocument
}

// Lista rôles por filtros e ordenação, com paginação simples (page/limit)
export async function listRoles(params: {
  state?: string
  city?: string
  status?: 'scheduled' | 'canceled' | 'done'
  startFrom?: Date
  startTo?: Date
  orderBy?: 'startTime'
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
  authorId?: string
  cursorStartTime?: Date
  cursorId?: string
}): Promise<RoleDocument[]> {
  let query: FirebaseFirestore.Query = db.collection(ROLES_COLLECTION)
  if (params.state) query = query.where('state', '==', params.state)
  if (params.city) query = query.where('city', '==', params.city)
  if (params.status) query = query.where('status', '==', params.status)
  if (params.authorId) query = query.where('authorId', '==', params.authorId)
  // Inequality filters on startTime require ordering by startTime
  if (params.startFrom) {
    query = query.where('startTime', '>=', Timestamp.fromDate(params.startFrom))
  }
  if (params.startTo) {
    query = query.where('startTime', '<=', Timestamp.fromDate(params.startTo))
  }
  if (params.orderBy) query = query.orderBy(params.orderBy, params.order || 'desc')
  // Cursor-based pagination preferred for Firestore performance
  if (params.cursorId) {
    const docRef = db.collection(ROLES_COLLECTION).doc(params.cursorId)
    const docSnap = await docRef.get()
    if (docSnap.exists) {
      query = query.startAfter(docSnap)
    }
  } else if (params.cursorStartTime) {
    query = query.startAfter(Timestamp.fromDate(params.cursorStartTime))
  }
  const limit = Math.min(Math.max(params.limit || 20, 1), 100)
  query = query.limit(limit)
  // Offset is less efficient; keep only for compatibility in small pages.
  if (!params.cursorId && !params.cursorStartTime && params.page && params.page > 1) {
    const offset = (params.page - 1) * limit
    query = (query as any).offset(offset)
  }
  const snap = await query.get()
  return snap.docs.map((d) => {
    const data = d.data() as any
    return { id: d.id, ...sanitizeRoleData(data) } as unknown as RoleDocument
  })
}

// Atualiza um rôle (somente autor)
export async function updateRole(uid: string, roleId: string, data: RoleUpdateInput): Promise<RoleDocument> {
  const docRef = db.collection(ROLES_COLLECTION).doc(roleId)
  const snap = await docRef.get()
  if (!snap.exists) throw Object.assign(new Error('Role not found'), { status: 404 })
  const current = snap.data() as any
  if (current.authorId !== uid) throw Object.assign(new Error('Forbidden'), { status: 403 })
  await docRef.update({ ...data, ...normalizeStartTime(data), updatedAt: FieldValue.serverTimestamp() as any })
  const updated = await docRef.get()
  // Audit
  const updatedData = updated.data() as any
  await logAudit({ action: 'role_update', uid, roleId, before: current, after: updatedData })
  return { id: updated.id, ...sanitizeRoleData(updatedData) } as unknown as RoleDocument
}

// Exclui um rôle (somente autor)
export async function deleteRole(uid: string, roleId: string): Promise<void> {
  const docRef = db.collection(ROLES_COLLECTION).doc(roleId)
  const snap = await docRef.get()
  if (!snap.exists) throw Object.assign(new Error('Role not found'), { status: 404 })
  const current = snap.data() as any
  if (current.authorId !== uid) throw Object.assign(new Error('Forbidden'), { status: 403 })
  await docRef.delete()
  // Audit
  await logAudit({ action: 'role_delete', uid, roleId, before: current, after: null })
}