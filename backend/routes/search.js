import { Router } from 'express'
import { getDb } from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  const q = (req.query.q || '').trim()

  if (!q || q.length < 1) {
    return res.json({
      query: '',
      results: [],
      customers: [],
      leads: [],
      deals: [],
    })
  }

  const pattern = `%${q}%`

  // 1. Search Customers
  const customers = db.prepare(`
    SELECT id, name, email, company, phone, status
    FROM customers
    WHERE name LIKE ? OR email LIKE ? OR company LIKE ? OR phone LIKE ? OR notes LIKE ?
    LIMIT 6
  `).all(pattern, pattern, pattern, pattern, pattern)

  // 2. Search Leads
  const leads = db.prepare(`
    SELECT l.id, l.title, l.status, l.source, l.value, c.name as customer_name
    FROM leads l
    LEFT JOIN customers c ON l.customer_id = c.id
    WHERE l.title LIKE ? OR l.notes LIKE ?
    LIMIT 6
  `).all(pattern, pattern)

  // 3. Search Deals
  const deals = db.prepare(`
    SELECT d.id, d.title, d.stage, d.value, d.close_date, c.name as customer_name
    FROM deals d
    LEFT JOIN customers c ON d.customer_id = c.id
    WHERE d.title LIKE ? OR d.notes LIKE ?
    LIMIT 6
  `).all(pattern, pattern)

  // Combined flat results for spotlight palette
  const combined = [
    ...customers.map(c => ({
      id: `customer-${c.id}`,
      entityId: c.id,
      type: 'customer',
      title: c.name,
      subtitle: [c.company, c.email].filter(Boolean).join(' • '),
      badge: c.status,
      badgeColor: c.status === 'active' ? 'emerald' : 'slate',
      path: '/customers',
    })),
    ...leads.map(l => ({
      id: `lead-${l.id}`,
      entityId: l.id,
      type: 'lead',
      title: l.title,
      subtitle: [l.customer_name, `$${Number(l.value||0).toLocaleString()}`].filter(Boolean).join(' • '),
      badge: l.status,
      badgeColor: 'indigo',
      path: '/leads',
    })),
    ...deals.map(d => ({
      id: `deal-${d.id}`,
      entityId: d.id,
      type: 'deal',
      title: d.title,
      subtitle: [d.customer_name, `$${Number(d.value||0).toLocaleString()}`].filter(Boolean).join(' • '),
      badge: d.stage,
      badgeColor: d.stage === 'closed-won' ? 'emerald' : (d.stage === 'closed-lost' ? 'rose' : 'violet'),
      path: '/pipeline',
    })),
  ]

  res.json({
    query: q,
    totalCount: combined.length,
    results: combined,
    customers,
    leads,
    deals,
  })
})

export default router
