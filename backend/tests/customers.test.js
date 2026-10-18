import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'

// Use in-memory database for tests
process.env.DB_PATH = ':memory:'

// Import after setting env
const { app } = await import('../server.js')
const { getDb, resetDb } = await import('../db.js')

function rebuildSchema() {
  resetDb()
  process.env.DB_PATH = ':memory:'
  // Re-initialize by calling getDb() which picks up the new env
  getDb()
}

describe('Customers API', () => {
  beforeEach(() => {
    rebuildSchema()
  })

  afterAll(() => {
    resetDb()
  })

  it('POST /api/customers — creates customer and returns 201', async () => {
    const res = await request(app)
      .post('/api/customers')
      .send({ name: 'Alice', email: 'alice@example.com', company: 'Acme' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ name: 'Alice', email: 'alice@example.com' })
    expect(res.body.id).toBeDefined()
  })

  it('POST /api/customers — returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/customers')
      .send({ email: 'nope@example.com' })

    expect(res.status).toBe(400)
  })

  it('POST /api/customers — returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/customers')
      .send({ name: 'Bob' })

    expect(res.status).toBe(400)
  })

  it('POST /api/customers — returns 409 on duplicate email', async () => {
    await request(app)
      .post('/api/customers')
      .send({ name: 'Alice', email: 'dup@example.com' })

    const res = await request(app)
      .post('/api/customers')
      .send({ name: 'Alice2', email: 'dup@example.com' })

    expect(res.status).toBe(409)
  })

  it('GET /api/customers — returns array', async () => {
    await request(app)
      .post('/api/customers')
      .send({ name: 'Alice', email: 'alice2@example.com' })

    const res = await request(app).get('/api/customers')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
  })

  it('GET /api/customers/:id — returns customer', async () => {
    const created = await request(app)
      .post('/api/customers')
      .send({ name: 'Bob', email: 'bob@example.com' })

    const res = await request(app).get(`/api/customers/${created.body.id}`)
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Bob')
  })

  it('GET /api/customers/9999 — returns 404', async () => {
    const res = await request(app).get('/api/customers/9999')
    expect(res.status).toBe(404)
  })

  it('PUT /api/customers/:id — updates and returns updated row', async () => {
    const created = await request(app)
      .post('/api/customers')
      .send({ name: 'Charlie', email: 'charlie@example.com' })

    const res = await request(app)
      .put(`/api/customers/${created.body.id}`)
      .send({ name: 'Charlie Updated', phone: '555-0100' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Charlie Updated')
    expect(res.body.phone).toBe('555-0100')
  })

  it('DELETE /api/customers/:id — returns { deleted: true }', async () => {
    const created = await request(app)
      .post('/api/customers')
      .send({ name: 'Delete Me', email: 'deleteme@example.com' })

    const res = await request(app).delete(`/api/customers/${created.body.id}`)
    expect(res.status).toBe(200)
    expect(res.body.deleted).toBe(true)

    const check = await request(app).get(`/api/customers/${created.body.id}`)
    expect(check.status).toBe(404)
  })

  it('Regression: after DELETE customer, leads for that customer_id are removed', async () => {
    const cust = await request(app)
      .post('/api/customers')
      .send({ name: 'Cascade Test', email: 'cascade@example.com' })

    const lead = await request(app)
      .post('/api/leads')
      .send({ title: 'Test Lead', customer_id: cust.body.id })

    expect(lead.status).toBe(201)
    expect(lead.body.customer_id).toBe(cust.body.id)

    await request(app).delete(`/api/customers/${cust.body.id}`)

    // Lead should still exist but have null customer_id (ON DELETE SET NULL)
    const leadsRes = await request(app).get(`/api/leads?customer_id=${cust.body.id}`)
    expect(leadsRes.status).toBe(200)
    expect(leadsRes.body.length).toBe(0)
  })
})
