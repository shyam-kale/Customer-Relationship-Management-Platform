import { Router } from 'express'
import { getDb } from '../db.js'

const router = Router()

const STAGE_WEIGHTS = {
  prospect: 0.20,
  proposal: 0.50,
  negotiation: 0.80,
  'closed-won': 1.00,
  'closed-lost': 0.00,
}

router.get('/', (req, res) => {
  const db = getDb()

  // 1. Deals breakdown by stage
  const deals = db.prepare('SELECT id, title, stage, value, close_date, customer_id, lead_id FROM deals').all()

  let unweightedPipeline = 0
  let weightedPipeline = 0
  let closedWonValue = 0
  let closedLostValue = 0
  let wonCount = 0
  let lostCount = 0

  const stageBreakdown = {
    prospect: { count: 0, total: 0, weighted: 0, probability: 20 },
    proposal: { count: 0, total: 0, weighted: 0, probability: 50 },
    negotiation: { count: 0, total: 0, weighted: 0, probability: 80 },
    'closed-won': { count: 0, total: 0, weighted: 0, probability: 100 },
    'closed-lost': { count: 0, total: 0, weighted: 0, probability: 0 },
  }

  for (const d of deals) {
    const val = Number(d.value || 0)
    const stage = d.stage || 'prospect'
    const weight = STAGE_WEIGHTS[stage] ?? 0.2

    if (stageBreakdown[stage]) {
      stageBreakdown[stage].count += 1
      stageBreakdown[stage].total += val
      stageBreakdown[stage].weighted += Math.round(val * weight)
    }

    if (stage === 'closed-won') {
      closedWonValue += val
      wonCount += 1
    } else if (stage === 'closed-lost') {
      closedLostValue += val
      lostCount += 1
    } else {
      unweightedPipeline += val
      weightedPipeline += Math.round(val * weight)
    }
  }

  const totalResolved = wonCount + lostCount
  const winRate = totalResolved > 0 ? Math.round((wonCount / totalResolved) * 100) : (wonCount > 0 ? 100 : 0)
  const avgWonDeal = wonCount > 0 ? Math.round(closedWonValue / wonCount) : 0

  // 2. Leads metrics
  const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads').get().count
  const convertedLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'converted'").get().count
  const leadConversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0

  // 3. Followups SLA
  const totalFollowups = db.prepare('SELECT COUNT(*) as count FROM followups').get().count
  const overdueFollowups = db.prepare(
    "SELECT COUNT(*) as count FROM followups WHERE status = 'pending' AND scheduled_at < datetime('now')"
  ).get().count
  const completedFollowups = db.prepare(
    "SELECT COUNT(*) as count FROM followups WHERE status = 'completed'"
  ).get().count
  const followupCompletionRate = totalFollowups > 0 ? Math.round((completedFollowups / totalFollowups) * 100) : 100

  // 4. Pipeline Health Score (0 - 100)
  let healthScore = 70
  if (winRate >= 50) healthScore += 15
  else if (winRate < 25) healthScore -= 10

  if (overdueFollowups === 0) healthScore += 15
  else healthScore -= Math.min(30, overdueFollowups * 10)

  if (unweightedPipeline > 50000) healthScore += 10

  healthScore = Math.max(10, Math.min(100, healthScore))

  // 5. Top customers by Won Deals / LTV
  const topCustomers = db.prepare(`
    SELECT c.id, c.name, c.company, c.email,
           COUNT(d.id) as won_deals_count,
           COALESCE(SUM(d.value), 0) as lifetime_value
    FROM customers c
    JOIN deals d ON d.customer_id = c.id AND d.stage = 'closed-won'
    GROUP BY c.id
    ORDER BY lifetime_value DESC
    LIMIT 5
  `).all()

  res.json({
    forecast: {
      unweightedPipeline,
      weightedPipeline,
      closedWonValue,
      closedLostValue,
      totalPipelineDeals: deals.length - totalResolved,
    },
    performance: {
      winRate,
      wonCount,
      lostCount,
      avgWonDeal,
      leadConversionRate,
      totalLeads,
      convertedLeads,
      followupCompletionRate,
      overdueFollowups,
      healthScore,
    },
    stageBreakdown,
    topCustomers,
  })
})

export default router
