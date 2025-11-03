import { Router } from 'express'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getApp } from 'firebase-admin/app'
import { env } from '../config/env'
import pino from 'pino'

const router = Router()
const db = env.FIRESTORE_DB_ID ? getFirestore(getApp(), env.FIRESTORE_DB_ID) : getFirestore()
const logger = pino()

/**
 * POST /api/metrics/web-vitals
 * Accepts Web Vitals metrics from frontend and persists to Firestore.
 * Authentication is optional; if provided, include userId.
 */
router.post('/web-vitals', async (req, res, next) => {
  try {
    const { name, value, id, delta, rating, navigationType, url, userAgent } = req.body || {}
    if (!name || typeof value !== 'number' || !id) {
      return res.status(400).json({ error: 'InvalidMetricPayload' })
    }
    const payload = {
      name,
      value,
      id,
      delta: typeof delta === 'number' ? delta : undefined,
      rating: typeof rating === 'string' ? rating : undefined,
      navigationType: typeof navigationType === 'string' ? navigationType : undefined,
      url: typeof url === 'string' ? url : undefined,
      userAgent: typeof userAgent === 'string' ? userAgent : undefined,
      createdAt: Timestamp.now(),
    }
    logger.info({ metric: payload }, 'Web Vital received')
    await db.collection('metrics_web_vitals').add(payload)
    res.status(201).json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export const metricsRoutes = router