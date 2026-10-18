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

describe('Leads API', () => {
  beforeEach(() => {
    rebuildSchema()
  })

  afterAll(() => {
    resetDb()
  })

  it('POST /api/leads — creates lead and returns 201', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({ title: 'New Opportunity', source: 'website', value: 5000 })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ title: 'New Opportunity', status: 'new' })
    expect(res.body.id).toBeDefined()
  })

  it('POST /api/leads — returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({ source: 'website' })

    expect(res.status).toBe(400)
  })

  it('GET /api/leads — returns array', async () => {
    await request(app).post('/api/leads').send({ title: 'Lead 1' })
    await request(app).post('/api/leads').send({ title: 'Lead 2' })

    const res = await request(app).get('/api/leads')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(2)
  })

  it('GET /api/leads?status=new — filters correctly', async () => {
    await request(app).post('/api/leads').send({ title: 'New Lead' })

    const res = await request(app).get('/api/leads?status=new')
    expect(res.status).toBe(200)
    expect(res.body.every(l => l.status === 'new')).toBe(true)
  })

  it('PUT /api/leads/:id — updates lead', async () => {
    const created = await request(app).post('/api/leads').send({ title: 'Update Me' })

    const res = await request(app)
      .put(`/api/leads/${created.body.id}`)
      .send({ title: 'Updated Title', value: 9999 })

    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Updated Title')
    expect(res.body.value).toBe(9999)
  })

  it('POST /api/leads/:id/transition — legal transition succeeds (new → contacted)', async () => {
    const created = await request(app).post('/api/leads').send({ title: 'Transition Lead' })

    const res = await request(app)
      .post(`/api/leads/${created.body.id}/transition`)
      .send({ status: 'contacted' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('contacted')
  })

  it('POST /api/leads/:id/transition — illegal transition returns 400 (new → converted)', async () => {
    const created = await request(app).post('/api/leads').send({ title: 'Illegal Transition' })

    const res = await request(app)
      .post(`/api/leads/${created.body.id}/transition`)
      .send({ status: 'converted' })

    expect(res.status).toBe(400)
  })

  it('DELETE /api/leads/:id — returns { deleted: true }', async () => {
    const created = await request(app).post('/api/leads').send({ title: 'Delete Me' })

    const res = await request(app).delete(`/api/leads/${created.body.id}`)
    expect(res.status).toBe(200)
    expect(res.body.deleted).toBe(true)

    const check = await request(app).get(`/api/leads/${created.body.id}`)
    expect(check.status).toBe(404)
  })
})
