import { Request, Response, NextFunction } from 'express'

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err.status || 500
  const message = err.message || 'Internal Server Error'
  // Log full error for diagnostics
  console.error('[errorHandler]', { status, message, code: err?.code, stack: err?.stack })
  res.status(status).json({ error: message, code: err?.code })
}