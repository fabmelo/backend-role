import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { env } from './config/env'
import './config/firebaseAdmin'
import { authMiddleware } from './middlewares/auth'
import { errorHandler } from './middlewares/errorHandler'
import { authRoutes } from './routes/auth'
import { rolesRoutes } from './routes/roles'
import { metricsRoutes } from './routes/metrics'
import { diagRoutes } from './routes/diag'

const app = express()

// Hide Express signature
app.disable('x-powered-by')

// CORS configuration (allow only configured origins)
const allowedOrigins = env.ALLOWED_ORIGINS_LIST
app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true)
      const inAllowedList = allowedOrigins.length === 0 || allowedOrigins.includes(origin)
      let isLocalDev = false
      try {
        const u = new URL(origin)
        isLocalDev = ['localhost', '127.0.0.1'].includes(u.hostname)
      } catch {
        // ignore URL parse errors
      }
      if (inAllowedList || (env.NODE_ENV !== 'production' && isLocalDev)) {
        return callback(null, true)
      }
      return callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  })
)

// Security headers
// In dev, allow more permissive policies to avoid breaking Vite (unsafe-eval/inline).
// In production, use a stricter CSP.
app.use(
  helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production'
      ? {
          useDefaults: true,
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            fontSrc: ["'self'", 'https:', 'data:'],
            connectSrc: ["'self'"],
            frameAncestors: ["'self'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
          },
        }
      : false,
    hsts: env.NODE_ENV === 'production' ? { maxAge: 15552000, includeSubDomains: true, preload: true } : false,
    frameguard: { action: 'sameorigin' },
    xssFilter: true,
  })
)

// Body parsing
app.use(express.json())

// Rate limiting
const limiter = rateLimit({ windowMs: 60 * 1000, max: 100 })
app.use(limiter)

// Enforce HTTPS in production (behind proxy/CDN must set trust proxy)
if (env.NODE_ENV === 'production') {
  app.enable('trust proxy')
  app.use((req, res, next) => {
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') return next()
    return res.redirect(301, `https://${req.headers.host}${req.url}`)
  })
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Auth routes
app.use('/api/auth', authRoutes)

// Roles routes (CRUD)
app.use('/api/roles', rolesRoutes)

// Metrics routes (performance logging)
app.use('/api/metrics', metricsRoutes)

// Diagnostics routes
app.use('/api/_diag', diagRoutes)

// Example protected route (future use)
app.get('/protected', authMiddleware, (req, res) => {
  res.json({ uid: (req as any).uid })
})

// Error handling
app.use(errorHandler)

// 404 fallback (Express 5 compatible)
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' })
})

export default app