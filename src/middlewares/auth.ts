import { Request, Response, NextFunction } from 'express'
import { adminAuth } from '../config/firebaseAdmin'

/**
 * Middleware to validate Firebase ID Token in Authorization: Bearer <token>
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization || ''
    const match = authHeader.match(/^Bearer (.+)$/)
    if (!match) {
      console.warn('[authMiddleware] Missing Authorization Bearer token')
      return res.status(401).json({ error: 'Missing Authorization Bearer token' })
    }
    const idToken = match[1]
    let decoded
    try {
      decoded = await adminAuth.verifyIdToken(idToken)
    } catch (e: any) {
      console.error('[authMiddleware] verifyIdToken failed:', e?.message || e)
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    ;(req as any).uid = decoded.uid
    return next()
  } catch (err) {
    console.error('[authMiddleware] Unexpected error:', err)
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}