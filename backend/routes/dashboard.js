import { Router } from 'express'
import { getDb } from '../db.js'
import { broadcast } from '../events.js'

const router = Router()

// GET / — advanced executive analytics dashboard
router.get('/', (req, res) => {
  const db = getDb()

  const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count
  const activeCustomers = db.prepare("SELECT COUNT(*) as count FROM customers WHERE status = 'active'").get().count

  const leadCount = db.prepare('SELECT COUNT(*) as count FROM leads').get().count

  // leads by status
  const leadStatuses = ['new', 'contacted', 'qualified', 'unqualified', 'converted']
  const leadsByStatus = {}
  for (const s of leadStatuses) {
    leadsByStatus[s] = db.prepare('SELECT COUNT(*) as count FROM leads WHERE status = ?').get(s).count
  }

  // Acquisition Channels Analytics
  const channelStats = db.prepare(`
    SELECT source,
           COUNT(*) as total_leads,
           SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted_count,
           COALESCE(SUM(value), 0) as total_value
    FROM leads
    GROUP BY source
  `).all()

  const dealCount = db.prepare('SELECT COUNT(*) as count FROM deals').get().count

  // deals by stage
  const dealStages = ['prospect', 'proposal', 'negotiation', 'closed-won', 'closed-lost']
  const dealsByStage = {}
  for (const s of dealStages) {
    dealsByStage[s] = db.prepare('SELECT COUNT(*) as count FROM deals WHERE stage = ?').get(s).count
  }

  const totalPipelineValue = db.prepare(
    "SELECT COALESCE(SUM(value), 0) as total FROM deals WHERE stage NOT IN ('closed-won','closed-lost')"
  ).get().total

  // Weighted Pipeline Value calculation based on stage probabilities
  const weightedPipelineValue = db.prepare(`
    SELECT COALESCE(SUM(
      CASE
        WHEN stage = 'prospect' THEN value * 0.2
        WHEN stage = 'proposal' THEN value * 0.5
        WHEN stage = 'negotiation' THEN value * 0.8
        ELSE 0
      END
    ), 0) as weighted_val
    FROM deals
    WHERE stage NOT IN ('closed-won', 'closed-lost')
  `).get().weighted_val

  const closedWonValue = db.prepare(
    "SELECT COALESCE(SUM(value), 0) as total FROM deals WHERE stage = 'closed-won'"
  ).get().total

  // Monthly Revenue Target Goal ($250,000 baseline)
  const monthlyTarget = 250000
  const targetProgress = Math.min(100, Math.round((closedWonValue / monthlyTarget) * 100))

  const followupCount = db.prepare('SELECT COUNT(*) as count FROM followups').get().count
  const pendingFollowups = db.prepare(
    "SELECT COUNT(*) as count FROM followups WHERE status = 'pending'"
  ).get().count
  const overdueFollowups = db.prepare(
    "SELECT COUNT(*) as count FROM followups WHERE status = 'pending' AND scheduled_at < datetime('now')"
  ).get().count

  // Top Key Accounts by lifetime revenue
  const topAccounts = db.prepare(`
    SELECT c.id, c.name, c.company, COALESCE(SUM(d.value), 0) as revenue
    FROM customers c
    JOIN deals d ON c.id = d.customer_id
    WHERE d.stage = 'closed-won'
    GROUP BY c.id
    ORDER BY revenue DESC
    LIMIT 5
  `).all()

  const recentActivity = db.prepare(
    'SELECT * FROM workflow_history ORDER BY changed_at DESC LIMIT 10'
  ).all()

  res.json({
    customerCount,
    activeCustomers,
    leadCount,
    leadsByStatus,
    dealCount,
    dealsByStage,
    totalPipelineValue,
    weightedPipelineValue: Math.round(weightedPipelineValue),
    closedWonValue,
    monthlyTarget,
    targetProgress,
    followupCount,
    pendingFollowups,
    overdueFollowups,
    channelStats,
    topAccounts,
    recentActivity,
  })
})

// POST /quick-log — Instant activity logger from Executive Dashboard
router.post('/quick-log', (req, res) => {
  const db = getDb()
  const { customer_id, lead_id, type = 'call', notes, scheduled_at } = req.body

  if (!notes || !notes.trim()) {
    return res.status(400).json({ error: 'Activity notes or meeting summary is required' })
  }

  const scheduled = scheduled_at || new Date().toISOString().slice(0, 16)

  const result = db.prepare(
    `INSERT INTO followups (customer_id, lead_id, type, status, scheduled_at, notes)
     VALUES (?, ?, ?, 'completed', ?, ?)`
  ).run(customer_id ? Number(customer_id) : null, lead_id ? Number(lead_id) : null, type, scheduled, notes)

  db.prepare(
    `INSERT INTO workflow_history (entity_type, entity_id, from_status, to_status, notes)
     VALUES ('followup', ?, 'none', 'completed', ?)`
  ).run(result.lastInsertRowid, `Logged quick ${type}: ${notes}`)

  broadcast('dashboard:activity_logged', { id: result.lastInsertRowid, type, notes })
  res.status(201).json({ success: true, id: result.lastInsertRowid, message: 'Activity logged successfully!' })
})

export default router
