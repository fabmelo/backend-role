import { Router } from 'express'
import { getFirestore } from 'firebase-admin/firestore'
import { getApp } from 'firebase-admin/app'
import { env } from '../config/env'

const router = Router()
const db = env.FIRESTORE_DB_ID ? getFirestore(getApp(), env.FIRESTORE_DB_ID) : getFirestore()

// Simple base diagnostics endpoint
router.get('/', (_req, res) => {
  res.json({ status: 'ok' })
})

// Simple Firestore connectivity diagnostics
router.get('/firestore', async (_req, res, next) => {
  try {
    // attempt a lightweight query on a known collection
    const snapshot = await db.collection('roles').limit(1).get()
    const ok = true
    res.json({ ok, count: snapshot.size })
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message, code: err?.code })
  }
})

export const diagRoutes = router