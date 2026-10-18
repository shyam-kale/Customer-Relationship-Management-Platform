import { Router } from 'express'
import { getDb } from '../db.js'
import { broadcast } from '../events.js'

const router = Router()

// Helper to determine customer health grade
function calculateHealth(lifetimeValue, openPipelineValue) {
  if (lifetimeValue >= 50000) return { grade: 'A+', label: 'Tier 1 Enterprise', color: 'emerald' }
  if (lifetimeValue > 0) return { grade: 'A', label: 'Key Customer', color: 'indigo' }
  if (openPipelineValue > 0) return { grade: 'B', label: 'In Sales Cycle', color: 'amber' }
  return { grade: 'C', label: 'Prospect Account', color: 'slate' }
}

// GET / ── list all customers with live financials & health grade
router.get('/', (req, res) => {
  const db = getDb()
  const { status } = req.query

  let sql = `
    SELECT c.*,
           COALESCE(won.won_value, 0) as lifetime_value,
           COALESCE(pipeline.pipeline_value, 0) as pipeline_value,
           COALESCE(deal_count.total_deals, 0) as total_deals
    FROM customers c
    LEFT JOIN (
      SELECT customer_id, SUM(value) as won_value FROM deals WHERE stage = 'closed-won' GROUP BY customer_id
    ) won ON c.id = won.customer_id
    LEFT JOIN (
      SELECT customer_id, SUM(value) as pipeline_value FROM deals WHERE stage NOT IN ('closed-won', 'closed-lost') GROUP BY customer_id
    ) pipeline ON c.id = pipeline.customer_id
    LEFT JOIN (
      SELECT customer_id, COUNT(*) as total_deals FROM deals GROUP BY customer_id
    ) deal_count ON c.id = deal_count.customer_id
  `
  const params = []

  if (status && status !== 'all') {
    sql += ' WHERE c.status = ?'
    params.push(status)
  }
  sql += ' ORDER BY c.created_at DESC'

  const rows = db.prepare(sql).all(...params)

  const enriched = rows.map((r) => {
    const health = calculateHealth(Number(r.lifetime_value || 0), Number(r.pipeline_value || 0))
    return {
      ...r,
      health_grade: health.grade,
      health_label: health.label,
      health_color: health.color,
    }
  })

  res.json(enriched)
})

// POST /bulk ── batch multi-select operations (Enterprise Action)
router.post('/bulk', (req, res) => {
  const db = getDb()
  const { action, ids, status } = req.body

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array is required' })
  }

  const placeholders = ids.map(() => '?').join(',')

  if (action === 'delete') {
    db.prepare(`DELETE FROM customers WHERE id IN (${placeholders})`).run(...ids)
    broadcast('customer:bulk_deleted', { ids })
    return res.json({ success: true, count: ids.length, action: 'deleted' })
  }

  if (action === 'status') {
    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Valid status (active/inactive) required' })
    }
    db.prepare(
      `UPDATE customers SET status = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`
    ).run(status, ...ids)
    broadcast('customer:bulk_updated', { ids, status })
    return res.json({ success: true, count: ids.length, action: 'status_updated' })
  }

  res.status(400).json({ error: 'Unsupported bulk action' })
})

// GET /:id/profile ── Customer 360° Profile
router.get('/:id/profile', (req, res) => {
  const db = getDb()
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id)
  if (!customer) return res.status(404).json({ error: 'Customer not found' })

  const leads = db.prepare('SELECT * FROM leads WHERE customer_id = ? ORDER BY created_at DESC').all(req.params.id)
  const deals = db.prepare('SELECT * FROM deals WHERE customer_id = ? ORDER BY created_at DESC').all(req.params.id)
  const followups = db.prepare(`
    SELECT f.*, l.title as lead_title
    FROM followups f
    LEFT JOIN leads l ON f.lead_id = l.id
    WHERE f.customer_id = ?
    ORDER BY f.scheduled_at DESC
  `).all(req.params.id)

  const wonDeals = deals.filter(d => d.stage === 'closed-won')
  const activeDeals = deals.filter(d => d.stage !== 'closed-won' && d.stage !== 'closed-lost')

  const lifetimeValue = wonDeals.reduce((sum, d) => sum + Number(d.value || 0), 0)
  const openPipelineValue = activeDeals.reduce((sum, d) => sum + Number(d.value || 0), 0)

  // Recent workflow history related to customer's deals or leads
  const dealIds = deals.map(d => d.id)
  const leadIds = leads.map(l => l.id)
  let history = []

  const conditions = []
  const params = []

  if (dealIds.length > 0) {
    conditions.push(`(entity_type = 'deal' AND entity_id IN (${dealIds.map(() => '?').join(',')}))`)
    params.push(...dealIds)
  }
  if (leadIds.length > 0) {
    conditions.push(`(entity_type = 'lead' AND entity_id IN (${leadIds.map(() => '?').join(',')}))`)
    params.push(...leadIds)
  }

  if (conditions.length > 0) {
    history = db.prepare(`
      SELECT * FROM workflow_history
      WHERE ${conditions.join(' OR ')}
      ORDER BY changed_at DESC
      LIMIT 15
    `).all(...params)
  }

  const health = calculateHealth(lifetimeValue, openPipelineValue)

  res.json({
    customer: {
      ...customer,
      health_grade: health.grade,
      health_label: health.label,
      health_color: health.color,
    },
    metrics: {
      lifetimeValue,
      openPipelineValue,
      dealsCount: deals.length,
      wonDealsCount: wonDeals.length,
      leadsCount: leads.length,
      followupsCount: followups.length,
    },
    leads,
    deals,
    followups,
    history,
  })
})

// GET /:id ── get one customer
router.get('/:id', (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Customer not found' })
  res.json(row)
})

// POST / ── create customer
router.post('/', (req, res) => {
  const db = getDb()
  const { name, email, phone, company, status = 'active', notes } = req.body

  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' })
  }

  const existing = db.prepare('SELECT id FROM customers WHERE email = ?').get(email)
  if (existing) {
    return res.status(409).json({ error: 'Email already exists' })
  }

  const stmt = db.prepare(
    `INSERT INTO customers (name, email, phone, company, status, notes)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
  const result = stmt.run(name, email, phone ?? null, company ?? null, status, notes ?? null)
  const newRow = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid)

  broadcast('customer:created', newRow)
  res.status(201).json(newRow)
})

// PUT /:id ── update customer
router.put('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Customer not found' })

  const { name, email, phone, company, status, notes } = req.body
  const updated = {
    name: name ?? existing.name,
    email: email ?? existing.email,
    phone: phone !== undefined ? phone : existing.phone,
    company: company !== undefined ? company : existing.company,
    status: status ?? existing.status,
    notes: notes !== undefined ? notes : existing.notes,
  }

  db.prepare(
    `UPDATE customers SET name=?, email=?, phone=?, company=?, status=?, notes=?, updated_at=datetime('now')
     WHERE id=?`
  ).run(updated.name, updated.email, updated.phone, updated.company, updated.status, updated.notes, req.params.id)

  const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id)
  broadcast('customer:updated', row)
  res.json(row)
})

// DELETE /:id ── delete customer
router.delete('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Customer not found' })

  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id)
  broadcast('customer:deleted', { id: Number(req.params.id) })
  res.json({ deleted: true })
})

export default router
