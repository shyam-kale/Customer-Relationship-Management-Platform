import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'

process.env.DB_PATH = ':memory:'

const { app } = await import('../server.js')
const { getDb, resetDb } = await import('../db.js')

function rebuildSchema() {
  resetDb()
  process.env.DB_PATH = ':memory:'
  getDb()
}

describe('Follow-ups API', () => {
  beforeEach(() => {
    rebuildSchema()
  })

  afterAll(() => {
    resetDb()
  })

  it('POST /api/followups — creates follow-up with scheduled_at and returns 201', async () => {
    const res = await request(app)
      .post('/api/followups')
      .send({ type: 'call', scheduled_at: '2025-12-01T10:00:00', notes: 'Follow up call' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ type: 'call', status: 'pending' })
    expect(res.body.id).toBeDefined()
  })

  it('POST /api/followups — returns 400 when scheduled_at is missing', async () => {
    const res = await request(app)
      .post('/api/followups')
      .send({ type: 'call' })

    expect(res.status).toBe(400)
  })

  it('GET /api/followups — returns array', async () => {
    await request(app).post('/api/followups').send({ type: 'call', scheduled_at: '2025-12-01T10:00:00' })
    await request(app).post('/api/followups').send({ type: 'email', scheduled_at: '2025-12-02T10:00:00' })

    const res = await request(app).get('/api/followups')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(2)
  })

  it('PUT /api/followups/:id — status change updates and inserts workflow_history row', async () => {
    const db = getDb()
    const created = await request(app)
      .post('/api/followups')
      .send({ type: 'meeting', scheduled_at: '2025-12-03T14:00:00' })

    const res = await request(app)
      .put(`/api/followups/${created.body.id}`)
      .send({ status: 'completed' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('completed')

    // Verify workflow_history was inserted
    const history = db.prepare(
      "SELECT * FROM workflow_history WHERE entity_type='followup' AND entity_id=?"
    ).all(created.body.id)
    expect(history.length).toBeGreaterThan(0)
    expect(history[0].to_status).toBe('completed')
    expect(history[0].from_status).toBe('pending')
  })

  it('DELETE /api/followups/:id — returns { deleted: true }', async () => {
    const created = await request(app)
      .post('/api/followups')
      .send({ type: 'demo', scheduled_at: '2025-12-04T09:00:00' })

    const res = await request(app).delete(`/api/followups/${created.body.id}`)
    expect(res.status).toBe(200)
    expect(res.body.deleted).toBe(true)

    const check = await request(app).get(`/api/followups/${created.body.id}`)
    expect(check.status).toBe(404)
  })
})
