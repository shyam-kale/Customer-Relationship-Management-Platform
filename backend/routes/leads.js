import { Router } from 'express'
import { getDb } from '../db.js'
import { broadcast } from '../events.js'

const router = Router()

// Legal lead status transitions
export const LEAD_TRANSITIONS = {
  new: ['contacted'],
  contacted: ['qualified', 'unqualified'],
  qualified: ['converted', 'unqualified'],
  unqualified: ['new'],
  converted: [],
}

// GET / — list all leads with optional filters
router.get('/', (req, res) => {
  const db = getDb()
  const { status, customer_id } = req.query

  let sql = `
    SELECT l.*, c.name as customer_name, c.company as customer_company
    FROM leads l
    LEFT JOIN customers c ON l.customer_id = c.id
    WHERE 1=1
  `
  const params = []

  if (status) {
    sql += ' AND l.status = ?'
    params.push(status)
  }
  if (customer_id) {
    sql += ' AND l.customer_id = ?'
    params.push(customer_id)
  }
  sql += ' ORDER BY l.created_at DESC'

  const rows = db.prepare(sql).all(...params)
  res.json(rows)
})

// POST /bulk — batch lead operations (Bulk Transition / Bulk Delete)
router.post('/bulk', (req, res) => {
  const db = getDb()
  const { action, ids, status } = req.body

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array is required' })
  }

  const placeholders = ids.map(() => '?').join(',')

  if (action === 'delete') {
    db.prepare(`DELETE FROM leads WHERE id IN (${placeholders})`).run(...ids)
    broadcast('lead:bulk_deleted', { ids })
    return res.json({ success: true, count: ids.length, action: 'deleted' })
  }

  if (action === 'transition') {
    if (!status || !['new', 'contacted', 'qualified', 'unqualified', 'converted'].includes(status)) {
      return res.status(400).json({ error: 'Valid target status required' })
    }

    db.prepare(
      `UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`
    ).run(status, ...ids)

    // Insert history logs
    const historyStmt = db.prepare(
      `INSERT INTO workflow_history (entity_type, entity_id, from_status, to_status, notes)
       VALUES ('lead', ?, 'bulk_action', ?, 'Batch status change')`
    )
    for (const id of ids) {
      historyStmt.run(id, status)
    }

    broadcast('lead:bulk_transitioned', { ids, status })
    return res.json({ success: true, count: ids.length, action: 'transitioned' })
  }

  res.status(400).json({ error: 'Unsupported bulk action' })
})

// POST /:id/convert — Enterprise Lead-to-Deal Conversion Workflow
router.post('/:id/convert', (req, res) => {
  const db = getDb()
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id)
  if (!lead) return res.status(404).json({ error: 'Lead not found' })

  if (lead.status === 'converted') {
    return res.status(400).json({ error: 'Lead has already been converted into an opportunity' })
  }

  const {
    dealTitle,
    stage = 'proposal',
    value,
    closeDate,
    createKickoffTask = true
  } = req.body

  const finalValue = value !== undefined ? Number(value) : (Number(lead.value) || 0)
  const finalTitle = (dealTitle && dealTitle.trim()) ? dealTitle.trim() : lead.title
  const targetClose = closeDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // Execute in SQLite transaction
  const convertTx = db.transaction(() => {
    // 1. Mark lead as converted
    db.prepare(
      `UPDATE leads SET status = 'converted', updated_at = datetime('now') WHERE id = ?`
    ).run(lead.id)

    // 2. Insert into workflow_history for lead
    db.prepare(
      `INSERT INTO workflow_history (entity_type, entity_id, from_status, to_status, notes)
       VALUES ('lead', ?, ?, 'converted', 'Converted to Sales Opportunity Deal')`
    ).run(lead.id, lead.status)

    // 3. Create the Sales Opportunity Deal
    const dealResult = db.prepare(
      `INSERT INTO deals (lead_id, customer_id, title, stage, value, close_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      lead.id,
      lead.customer_id ?? null,
      finalTitle,
      stage,
      finalValue,
      targetClose,
      lead.notes ? `Converted from Lead: ${lead.notes}` : 'Auto-generated opportunity deal'
    )

    const dealId = dealResult.lastInsertRowid

    // 4. Record deal creation in workflow_history
    db.prepare(
      `INSERT INTO workflow_history (entity_type, entity_id, from_status, to_status, notes)
       VALUES ('deal', ?, 'prospect', ?, 'Spawned from lead conversion')`
    ).run(dealId, stage)

    // 5. Schedule automated kickoff follow-up
    let followup = null
    if (createKickoffTask) {
      const scheduledDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
      const fResult = db.prepare(
        `INSERT INTO followups (lead_id, customer_id, type, status, scheduled_at, notes)
         VALUES (?, ?, 'meeting', 'pending', ?, ?)`
      ).run(
        lead.id,
        lead.customer_id ?? null,
        scheduledDate,
        `Discovery & Proposal Alignment (Auto-scheduled on deal conversion: ${finalTitle})`
      )
      followup = db.prepare('SELECT * FROM followups WHERE id = ?').get(fResult.lastInsertRowid)
    }

    const createdDeal = db.prepare(`
      SELECT d.*, c.name as customer_name, l.title as lead_title
      FROM deals d
      LEFT JOIN customers c ON d.customer_id = c.id
      LEFT JOIN leads l ON d.lead_id = l.id
      WHERE d.id = ?
    `).get(dealId)

    const updatedLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(lead.id)

    return { updatedLead, createdDeal, followup }
  })

  try {
    const result = convertTx()
    broadcast('lead:converted', result)
    res.json({
      success: true,
      lead: result.updatedLead,
      deal: result.createdDeal,
      followup: result.followup,
      message: `Lead successfully converted to Deal #${result.createdDeal.id}!`,
    })
  } catch (err) {
    console.error('Lead conversion error:', err)
    res.status(500).json({ error: 'Failed to complete lead conversion transaction' })
  }
})

// GET /:id — get one lead
router.get('/:id', (req, res) => {
  const db = getDb()
  const row = db.prepare(`
    SELECT l.*, c.name as customer_name
    FROM leads l
    LEFT JOIN customers c ON l.customer_id = c.id
    WHERE l.id = ?
  `).get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Lead not found' })
  res.json(row)
})

// POST / — create lead
router.post('/', (req, res) => {
  const db = getDb()
  const { customer_id, title, source = 'other', status = 'new', value = 0, notes } = req.body

  if (!title) {
    return res.status(400).json({ error: 'title is required' })
  }

  const result = db.prepare(
    `INSERT INTO leads (customer_id, title, source, status, value, notes)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(customer_id ?? null, title, source, status, value, notes ?? null)

  const newRow = db.prepare(`
    SELECT l.*, c.name as customer_name
    FROM leads l
    LEFT JOIN customers c ON l.customer_id = c.id
    WHERE l.id = ?
  `).get(result.lastInsertRowid)
  res.status(201).json(newRow)
})

// PUT /:id — update lead
router.put('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Lead not found' })

  const { customer_id, title, source, status, value, notes } = req.body
  const updated = {
    customer_id: customer_id !== undefined ? customer_id : existing.customer_id,
    title: title ?? existing.title,
    source: source ?? existing.source,
    status: status ?? existing.status,
    value: value !== undefined ? value : existing.value,
    notes: notes !== undefined ? notes : existing.notes,
  }

  db.prepare(
    `UPDATE leads SET customer_id=?, title=?, source=?, status=?, value=?, notes=?, updated_at=datetime('now')
     WHERE id=?`
  ).run(updated.customer_id, updated.title, updated.source, updated.status, updated.value, updated.notes, req.params.id)

  const row = db.prepare(`
    SELECT l.*, c.name as customer_name
    FROM leads l
    LEFT JOIN customers c ON l.customer_id = c.id
    WHERE l.id = ?
  `).get(req.params.id)
  res.json(row)
})

// DELETE /:id — delete lead
router.delete('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Lead not found' })

  db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id)
  res.json({ deleted: true })
})

// POST /:id/transition — transition lead status
router.post('/:id/transition', (req, res) => {
  const db = getDb()
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id)
  if (!lead) return res.status(404).json({ error: 'Lead not found' })

  const { status: toStatus } = req.body
  if (!toStatus) return res.status(400).json({ error: 'status is required' })

  const allowed = LEAD_TRANSITIONS[lead.status] ?? []
  if (!allowed.includes(toStatus)) {
    return res.status(400).json({
      error: `Invalid transition from '${lead.status}' to '${toStatus}'. Allowed: ${allowed.join(', ') || 'none'}`
    })
  }

  db.prepare(
    `UPDATE leads SET status=?, updated_at=datetime('now') WHERE id=?`
  ).run(toStatus, req.params.id)

  db.prepare(
    `INSERT INTO workflow_history (entity_type, entity_id, from_status, to_status)
     VALUES ('lead', ?, ?, ?)`
  ).run(req.params.id, lead.status, toStatus)

  const updated = db.prepare(`
    SELECT l.*, c.name as customer_name
    FROM leads l
    LEFT JOIN customers c ON l.customer_id = c.id
    WHERE l.id = ?
  `).get(req.params.id)
  res.json(updated)
})

export default router
