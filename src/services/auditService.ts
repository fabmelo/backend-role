import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getApp } from 'firebase-admin/app'
import { env } from '../config/env'
import pino from 'pino'

const db = env.FIRESTORE_DB_ID ? getFirestore(getApp(), env.FIRESTORE_DB_ID) : getFirestore()
const logger = pino()
const AUDIT_COLLECTION = 'audit_logs'

export type AuditEvent = {
  action: 'role_create' | 'role_update' | 'role_delete'
  uid: string
  roleId?: string
  before?: Record<string, any> | null
  after?: Record<string, any> | null
  createdAt: FirebaseFirestore.Timestamp
}

/**
 * Persist an audit log for sensitive actions.
 */
export async function logAudit(event: Omit<AuditEvent, 'createdAt'>): Promise<void> {
  const payload: AuditEvent = { ...event, createdAt: Timestamp.now() }
  try {
    await db.collection(AUDIT_COLLECTION).add(payload)
    logger.info({ audit: payload }, 'Audit event stored')
  } catch (err) {
    // Do not break application flow because of audit failures
    logger.warn({ err, audit: payload }, 'Failed to store audit event')
  }
}