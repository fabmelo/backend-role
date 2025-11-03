import request from 'supertest'
import app from '../../app'

describe('Fallback 404', () => {
  it('deve responder 404 para rota inexistente', async () => {
    await request(app).get('/api/rota-que-nao-existe').expect(404)
  })
})