import { Router } from 'express'
import { getDb } from '../db.js'

const router = Router()

function escapeCsv(val) {
  if (val === null || val === undefined) return '""'
  const str = String(val).replace(/"/g, '""')
  return `"${str}"`
}

// ── Export Customers CSV ──────────────────────────────────────────────────────
router.get('/customers', (req, res) => {
  const db = getDb()
  const rows = db.prepare('SELECT id, name, email, phone, company, status, notes, created_at FROM customers ORDER BY id ASC').all()

  const headers = ['ID', 'Name', 'Email', 'Phone', 'Company', 'Status', 'Notes', 'Created At']
  const csvLines = [headers.join(',')]

  for (const r of rows) {
    csvLines.push([
      r.id,
      escapeCsv(r.name),
      escapeCsv(r.email),
      escapeCsv(r.phone),
      escapeCsv(r.company),
      escapeCsv(r.status),
      escapeCsv(r.notes),
      escapeCsv(r.created_at),
    ].join(','))
  }

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename="customers_export.csv"')
  res.send(csvLines.join('\n'))
})

// ── Export Deals CSV ──────────────────────────────────────────────────────────
router.get('/deals', (req, res) => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT d.id, d.title, d.stage, d.value, d.close_date, d.notes, d.created_at,
           c.name as customer_name, l.title as lead_title
    FROM deals d
    LEFT JOIN customers c ON d.customer_id = c.id
    LEFT JOIN leads l ON d.lead_id = l.id
    ORDER BY d.id ASC
  `).all()

  const headers = ['ID', 'Title', 'Customer', 'Lead', 'Stage', 'Value', 'Target Close Date', 'Notes', 'Created At']
  const csvLines = [headers.join(',')]

  for (const r of rows) {
    csvLines.push([
      r.id,
      escapeCsv(r.title),
      escapeCsv(r.customer_name),
      escapeCsv(r.lead_title),
      escapeCsv(r.stage),
      Number(r.value || 0),
      escapeCsv(r.close_date),
      escapeCsv(r.notes),
      escapeCsv(r.created_at),
    ].join(','))
  }

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename="deals_export.csv"')
  res.send(csvLines.join('\n'))
})

// ── Export Leads CSV ──────────────────────────────────────────────────────────
router.get('/leads', (req, res) => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT l.id, l.title, l.source, l.status, l.value, l.notes, l.created_at,
           c.name as customer_name
    FROM leads l
    LEFT JOIN customers c ON l.customer_id = c.id
    ORDER BY l.id ASC
  `).all()

  const headers = ['ID', 'Title', 'Customer', 'Source', 'Status', 'Value', 'Notes', 'Created At']
  const csvLines = [headers.join(',')]

  for (const r of rows) {
    csvLines.push([
      r.id,
      escapeCsv(r.title),
      escapeCsv(r.customer_name),
      escapeCsv(r.source),
      escapeCsv(r.status),
      Number(r.value || 0),
      escapeCsv(r.notes),
      escapeCsv(r.created_at),
    ].join(','))
  }

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename="leads_export.csv"')
  res.send(csvLines.join('\n'))
})

// ── Bulk Import Customers ────────────────────────────────────────────────────
router.post('/import-customers', (req, res) => {
  const db = getDb()
  const items = Array.isArray(req.body) ? req.body : req.body.customers

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Expected an array of customer records' })
  }

  let imported = 0
  let skipped = 0
  const errors = []

  const checkStmt = db.prepare('SELECT id FROM customers WHERE email = ?')
  const insertStmt = db.prepare(`
    INSERT INTO customers (name, email, phone, company, status, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const transaction = db.transaction((rows) => {
    for (const [idx, item] of rows.entries()) {
      if (!item.name || !item.email) {
        errors.push(`Row ${idx + 1}: Name and Email are required.`)
        continue
      }
      const existing = checkStmt.get(item.email.trim().toLowerCase())
      if (existing) {
        skipped += 1
        continue
      }

      insertStmt.run(
        item.name.trim(),
        item.email.trim().toLowerCase(),
        item.phone ? item.phone.trim() : null,
        item.company ? item.company.trim() : null,
        item.status === 'inactive' ? 'inactive' : 'active',
        item.notes ? item.notes.trim() : null
      )
      imported += 1
    }
  })

  try {
    transaction(items)
    res.json({
      success: true,
      imported,
      skipped,
      errors,
      totalReceived: items.length,
    })
  } catch (err) {
    res.status(500).json({ error: 'Import transaction failed: ' + err.message })
  }
})

export default router
