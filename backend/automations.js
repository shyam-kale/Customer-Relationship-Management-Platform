import { crmEvents, broadcast } from './events.js'

let monitorInterval = null

export function initAutomations(getDb) {
  // Listen for deal transition events
  crmEvents.on('deal:transitioned', (deal) => {
    try {
      const db = getDb()
      if (deal.stage === 'closed-won') {
        // Auto-rule: Ensure customer is active
        if (deal.customer_id) {
          db.prepare(
            `UPDATE customers SET status = 'active', updated_at = datetime('now') WHERE id = ? AND status != 'active'`
          ).run(deal.customer_id)
        }

        // Broadcast celebratory notification
        broadcast('notification:new', {
          id: 'notif-' + Date.now(),
          title: 'Deal Won! 🚀',
          message: `"${deal.title}" closed for $${Number(deal.value || 0).toLocaleString()}`,
          severity: 'success',
          entityType: 'deal',
          entityId: deal.id,
          createdAt: new Date().toISOString(),
        })
      }
    } catch (e) {
      console.error('Automation error on deal:transitioned:', e.message)
    }
  })

  // Listen for lead transition events
  crmEvents.on('lead:transitioned', (lead) => {
    try {
      if (lead.status === 'qualified') {
        broadcast('notification:new', {
          id: 'notif-' + Date.now(),
          title: 'Lead Qualified ⭐',
          message: `"${lead.title}" is ready for proposal stage`,
          severity: 'info',
          entityType: 'lead',
          entityId: lead.id,
          createdAt: new Date().toISOString(),
        })
      }
    } catch (e) {
      console.error('Automation error on lead:transitioned:', e.message)
    }
  })

  // Start background monitoring for SLA & Overdue tasks
  if (!monitorInterval) {
    const runCheck = () => {
      try {
        const db = getDb()
        const overdue = db.prepare(
          `SELECT f.*, c.name as customer_name, l.title as lead_title
           FROM followups f
           LEFT JOIN customers c ON f.customer_id = c.id
           LEFT JOIN leads l ON f.lead_id = l.id
           WHERE f.status = 'pending' AND f.scheduled_at < datetime('now')
           LIMIT 10`
        ).all()

        if (overdue.length > 0) {
          broadcast('alerts:overdue', {
            count: overdue.length,
            items: overdue,
            timestamp: new Date().toISOString(),
          })
        }
      } catch (_) {}
    }

    // Run first check after 3 seconds, then every 60s
    setTimeout(runCheck, 3000)
    monitorInterval = setInterval(runCheck, 60000)
    if (monitorInterval.unref) monitorInterval.unref()
  }
}

export function stopAutomations() {
  if (monitorInterval) {
    clearInterval(monitorInterval)
    monitorInterval = null
  }
}

export default { initAutomations, stopAutomations }
