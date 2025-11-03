import express from 'express'
import request from 'supertest'
import { errorHandler } from '../../middlewares/errorHandler'

describe('errorHandler middleware', () => {
  it('should format known errors with status and code', async () => {
    const app = express()
    app.get('/boom', (_req, _res, next) => {
      next({ status: 403, message: 'Forbidden', code: 'E_FORB' })
    })
    app.use(errorHandler)

    const res = await request(app).get('/boom')
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'Forbidden', code: 'E_FORB' })
  })

  it('should default to 500 and use error.message when provided', async () => {
    const app = express()
    app.get('/boom2', (_req, _res, next) => {
      next(new Error('Unexpected failure'))
    })
    app.use(errorHandler)

    const res = await request(app).get('/boom2')
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'Unexpected failure', code: undefined })
  })
})