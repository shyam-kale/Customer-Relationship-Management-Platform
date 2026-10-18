import { Router } from 'express'
import { getDb } from '../db.js'
import { broadcast } from '../events.js'

const router = Router()

// Legal deal stage transitions
export const DEAL_TRANSITIONS = {
  prospect: ['proposal'],
  proposal: ['negotiation', 'closed-won', 'closed-lost'],
  negotiation: ['closed-won', 'closed-lost'],
  'closed-won': [],
  'closed-lost': ['prospect'],
}

const STAGE_PROBABILITIES = {
  prospect: 0.2,
  proposal: 0.5,
  negotiation: 0.8,
  'closed-won': 1.0,
  'closed-lost': 0.0,
}

// GET / — list all deals with optional filters and computed financial probability
router.get('/', (req, res) => {
  const db = getDb()
  const { stage, customer_id } = req.query

  let sql = `
    SELECT d.*,
           c.name as customer_name,
           c.company as customer_company,
           l.title as lead_title
    FROM deals d
    LEFT JOIN customers c ON d.customer_id = c.id
    LEFT JOIN leads l ON d.lead_id = l.id
    WHERE 1=1
  `
  const params = []

  if (stage) {
    sql += ' AND d.stage = ?'
    params.push(stage)
  }
  if (customer_id) {
    sql += ' AND d.customer_id = ?'
    params.push(customer_id)
  }
  sql += ' ORDER BY d.created_at DESC'

  const rows = db.prepare(sql).all(...params)

  const enriched = rows.map((r) => {
    const prob = STAGE_PROBABILITIES[r.stage] ?? 0.2
    const val = Number(r.value || 0)
    return {
      ...r,
      win_probability: Math.round(prob * 100),
      weighted_value: Math.round(val * prob),
    }
  })

  res.json(enriched)
})

// POST /bulk — batch operations (Delete / Advance)
router.post('/bulk', (req, res) => {
  const db = getDb()
  const { action, ids, stage } = req.body

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array is required' })
  }

  const placeholders = ids.map(() => '?').join(',')

  if (action === 'delete') {
    db.prepare(`DELETE FROM deals WHERE id IN (${placeholders})`).run(...ids)
    broadcast('deal:bulk_deleted', { ids })
    return res.json({ success: true, count: ids.length, action: 'deleted' })
  }

  if (action === 'stage') {
    if (!stage || !['prospect', 'proposal', 'negotiation', 'closed-won', 'closed-lost'].includes(stage)) {
      return res.status(400).json({ error: 'Valid target stage is required' })
    }

    db.prepare(
      `UPDATE deals SET stage = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`
    ).run(stage, ...ids)

    const historyStmt = db.prepare(
      `INSERT INTO workflow_history (entity_type, entity_id, from_status, to_status, notes)
       VALUES ('deal', ?, 'bulk_action', ?, 'Batch stage advancement')`
    )
    for (const id of ids) {
      historyStmt.run(id, stage)
    }

    broadcast('deal:bulk_transitioned', { ids, stage })
    return res.json({ success: true, count: ids.length, action: 'stage_updated' })
  }

  res.status(400).json({ error: 'Unsupported bulk action' })
})

// POST /:id/duplicate — Quick Clone Deal
router.post('/:id/duplicate', (req, res) => {
  const db = getDb()
  const source = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id)
  if (!source) return res.status(404).json({ error: 'Deal not found' })

  const copyTitle = `Copy of ${source.title}`
  const targetClose = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const result = db.prepare(
    `INSERT INTO deals (lead_id, customer_id, title, stage, value, close_date, notes)
     VALUES (?, ?, ?, 'prospect', ?, ?, ?)`
  ).run(
    source.lead_id,
    source.customer_id,
    copyTitle,
    source.value,
    targetClose,
    source.notes ? `Cloned from #${source.id}: ${source.notes}` : `Cloned from #${source.id}`
  )

  const newDeal = db.prepare(`
    SELECT d.*, c.name as customer_name, l.title as lead_title
    FROM deals d
    LEFT JOIN customers c ON d.customer_id = c.id
    LEFT JOIN leads l ON d.lead_id = l.id
    WHERE d.id = ?
  `).get(result.lastInsertRowid)

  db.prepare(
    `INSERT INTO workflow_history (entity_type, entity_id, from_status, to_status, notes)
     VALUES ('deal', ?, 'initial', 'prospect', 'Cloned opportunity')`
  ).run(newDeal.id)

  broadcast('deal:created', newDeal)
  res.status(201).json(newDeal)
})

// GET /:id — get one deal
router.get('/:id', (req, res) => {
  const db = getDb()
  const row = db.prepare(`
    SELECT d.*,
           c.name as customer_name,
           l.title as lead_title
    FROM deals d
    LEFT JOIN customers c ON d.customer_id = c.id
    LEFT JOIN leads l ON d.lead_id = l.id
    WHERE d.id = ?
  `).get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Deal not found' })
  res.json(row)
})

// POST / — create deal
router.post('/', (req, res) => {
  const db = getDb()
  const { lead_id, customer_id, title, stage = 'prospect', value = 0, close_date, notes } = req.body

  if (!title) {
    return res.status(400).json({ error: 'title is required' })
  }

  const result = db.prepare(
    `INSERT INTO deals (lead_id, customer_id, title, stage, value, close_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(lead_id ?? null, customer_id ?? null, title, stage, value, close_date ?? null, notes ?? null)

  const newRow = db.prepare(`
    SELECT d.*,
           c.name as customer_name,
           l.title as lead_title
    FROM deals d
    LEFT JOIN customers c ON d.customer_id = c.id
    LEFT JOIN leads l ON d.lead_id = l.id
    WHERE d.id = ?
  `).get(result.lastInsertRowid)
  res.status(201).json(newRow)
})

// PUT /:id — update deal
router.put('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Deal not found' })

  const { lead_id, customer_id, title, stage, value, close_date, notes } = req.body
  const updated = {
    lead_id: lead_id !== undefined ? lead_id : existing.lead_id,
    customer_id: customer_id !== undefined ? customer_id : existing.customer_id,
    title: title ?? existing.title,
    stage: stage ?? existing.stage,
    value: value !== undefined ? value : existing.value,
    close_date: close_date !== undefined ? close_date : existing.close_date,
    notes: notes !== undefined ? notes : existing.notes,
  }

  db.prepare(
    `UPDATE deals SET lead_id=?, customer_id=?, title=?, stage=?, value=?, close_date=?, notes=?, updated_at=datetime('now')
     WHERE id=?`
  ).run(updated.lead_id, updated.customer_id, updated.title, updated.stage, updated.value, updated.close_date, updated.notes, req.params.id)

  const row = db.prepare(`
    SELECT d.*,
           c.name as customer_name,
           l.title as lead_title
    FROM deals d
    LEFT JOIN customers c ON d.customer_id = c.id
    LEFT JOIN leads l ON d.lead_id = l.id
    WHERE d.id = ?
  `).get(req.params.id)
  res.json(row)
})

// DELETE /:id — delete deal
router.delete('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Deal not found' })

  db.prepare('DELETE FROM deals WHERE id = ?').run(req.params.id)
  res.json({ deleted: true })
})

// POST /:id/transition — transition deal stage
router.post('/:id/transition', (req, res) => {
  const db = getDb()
  const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id)
  if (!deal) return res.status(404).json({ error: 'Deal not found' })

  const { stage: toStage } = req.body
  if (!toStage) return res.status(400).json({ error: 'stage is required' })

  const allowed = DEAL_TRANSITIONS[deal.stage] ?? []
  if (!allowed.includes(toStage)) {
    return res.status(400).json({
      error: `Invalid transition from '${deal.stage}' to '${toStage}'. Allowed: ${allowed.join(', ') || 'none'}`
    })
  }

  db.prepare(
    `UPDATE deals SET stage=?, updated_at=datetime('now') WHERE id=?`
  ).run(toStage, req.params.id)

  // Auto-activate customer if won
  if (toStage === 'closed-won' && deal.customer_id) {
    db.prepare(`UPDATE customers SET status = 'active', updated_at = datetime('now') WHERE id = ?`).run(deal.customer_id)
  }

  db.prepare(
    `INSERT INTO workflow_history (entity_type, entity_id, from_status, to_status)
     VALUES ('deal', ?, ?, ?)`
  ).run(req.params.id, deal.stage, toStage)

  const updated = db.prepare(`
    SELECT d.*,
           c.name as customer_name,
           l.title as lead_title
    FROM deals d
    LEFT JOIN customers c ON d.customer_id = c.id
    LEFT JOIN leads l ON d.lead_id = l.id
    WHERE d.id = ?
  `).get(req.params.id)
  res.json(updated)
})

export default router
