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

describe('Regression: Full CRM workflow', () => {
  beforeEach(() => {
    rebuildSchema()
  })

  afterAll(() => {
    resetDb()
  })

  it('Full workflow: customer → lead transitions → deal transitions → followup completion → consistent dashboard', async () => {
    const db = getDb()

    // 1. Create customer
    const custRes = await request(app)
      .post('/api/customers')
      .send({ name: 'Workflow Corp', email: 'workflow@example.com', company: 'WorkflowCo' })
    expect(custRes.status).toBe(201)
    const customerId = custRes.body.id

    // 2. Create lead
    const leadRes = await request(app)
      .post('/api/leads')
      .send({ title: 'Workflow Lead', customer_id: customerId, source: 'referral', value: 25000 })
    expect(leadRes.status).toBe(201)
    const leadId = leadRes.body.id
    expect(leadRes.body.status).toBe('new')

    // 3. Transition lead: new → contacted → qualified → converted
    const t1 = await request(app)
      .post(`/api/leads/${leadId}/transition`)
      .send({ status: 'contacted' })
    expect(t1.status).toBe(200)
    expect(t1.body.status).toBe('contacted')

    const t2 = await request(app)
      .post(`/api/leads/${leadId}/transition`)
      .send({ status: 'qualified' })
    expect(t2.status).toBe(200)
    expect(t2.body.status).toBe('qualified')

    const t3 = await request(app)
      .post(`/api/leads/${leadId}/transition`)
      .send({ status: 'converted' })
    expect(t3.status).toBe(200)
    expect(t3.body.status).toBe('converted')

    // 4. Create deal
    const dealRes = await request(app)
      .post('/api/deals')
      .send({ title: 'Workflow Deal', customer_id: customerId, lead_id: leadId, value: 25000 })
    expect(dealRes.status).toBe(201)
    const dealId = dealRes.body.id
    expect(dealRes.body.stage).toBe('prospect')

    // 5. Transition deal: prospect → proposal → negotiation → closed-won
    const d1 = await request(app)
      .post(`/api/deals/${dealId}/transition`)
      .send({ stage: 'proposal' })
    expect(d1.status).toBe(200)
    expect(d1.body.stage).toBe('proposal')

    const d2 = await request(app)
      .post(`/api/deals/${dealId}/transition`)
      .send({ stage: 'negotiation' })
    expect(d2.status).toBe(200)
    expect(d2.body.stage).toBe('negotiation')

    const d3 = await request(app)
      .post(`/api/deals/${dealId}/transition`)
      .send({ stage: 'closed-won' })
    expect(d3.status).toBe(200)
    expect(d3.body.stage).toBe('closed-won')

    // 6. Create follow-up
    const fuRes = await request(app)
      .post('/api/followups')
      .send({
        customer_id: customerId,
        lead_id: leadId,
        type: 'meeting',
        scheduled_at: '2025-11-01T10:00:00',
        notes: 'Closing meeting',
      })
    expect(fuRes.status).toBe(201)
    const fuId = fuRes.body.id

    // 7. Complete the follow-up
    const fuComplete = await request(app)
      .put(`/api/followups/${fuId}`)
      .send({ status: 'completed' })
    expect(fuComplete.status).toBe(200)
    expect(fuComplete.body.status).toBe('completed')

    // 8. Verify workflow_history has all transitions in order
    const history = db.prepare('SELECT * FROM workflow_history ORDER BY id ASC').all()
    expect(history.length).toBeGreaterThanOrEqual(7) // 3 lead + 3 deal + 1 followup

    const leadHistory = history.filter(h => h.entity_type === 'lead')
    expect(leadHistory.length).toBe(3)
    expect(leadHistory[0]).toMatchObject({ from_status: 'new', to_status: 'contacted' })
    expect(leadHistory[1]).toMatchObject({ from_status: 'contacted', to_status: 'qualified' })
    expect(leadHistory[2]).toMatchObject({ from_status: 'qualified', to_status: 'converted' })

    const dealHistory = history.filter(h => h.entity_type === 'deal')
    expect(dealHistory.length).toBe(3)
    expect(dealHistory[0]).toMatchObject({ from_status: 'prospect', to_status: 'proposal' })
    expect(dealHistory[1]).toMatchObject({ from_status: 'proposal', to_status: 'negotiation' })
    expect(dealHistory[2]).toMatchObject({ from_status: 'negotiation', to_status: 'closed-won' })

    const followupHistory = history.filter(h => h.entity_type === 'followup')
    expect(followupHistory.length).toBe(1)
    expect(followupHistory[0]).toMatchObject({ from_status: 'pending', to_status: 'completed' })

    // 9. Verify dashboard is consistent
    const dashRes = await request(app).get('/api/dashboard')
    expect(dashRes.status).toBe(200)
    const dash = dashRes.body
    expect(dash.customerCount).toBeGreaterThanOrEqual(1)
    expect(dash.leadCount).toBeGreaterThanOrEqual(1)
    expect(dash.dealCount).toBeGreaterThanOrEqual(1)
    expect(dash.closedWonValue).toBeGreaterThan(0)
    expect(dash.leadsByStatus.converted).toBeGreaterThanOrEqual(1)
    expect(dash.dealsByStage['closed-won']).toBeGreaterThanOrEqual(1)
  })
})
