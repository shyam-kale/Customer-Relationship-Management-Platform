import { getDb } from './db.js'

export function seedIfEmpty() {
  const db = getDb()
  const custCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count
  if (custCount > 0) return

  console.log('Seeding initial CRM demo data...')

  const insertCust = db.prepare(`
    INSERT INTO customers (name, email, phone, company, status, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const c1 = insertCust.run('Sarah Jenkins', 'sarah.j@acmecorp.com', '+1 (555) 234-5678', 'Acme Corp', 'active', 'Key account for enterprise license.').lastInsertRowid
  const c2 = insertCust.run('Michael Chen', 'mchen@vertextech.io', '+1 (555) 876-5432', 'Vertex Digital', 'active', 'Interested in CRM & pipeline analytics.').lastInsertRowid
  const c3 = insertCust.run('Elena Rostova', 'elena@novasystems.com', '+1 (555) 345-6789', 'Nova Systems', 'active', 'Referred by Michael Chen. Fast-growing AI startup.').lastInsertRowid
  const c4 = insertCust.run('David Miller', 'dmiller@globallogistics.com', '+1 (555) 901-2345', 'Global Logistics Inc', 'active', 'Looking for contract automation.').lastInsertRowid
  const c5 = insertCust.run('Rachel Green', 'rgreen@apexmedia.net', '+1 (555) 456-7890', 'Apex Media', 'inactive', 'Trial ended; follow up next quarter.').lastInsertRowid

  const insertLead = db.prepare(`
    INSERT INTO leads (customer_id, title, source, status, value, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const l1 = insertLead.run(c1, 'Enterprise Platform Migration', 'website', 'qualified', 45000, 'Budget approved for Q4 migration.').lastInsertRowid
  const l2 = insertLead.run(c2, 'Cloud Sync Integration Suite', 'referral', 'converted', 85000, 'Converted into high-value deal pipeline.').lastInsertRowid
  const l3 = insertLead.run(c3, 'AI Analytics Expansion', 'email', 'contacted', 32000, 'Scheduled demo presentation.').lastInsertRowid
  const l4 = insertLead.run(c4, 'Fleet Tracking Automation Module', 'cold-call', 'new', 18500, 'Initial discovery call requested.').lastInsertRowid
  const l5 = insertLead.run(c5, 'Marketing Automation Seat Expansion', 'social', 'unqualified', 12000, 'Currently evaluated competitor tool.').lastInsertRowid

  const insertDeal = db.prepare(`
    INSERT INTO deals (lead_id, customer_id, title, stage, value, close_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const d1 = insertDeal.run(l2, c2, 'Vertex Digital Cloud Sync Expansion', 'negotiation', 85000, '2026-11-15', 'Reviewing master services contract with legal.').lastInsertRowid
  const d2 = insertDeal.run(l1, c1, 'Acme Corp Enterprise Suite 2026', 'proposal', 45000, '2026-11-30', 'Sent RFP response and technical spec sheet.').lastInsertRowid
  const d3 = insertDeal.run(l3, c3, 'Nova AI Platform License', 'prospect', 32000, '2026-12-10', 'Discovery call completed, drafting custom quote.').lastInsertRowid
  const d4 = insertDeal.run(null, c4, 'Global Logistics Enterprise Renewal', 'closed-won', 110000, '2026-10-01', 'Multi-year enterprise contract signed!').lastInsertRowid
  const d5 = insertDeal.run(null, c5, 'Apex Media Digital Starter Kit', 'closed-lost', 9500, '2026-09-20', 'Postponed due to internal budget freezes.').lastInsertRowid

  // Follow-ups:
  const now = new Date()
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)

  const insertFu = db.prepare(`
    INSERT INTO followups (lead_id, customer_id, type, status, scheduled_at, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  insertFu.run(l1, c1, 'demo', 'pending', yesterday, 'Urgent: Follow up on contract questions from legal.')
  insertFu.run(l3, c3, 'call', 'pending', tomorrow, 'Discovery call to discuss AI architecture requirements.')
  insertFu.run(l2, c2, 'meeting', 'pending', nextWeek, 'Contract finalization meeting with procurement team.')
  insertFu.run(l4, c4, 'email', 'completed', yesterday, 'Sent initial product documentation & pricing sheet.')

  const insertHistory = db.prepare(`
    INSERT INTO workflow_history (entity_type, entity_id, from_status, to_status, changed_by, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  insertHistory.run('lead', l2, 'new', 'contacted', 'system', 'Lead contacted via introductory email')
  insertHistory.run('lead', l2, 'contacted', 'qualified', 'system', 'Budget and authority confirmed')
  insertHistory.run('lead', l2, 'qualified', 'converted', 'system', 'Lead successfully converted to pipeline deal')
  insertHistory.run('deal', d1, 'prospect', 'proposal', 'system', 'Proposal submitted to executive team')
  insertHistory.run('deal', d1, 'proposal', 'negotiation', 'system', 'Price terms negotiated')
  insertHistory.run('deal', d4, 'negotiation', 'closed-won', 'system', 'Signed contract received')
  insertHistory.run('followup', 4, 'pending', 'completed', 'system', 'Email delivered and response logged')

  console.log('CRM demo data seeded successfully.')
}

if (process.argv[1]?.endsWith('seed.js')) {
  seedIfEmpty()
}
