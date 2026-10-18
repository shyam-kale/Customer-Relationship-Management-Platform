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

describe('Deals API', () => {
  beforeEach(() => {
    rebuildSchema()
  })

  afterAll(() => {
    resetDb()
  })

  it('POST /api/deals — creates deal and returns 201', async () => {
    const res = await request(app)
      .post('/api/deals')
      .send({ title: 'Big Deal', value: 50000, stage: 'prospect' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ title: 'Big Deal', stage: 'prospect' })
    expect(res.body.id).toBeDefined()
  })

  it('POST /api/deals — returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/deals')
      .send({ value: 1000 })

    expect(res.status).toBe(400)
  })

  it('GET /api/deals — returns array', async () => {
    await request(app).post('/api/deals').send({ title: 'Deal A' })
    await request(app).post('/api/deals').send({ title: 'Deal B' })

    const res = await request(app).get('/api/deals')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(2)
  })

  it('POST /api/deals/:id/transition — legal transition succeeds (prospect → proposal)', async () => {
    const created = await request(app).post('/api/deals').send({ title: 'Transition Deal' })

    const res = await request(app)
      .post(`/api/deals/${created.body.id}/transition`)
      .send({ stage: 'proposal' })

    expect(res.status).toBe(200)
    expect(res.body.stage).toBe('proposal')
  })

  it('POST /api/deals/:id/transition — illegal transition returns 400 (prospect → closed-won)', async () => {
    const created = await request(app).post('/api/deals').send({ title: 'Illegal Deal' })

    const res = await request(app)
      .post(`/api/deals/${created.body.id}/transition`)
      .send({ stage: 'closed-won' })

    expect(res.status).toBe(400)
  })

  it('GET /api/dashboard — returns object with required keys', async () => {
    const res = await request(app).get('/api/dashboard')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('customerCount')
    expect(res.body).toHaveProperty('leadCount')
    expect(res.body).toHaveProperty('dealCount')
    expect(res.body).toHaveProperty('leadsByStatus')
    expect(res.body).toHaveProperty('dealsByStage')
    expect(res.body).toHaveProperty('recentActivity')
    expect(Array.isArray(res.body.recentActivity)).toBe(true)
  })
})
