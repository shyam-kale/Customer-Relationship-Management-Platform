import { Router } from 'express'
import { getDb } from '../db.js'
import { broadcast } from '../events.js'

const router = Router()

// GET / — list all follow-ups with optional filters
router.get('/', (req, res) => {
  const db = getDb()
  const { status, lead_id, customer_id } = req.query

  let sql = `
    SELECT f.*,
           c.name as customer_name,
           c.company as customer_company,
           l.title as lead_title
    FROM followups f
    LEFT JOIN customers c ON f.customer_id = c.id
    LEFT JOIN leads l ON f.lead_id = l.id
    WHERE 1=1
  `
  const params = []

  if (status && status !== 'all') {
    sql += ' AND f.status = ?'
    params.push(status)
  }
  if (lead_id) {
    sql += ' AND f.lead_id = ?'
    params.push(lead_id)
  }
  if (customer_id) {
    sql += ' AND f.customer_id = ?'
    params.push(customer_id)
  }
  sql += ' ORDER BY f.scheduled_at ASC'

  const rows = db.prepare(sql).all(...params)
  res.json(rows)
})

// POST /bulk — batch multi-select operations
router.post('/bulk', (req, res) => {
  const db = getDb()
  const { action, ids, days = 1 } = req.body

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array is required' })
  }

  const placeholders = ids.map(() => '?').join(',')

  if (action === 'delete') {
    db.prepare(`DELETE FROM followups WHERE id IN (${placeholders})`).run(...ids)
    broadcast('followup:bulk_deleted', { ids })
    return res.json({ success: true, count: ids.length, action: 'deleted' })
  }

  if (action === 'complete') {
    db.prepare(
      `UPDATE followups SET status = 'completed', updated_at = datetime('now') WHERE id IN (${placeholders})`
    ).run(...ids)

    const historyStmt = db.prepare(
      `INSERT INTO workflow_history (entity_type, entity_id, from_status, to_status, notes)
       VALUES ('followup', ?, 'pending', 'completed', 'Batch resolved')`
    )
    for (const id of ids) {
      historyStmt.run(id)
    }

    broadcast('followup:bulk_completed', { ids })
    return res.json({ success: true, count: ids.length, action: 'completed' })
  }

  if (action === 'reschedule') {
    const deltaDays = Number(days) || 1
    const modifier = `+${deltaDays} days`
    db.prepare(
      `UPDATE followups SET scheduled_at = datetime(scheduled_at, ?), updated_at = datetime('now') WHERE id IN (${placeholders})`
    ).run(modifier, ...ids)

    broadcast('followup:bulk_rescheduled', { ids, days: deltaDays })
    return res.json({ success: true, count: ids.length, action: 'rescheduled' })
  }

  res.status(400).json({ error: 'Unsupported bulk action' })
})

// POST /:id/reschedule — Quick single-click reschedule (+1, +3, +7 days)
router.post('/:id/reschedule', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM followups WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Follow-up not found' })

  const days = Number(req.body.days) || 1
  const modifier = `+${days} days`

  db.prepare(
    `UPDATE followups 
     SET scheduled_at = datetime(scheduled_at, ?), 
         status = 'pending',
         updated_at = datetime('now') 
     WHERE id = ?`
  ).run(modifier, req.params.id)

  db.prepare(
    `INSERT INTO workflow_history (entity_type, entity_id, from_status, to_status, notes)
     VALUES ('followup', ?, ?, 'pending', ?)`
  ).run(req.params.id, existing.status, `Rescheduled +${days} day(s)`)

  const updated = db.prepare(`
    SELECT f.*,
           c.name as customer_name,
           l.title as lead_title
    FROM followups f
    LEFT JOIN customers c ON f.customer_id = c.id
    LEFT JOIN leads l ON f.lead_id = l.id
    WHERE f.id = ?
  `).get(req.params.id)

  broadcast('followup:updated', updated)
  res.json(updated)
})

// GET /:id — get one follow-up
router.get('/:id', (req, res) => {
  const db = getDb()
  const row = db.prepare(`
    SELECT f.*,
           c.name as customer_name,
           l.title as lead_title
    FROM followups f
    LEFT JOIN customers c ON f.customer_id = c.id
    LEFT JOIN leads l ON f.lead_id = l.id
    WHERE f.id = ?
  `).get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Follow-up not found' })
  res.json(row)
})

// POST / — create follow-up
router.post('/', (req, res) => {
  const db = getDb()
  const { lead_id, customer_id, type = 'call', status = 'pending', scheduled_at, notes } = req.body

  if (!scheduled_at) {
    return res.status(400).json({ error: 'scheduled_at is required' })
  }

  const result = db.prepare(
    `INSERT INTO followups (lead_id, customer_id, type, status, scheduled_at, notes)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(lead_id ?? null, customer_id ?? null, type, status, scheduled_at, notes ?? null)

  const newRow = db.prepare(`
    SELECT f.*,
           c.name as customer_name,
           l.title as lead_title
    FROM followups f
    LEFT JOIN customers c ON f.customer_id = c.id
    LEFT JOIN leads l ON f.lead_id = l.id
    WHERE f.id = ?
  `).get(result.lastInsertRowid)

  broadcast('followup:created', newRow)
  res.status(201).json(newRow)
})

// PUT /:id — update follow-up
router.put('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM followups WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Follow-up not found' })

  const { lead_id, customer_id, type, status, scheduled_at, notes } = req.body
  const updated = {
    lead_id: lead_id !== undefined ? lead_id : existing.lead_id,
    customer_id: customer_id !== undefined ? customer_id : existing.customer_id,
    type: type ?? existing.type,
    status: status ?? existing.status,
    scheduled_at: scheduled_at ?? existing.scheduled_at,
    notes: notes !== undefined ? notes : existing.notes,
  }

  db.prepare(
    `UPDATE followups SET lead_id=?, customer_id=?, type=?, status=?, scheduled_at=?, notes=?, updated_at=datetime('now')
     WHERE id=?`
  ).run(updated.lead_id, updated.customer_id, updated.type, updated.status, updated.scheduled_at, updated.notes, req.params.id)

  if (status && status !== existing.status) {
    db.prepare(
      `INSERT INTO workflow_history (entity_type, entity_id, from_status, to_status)
       VALUES ('followup', ?, ?, ?)`
    ).run(req.params.id, existing.status, status)
  }

  const row = db.prepare(`
    SELECT f.*,
           c.name as customer_name,
           l.title as lead_title
    FROM followups f
    LEFT JOIN customers c ON f.customer_id = c.id
    LEFT JOIN leads l ON f.lead_id = l.id
    WHERE f.id = ?
  `).get(req.params.id)

  broadcast('followup:updated', row)
  res.json(row)
})

// DELETE /:id — delete follow-up
router.delete('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM followups WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Follow-up not found' })

  db.prepare('DELETE FROM followups WHERE id = ?').run(req.params.id)
  broadcast('followup:deleted', { id: Number(req.params.id) })
  res.json({ deleted: true })
})

export default router
