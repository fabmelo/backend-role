import request from 'supertest'
import app from '../../app'

describe('GET /health', () => {
  it('deve responder com status 200 e payload esperado', async () => {
    const res = await request(app).get('/health').expect(200)
    expect(res.body).toEqual(expect.objectContaining({ status: 'ok' }))
  })
})