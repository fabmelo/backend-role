import request from 'supertest'

const getRoleByIdMock: jest.Mock<any, any> = jest.fn(async (_id) => null)
jest.mock('../../services/rolesService', () => ({
  __esModule: true,
  getRoleById: (id: any) => getRoleByIdMock(id),
}))

import app from '../../app'

describe('GET /api/roles/:id detalhe não encontrado', () => {
  it('deve responder 404 quando rôle não existe', async () => {
    const res = await request(app).get('/api/roles/nonexistent-id').expect(404)
    expect(res.body).toEqual(expect.objectContaining({ error: 'Role not found' }))
  })
})