// ─── Mock Data for GitHub Pages Demo ─────────────────────────────────────────
// The backend (Node.js/SQLite) cannot run on GitHub Pages (static hosting).
// This module provides realistic seed data so every page is fully interactive
// in the demo deployment. All data lives in localStorage so edits persist
// across page refreshes within the same browser session.

const STORE_KEY = 'crm_mock_store'

function now() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

function uid(list) {
  return list.length > 0 ? Math.max(...list.map(r => r.id)) + 1 : 1
}

const DEFAULT_DATA = {
  customers: [
    { id: 1, name: 'Alice Johnson',   email: 'alice@techcorp.com',    phone: '+1 555-0101', company: 'TechCorp Inc.',     status: 'active',   notes: 'Key enterprise account. Primary contact for SaaS renewal.', lifetime_value: 120000, pipeline_value: 30000, health_grade: 'A+', health_label: 'Tier 1 Enterprise', created_at: '2026-01-10 09:00:00', updated_at: '2026-09-15 14:22:00' },
    { id: 2, name: 'Bob Martinez',    email: 'bob@globalretail.com',  phone: '+1 555-0202', company: 'Global Retail Co.', status: 'active',   notes: 'Retail chain expansion project. Evaluating platform.', lifetime_value: 45000, pipeline_value: 60000, health_grade: 'A',  health_label: 'Key Customer',      created_at: '2026-02-14 11:30:00', updated_at: '2026-09-20 10:05:00' },
    { id: 3, name: 'Carol Smith',     email: 'carol@startupxyz.io',   phone: '+1 555-0303', company: 'StartupXYZ',        status: 'active',   notes: 'Series B funded. Fast growth trajectory.', lifetime_value: 8000,  pipeline_value: 15000, health_grade: 'B',  health_label: 'In Sales Cycle',    created_at: '2026-03-22 08:45:00', updated_at: '2026-09-18 16:40:00' },
    { id: 4, name: 'David Lee',       email: 'david@infracloud.net',  phone: '+1 555-0404', company: 'InfraCloud',        status: 'active',   notes: 'Cloud infrastructure decision maker.', lifetime_value: 75000, pipeline_value: 20000, health_grade: 'A+', health_label: 'Tier 1 Enterprise', created_at: '2026-04-05 13:00:00', updated_at: '2026-09-22 09:15:00' },
    { id: 5, name: 'Eva Patel',       email: 'eva@designhub.co',      phone: '+1 555-0505', company: 'DesignHub',         status: 'inactive', notes: 'Previous client. Left due to budget cuts.', lifetime_value: 12000, pipeline_value: 0, health_grade: 'C',  health_label: 'Prospect Account',  created_at: '2026-05-18 15:20:00', updated_at: '2026-08-01 11:00:00' },
    { id: 6, name: 'Frank Wilson',    email: 'frank@manufact.com',    phone: '+1 555-0606', company: 'ManufactPro',       status: 'active',   notes: 'Manufacturing automation project. High value deal potential.', lifetime_value: 0, pipeline_value: 85000, health_grade: 'B', health_label: 'In Sales Cycle', created_at: '2026-06-30 10:00:00', updated_at: '2026-09-25 08:30:00' },
  ],
  leads: [
    { id: 1, customer_id: 1, customer_name: 'Alice Johnson', title: 'Enterprise SaaS License Renewal',   source: 'referral',   status: 'qualified',    value: 85000,  notes: 'Annual renewal. Upsell opportunity on premium tier.', created_at: '2026-08-01 09:00:00', updated_at: '2026-09-10 14:00:00' },
    { id: 2, customer_id: 2, customer_name: 'Bob Martinez',  title: 'Retail POS Integration Suite',       source: 'website',    status: 'contacted',    value: 42000,  notes: '50-store rollout project. Timeline Q1 2027.', created_at: '2026-08-15 11:00:00', updated_at: '2026-09-12 10:00:00' },
    { id: 3, customer_id: 3, customer_name: 'Carol Smith',   title: 'Startup Growth Analytics Package',   source: 'cold-call',  status: 'new',          value: 12000,  notes: 'Intro call scheduled. Good fit for starter plan.', created_at: '2026-09-01 08:00:00', updated_at: '2026-09-01 08:00:00' },
    { id: 4, customer_id: 4, customer_name: 'David Lee',     title: 'Cloud Infrastructure Monitoring',    source: 'email',      status: 'converted',    value: 95000,  notes: 'Closed. Moving to deal phase.', created_at: '2026-07-20 13:00:00', updated_at: '2026-09-05 09:00:00' },
    { id: 5, customer_id: 6, customer_name: 'Frank Wilson',  title: 'Manufacturing IoT Platform License', source: 'social',     status: 'qualified',    value: 68000,  notes: 'Technical demo completed. Decision committee review.', created_at: '2026-09-10 10:00:00', updated_at: '2026-09-20 15:00:00' },
    { id: 6, customer_id: 2, customer_name: 'Bob Martinez',  title: 'Warehouse Management Add-on',        source: 'referral',   status: 'unqualified',  value: 8000,   notes: 'Budget not available this quarter.', created_at: '2026-09-15 09:00:00', updated_at: '2026-09-16 11:00:00' },
  ],
  followups: [
    { id: 1, lead_id: 1, customer_id: 1, customer_name: 'Alice Johnson', lead_title: 'Enterprise SaaS License Renewal', type: 'meeting',  status: 'pending',   scheduled_at: new Date(Date.now() + 2  * 86400000).toISOString().slice(0,16), notes: 'Quarterly business review + renewal pricing discussion.', created_at: '2026-09-20 09:00:00', updated_at: '2026-09-20 09:00:00' },
    { id: 2, lead_id: 2, customer_id: 2, customer_name: 'Bob Martinez',  lead_title: 'Retail POS Integration Suite',    type: 'call',     status: 'pending',   scheduled_at: new Date(Date.now() - 1  * 86400000).toISOString().slice(0,16), notes: 'Follow-up on technical spec document sent last week.', created_at: '2026-09-18 10:00:00', updated_at: '2026-09-18 10:00:00' },
    { id: 3, lead_id: 3, customer_id: 3, customer_name: 'Carol Smith',   lead_title: 'Startup Growth Analytics',       type: 'email',    status: 'completed', scheduled_at: new Date(Date.now() - 5  * 86400000).toISOString().slice(0,16), notes: 'Sent product brochure and pricing sheet.', created_at: '2026-09-15 14:00:00', updated_at: '2026-09-15 16:00:00' },
    { id: 4, lead_id: 5, customer_id: 6, customer_name: 'Frank Wilson',  lead_title: 'Manufacturing IoT Platform',     type: 'demo',     status: 'pending',   scheduled_at: new Date(Date.now() + 4  * 86400000).toISOString().slice(0,16), notes: 'Live product demo for technical committee.', created_at: '2026-09-22 09:00:00', updated_at: '2026-09-22 09:00:00' },
    { id: 5, lead_id: 1, customer_id: 1, customer_name: 'Alice Johnson', lead_title: 'Enterprise SaaS License Renewal', type: 'call',    status: 'pending',   scheduled_at: new Date(Date.now() - 3  * 86400000).toISOString().slice(0,16), notes: 'Check in on decision timeline — overdue.', created_at: '2026-09-17 11:00:00', updated_at: '2026-09-17 11:00:00' },
  ],
  deals: [
    { id: 1, lead_id: 4, customer_id: 4, customer_name: 'David Lee',    lead_title: 'Cloud Infrastructure Monitoring',   title: 'InfraCloud Monitoring Platform',   stage: 'negotiation',  value: 95000,  close_date: '2026-11-30', notes: 'Finalizing SLA terms. Legal review in progress.', created_at: '2026-09-05 09:00:00', updated_at: '2026-09-25 10:00:00' },
    { id: 2, lead_id: 1, customer_id: 1, customer_name: 'Alice Johnson', lead_title: 'Enterprise SaaS License Renewal',  title: 'TechCorp Annual License Renewal',  stage: 'proposal',     value: 85000,  close_date: '2026-10-31', notes: 'Proposal document sent. Awaiting executive sign-off.', created_at: '2026-09-12 10:00:00', updated_at: '2026-09-22 14:00:00' },
    { id: 3, lead_id: 5, customer_id: 6, customer_name: 'Frank Wilson',  lead_title: 'Manufacturing IoT Platform',       title: 'ManufactPro IoT Deployment',       stage: 'prospect',     value: 68000,  close_date: '2026-12-15', notes: 'Initial scoping complete. RFP expected next week.', created_at: '2026-09-20 10:00:00', updated_at: '2026-09-20 10:00:00' },
    { id: 4, lead_id: 2, customer_id: 2, customer_name: 'Bob Martinez',  lead_title: 'Retail POS Integration Suite',     title: 'Global Retail POS Rollout',        stage: 'proposal',     value: 42000,  close_date: '2026-11-15', notes: 'Second proposal revision. Price negotiation ongoing.', created_at: '2026-09-14 11:00:00', updated_at: '2026-09-24 09:00:00' },
    { id: 5, lead_id: null, customer_id: 4, customer_name: 'David Lee', lead_title: null,                               title: 'InfraCloud Expansion Module',       stage: 'closed-won',   value: 75000,  close_date: '2026-09-01', notes: 'Signed and invoiced. Implementation begins Q4.', created_at: '2026-08-01 09:00:00', updated_at: '2026-09-01 15:00:00' },
    { id: 6, lead_id: null, customer_id: 1, customer_name: 'Alice Johnson', lead_title: null,                           title: 'TechCorp Premium Support Pack',    stage: 'closed-won',   value: 45000,  close_date: '2026-07-15', notes: 'Annual support renewal closed.', created_at: '2026-07-01 09:00:00', updated_at: '2026-07-15 12:00:00' },
    { id: 7, lead_id: null, customer_id: 5, customer_name: 'Eva Patel',  lead_title: null,                               title: 'DesignHub Creative Suite',         stage: 'closed-lost',  value: 18000,  close_date: '2026-08-20', notes: 'Budget cut. May revisit in H1 2027.', created_at: '2026-07-20 09:00:00', updated_at: '2026-08-20 16:00:00' },
  ],
  workflow_history: [
    { id: 1, entity_type: 'lead', entity_id: 4, from_status: 'new',        to_status: 'contacted',  changed_at: '2026-08-10 10:00:00', notes: null },
    { id: 2, entity_type: 'lead', entity_id: 4, from_status: 'contacted',  to_status: 'qualified',  changed_at: '2026-08-20 11:00:00', notes: null },
    { id: 3, entity_type: 'lead', entity_id: 4, from_status: 'qualified',  to_status: 'converted',  changed_at: '2026-09-05 09:00:00', notes: 'Converted to Sales Opportunity Deal' },
    { id: 4, entity_type: 'deal', entity_id: 1, from_status: 'prospect',   to_status: 'proposal',   changed_at: '2026-09-08 14:00:00', notes: null },
    { id: 5, entity_type: 'deal', entity_id: 1, from_status: 'proposal',   to_status: 'negotiation',changed_at: '2026-09-18 09:00:00', notes: null },
    { id: 6, entity_type: 'deal', entity_id: 5, from_status: 'negotiation',to_status: 'closed-won', changed_at: '2026-09-01 15:00:00', notes: null },
    { id: 7, entity_type: 'deal', entity_id: 6, from_status: 'proposal',   to_status: 'closed-won', changed_at: '2026-07-15 12:00:00', notes: null },
    { id: 8, entity_type: 'followup', entity_id: 3, from_status: 'pending', to_status: 'completed', changed_at: '2026-09-15 16:00:00', notes: null },
    { id: 9, entity_type: 'deal', entity_id: 7, from_status: 'proposal',   to_status: 'closed-lost',changed_at: '2026-08-20 16:00:00', notes: null },
    { id: 10,entity_type: 'lead', entity_id: 1, from_status: 'new',        to_status: 'contacted',  changed_at: '2026-08-05 10:00:00', notes: null },
  ],
}

// ─── Storage helpers ──────────────────────────────────────────────────────────
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_DATA))
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_DATA))
  }
}

function save(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
}

// ─── Transition maps ──────────────────────────────────────────────────────────
const LEAD_TRANSITIONS = {
  new: ['contacted'],
  contacted: ['qualified', 'unqualified'],
  qualified: ['converted', 'unqualified'],
  unqualified: ['new'],
  converted: [],
}

const DEAL_TRANSITIONS = {
  prospect: ['proposal'],
  proposal: ['negotiation', 'closed-won', 'closed-lost'],
  negotiation: ['closed-won', 'closed-lost'],
  'closed-won': [],
  'closed-lost': ['prospect'],
}

// ─── Mock response wrapper ────────────────────────────────────────────────────
function ok(data, status = 200) {
  return Promise.resolve({ data, status })
}
function err(msg, status = 400) {
  const e = new Error(msg)
  e.response = { data: { error: msg }, status }
  return Promise.reject(e)
}
function delay(ms = 120) {
  return new Promise(r => setTimeout(r, ms))
}

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────
export const getCustomers = async (params) => {
  await delay()
  const store = load()
  let rows = store.customers
  if (params?.status && params.status !== 'all') rows = rows.filter(c => c.status === params.status)
  return ok(rows)
}

export const getCustomer = async (id) => {
  await delay()
  const store = load()
  const row = store.customers.find(c => c.id === Number(id))
  if (!row) return err('Customer not found', 404)
  return ok(row)
}

export const getCustomerProfile = async (id) => {
  await delay()
  const store = load()
  const customer = store.customers.find(c => c.id === Number(id))
  if (!customer) return err('Customer not found', 404)
  const leads = store.leads.filter(l => l.customer_id === Number(id))
  const deals = store.deals.filter(d => d.customer_id === Number(id))
  const followups = store.followups.filter(f => f.customer_id === Number(id))
  const wonDeals = deals.filter(d => d.stage === 'closed-won')
  const activeDeals = deals.filter(d => !['closed-won','closed-lost'].includes(d.stage))
  const lifetimeValue = wonDeals.reduce((s, d) => s + Number(d.value || 0), 0)
  const openPipelineValue = activeDeals.reduce((s, d) => s + Number(d.value || 0), 0)
  const history = store.workflow_history
    .filter(h => deals.some(d => d.id === h.entity_id && h.entity_type === 'deal') ||
                 leads.some(l => l.id === h.entity_id && h.entity_type === 'lead'))
    .slice(0, 15)
  return ok({ customer: { ...customer, lifetime_value: lifetimeValue, pipeline_value: openPipelineValue }, metrics: { lifetimeValue, openPipelineValue, dealsCount: deals.length, wonDealsCount: wonDeals.length, leadsCount: leads.length, followupsCount: followups.length }, leads, deals, followups, history })
}

export const createCustomer = async (data) => {
  await delay()
  if (!data.name || !data.email) return err('name and email are required')
  const store = load()
  if (store.customers.find(c => c.email === data.email)) return err('Email already exists', 409)
  const newRow = { id: uid(store.customers), ...data, status: data.status || 'active', lifetime_value: 0, pipeline_value: 0, health_grade: 'C', health_label: 'Prospect Account', created_at: now(), updated_at: now() }
  store.customers.unshift(newRow)
  save(store)
  return ok(newRow, 201)
}

export const updateCustomer = async (id, data) => {
  await delay()
  const store = load()
  const idx = store.customers.findIndex(c => c.id === Number(id))
  if (idx === -1) return err('Customer not found', 404)
  store.customers[idx] = { ...store.customers[idx], ...data, id: Number(id), updated_at: now() }
  save(store)
  return ok(store.customers[idx])
}

export const deleteCustomer = async (id) => {
  await delay()
  const store = load()
  const idx = store.customers.findIndex(c => c.id === Number(id))
  if (idx === -1) return err('Customer not found', 404)
  store.customers.splice(idx, 1)
  // ON DELETE SET NULL for leads & deals
  store.leads.forEach(l => { if (l.customer_id === Number(id)) { l.customer_id = null; l.customer_name = null } })
  store.deals.forEach(d => { if (d.customer_id === Number(id)) { d.customer_id = null; d.customer_name = null } })
  store.followups = store.followups.filter(f => f.customer_id !== Number(id))
  save(store)
  return ok({ deleted: true })
}

export const bulkCustomers = async ({ action, ids, status }) => {
  await delay()
  if (!ids?.length) return err('ids required')
  const store = load()
  if (action === 'delete') {
    store.customers = store.customers.filter(c => !ids.includes(c.id))
  } else if (action === 'status') {
    store.customers.forEach(c => { if (ids.includes(c.id)) { c.status = status; c.updated_at = now() } })
  }
  save(store)
  return ok({ success: true, count: ids.length })
}

// ─── LEADS ────────────────────────────────────────────────────────────────────
export const getLeads = async (params) => {
  await delay()
  const store = load()
  let rows = store.leads
  if (params?.status) rows = rows.filter(l => l.status === params.status)
  if (params?.customer_id) rows = rows.filter(l => l.customer_id === Number(params.customer_id))
  return ok(rows)
}

export const getLead = async (id) => {
  await delay()
  const store = load()
  const row = store.leads.find(l => l.id === Number(id))
  if (!row) return err('Lead not found', 404)
  return ok(row)
}

export const createLead = async (data) => {
  await delay()
  if (!data.title) return err('title is required')
  const store = load()
  const customer = data.customer_id ? store.customers.find(c => c.id === Number(data.customer_id)) : null
  const newRow = { id: uid(store.leads), ...data, customer_id: data.customer_id ? Number(data.customer_id) : null, customer_name: customer?.name ?? null, status: data.status || 'new', value: Number(data.value) || 0, created_at: now(), updated_at: now() }
  store.leads.unshift(newRow)
  save(store)
  return ok(newRow, 201)
}

export const updateLead = async (id, data) => {
  await delay()
  const store = load()
  const idx = store.leads.findIndex(l => l.id === Number(id))
  if (idx === -1) return err('Lead not found', 404)
  const customer = data.customer_id ? store.customers.find(c => c.id === Number(data.customer_id)) : null
  store.leads[idx] = { ...store.leads[idx], ...data, id: Number(id), customer_name: customer?.name ?? store.leads[idx].customer_name, updated_at: now() }
  save(store)
  return ok(store.leads[idx])
}

export const deleteLead = async (id) => {
  await delay()
  const store = load()
  const idx = store.leads.findIndex(l => l.id === Number(id))
  if (idx === -1) return err('Lead not found', 404)
  store.leads.splice(idx, 1)
  save(store)
  return ok({ deleted: true })
}

export const transitionLead = async (id, status) => {
  await delay()
  const store = load()
  const idx = store.leads.findIndex(l => l.id === Number(id))
  if (idx === -1) return err('Lead not found', 404)
  const lead = store.leads[idx]
  const allowed = LEAD_TRANSITIONS[lead.status] ?? []
  if (!allowed.includes(status)) return err(`Invalid transition from '${lead.status}' to '${status}'. Allowed: ${allowed.join(', ') || 'none'}`)
  const prev = lead.status
  store.leads[idx] = { ...lead, status, updated_at: now() }
  store.workflow_history.unshift({ id: uid(store.workflow_history), entity_type: 'lead', entity_id: Number(id), from_status: prev, to_status: status, changed_at: now(), notes: null })
  save(store)
  return ok(store.leads[idx])
}

export const convertLead = async (id, data) => {
  await delay()
  const store = load()
  const lIdx = store.leads.findIndex(l => l.id === Number(id))
  if (lIdx === -1) return err('Lead not found', 404)
  const lead = store.leads[lIdx]
  if (lead.status === 'converted') return err('Lead already converted', 400)
  const prev = lead.status
  store.leads[lIdx] = { ...lead, status: 'converted', updated_at: now() }
  store.workflow_history.unshift({ id: uid(store.workflow_history), entity_type: 'lead', entity_id: Number(id), from_status: prev, to_status: 'converted', changed_at: now(), notes: 'Converted to Sales Opportunity Deal' })
  const customer = lead.customer_id ? store.customers.find(c => c.id === lead.customer_id) : null
  const newDeal = { id: uid(store.deals), lead_id: Number(id), customer_id: lead.customer_id, customer_name: customer?.name ?? null, lead_title: lead.title, title: data.dealTitle || lead.title, stage: data.stage || 'proposal', value: Number(data.value) || Number(lead.value) || 0, close_date: data.closeDate || null, notes: `Converted from lead: ${lead.title}`, created_at: now(), updated_at: now() }
  store.deals.unshift(newDeal)
  store.workflow_history.unshift({ id: uid(store.workflow_history), entity_type: 'deal', entity_id: newDeal.id, from_status: 'prospect', to_status: newDeal.stage, changed_at: now(), notes: 'Spawned from lead conversion' })
  let followup = null
  if (data.createKickoffTask) {
    const sched = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16)
    followup = { id: uid(store.followups), lead_id: Number(id), customer_id: lead.customer_id, customer_name: customer?.name ?? null, lead_title: lead.title, type: 'meeting', status: 'pending', scheduled_at: sched, notes: `Discovery kickoff for: ${newDeal.title}`, created_at: now(), updated_at: now() }
    store.followups.unshift(followup)
  }
  save(store)
  return ok({ success: true, lead: store.leads[lIdx], deal: newDeal, followup, message: `Lead converted to Deal #${newDeal.id}!` })
}

export const bulkLeads = async ({ action, ids, status }) => {
  await delay()
  if (!ids?.length) return err('ids required')
  const store = load()
  if (action === 'delete') {
    store.leads = store.leads.filter(l => !ids.includes(l.id))
  } else if (action === 'transition') {
    store.leads.forEach(l => {
      if (ids.includes(l.id)) {
        const prev = l.status; l.status = status; l.updated_at = now()
        store.workflow_history.unshift({ id: uid(store.workflow_history), entity_type: 'lead', entity_id: l.id, from_status: 'bulk_action', to_status: status, changed_at: now(), notes: 'Batch status change' })
      }
    })
  }
  save(store)
  return ok({ success: true, count: ids.length })
}

// ─── FOLLOW-UPS ───────────────────────────────────────────────────────────────
export const getFollowups = async (params) => {
  await delay()
  const store = load()
  let rows = store.followups
  if (params?.status) rows = rows.filter(f => f.status === params.status)
  if (params?.lead_id) rows = rows.filter(f => f.lead_id === Number(params.lead_id))
  if (params?.customer_id) rows = rows.filter(f => f.customer_id === Number(params.customer_id))
  return ok(rows)
}

export const getFollowup = async (id) => {
  await delay()
  const store = load()
  const row = store.followups.find(f => f.id === Number(id))
  if (!row) return err('Follow-up not found', 404)
  return ok(row)
}

export const createFollowup = async (data) => {
  await delay()
  if (!data.scheduled_at) return err('scheduled_at is required')
  const store = load()
  const customer = data.customer_id ? store.customers.find(c => c.id === Number(data.customer_id)) : null
  const lead = data.lead_id ? store.leads.find(l => l.id === Number(data.lead_id)) : null
  const newRow = { id: uid(store.followups), ...data, customer_id: data.customer_id ? Number(data.customer_id) : null, lead_id: data.lead_id ? Number(data.lead_id) : null, customer_name: customer?.name ?? null, lead_title: lead?.title ?? null, status: data.status || 'pending', created_at: now(), updated_at: now() }
  store.followups.unshift(newRow)
  save(store)
  return ok(newRow, 201)
}

export const updateFollowup = async (id, data) => {
  await delay()
  const store = load()
  const idx = store.followups.findIndex(f => f.id === Number(id))
  if (idx === -1) return err('Follow-up not found', 404)
  const prev = store.followups[idx].status
  store.followups[idx] = { ...store.followups[idx], ...data, id: Number(id), updated_at: now() }
  if (data.status && data.status !== prev) {
    store.workflow_history.unshift({ id: uid(store.workflow_history), entity_type: 'followup', entity_id: Number(id), from_status: prev, to_status: data.status, changed_at: now(), notes: null })
  }
  save(store)
  return ok(store.followups[idx])
}

export const deleteFollowup = async (id) => {
  await delay()
  const store = load()
  const idx = store.followups.findIndex(f => f.id === Number(id))
  if (idx === -1) return err('Follow-up not found', 404)
  store.followups.splice(idx, 1)
  save(store)
  return ok({ deleted: true })
}

export const rescheduleFollowup = async (id, days) => {
  await delay()
  const store = load()
  const idx = store.followups.findIndex(f => f.id === Number(id))
  if (idx === -1) return err('Follow-up not found', 404)
  const newDate = new Date(Date.now() + days * 86400000).toISOString().slice(0, 16)
  store.followups[idx] = { ...store.followups[idx], scheduled_at: newDate, updated_at: now() }
  save(store)
  return ok(store.followups[idx])
}

export const bulkFollowups = async ({ action, ids }) => {
  await delay()
  if (!ids?.length) return err('ids required')
  const store = load()
  if (action === 'delete') store.followups = store.followups.filter(f => !ids.includes(f.id))
  save(store)
  return ok({ success: true, count: ids.length })
}

// ─── DEALS ────────────────────────────────────────────────────────────────────
export const getDeals = async (params) => {
  await delay()
  const store = load()
  let rows = store.deals
  if (params?.stage) rows = rows.filter(d => d.stage === params.stage)
  if (params?.customer_id) rows = rows.filter(d => d.customer_id === Number(params.customer_id))
  return ok(rows)
}

export const getDeal = async (id) => {
  await delay()
  const store = load()
  const row = store.deals.find(d => d.id === Number(id))
  if (!row) return err('Deal not found', 404)
  return ok(row)
}

export const createDeal = async (data) => {
  await delay()
  if (!data.title) return err('title is required')
  const store = load()
  const customer = data.customer_id ? store.customers.find(c => c.id === Number(data.customer_id)) : null
  const lead = data.lead_id ? store.leads.find(l => l.id === Number(data.lead_id)) : null
  const newRow = { id: uid(store.deals), ...data, customer_id: data.customer_id ? Number(data.customer_id) : null, lead_id: data.lead_id ? Number(data.lead_id) : null, customer_name: customer?.name ?? null, lead_title: lead?.title ?? null, stage: data.stage || 'prospect', value: Number(data.value) || 0, created_at: now(), updated_at: now() }
  store.deals.unshift(newRow)
  save(store)
  return ok(newRow, 201)
}

export const updateDeal = async (id, data) => {
  await delay()
  const store = load()
  const idx = store.deals.findIndex(d => d.id === Number(id))
  if (idx === -1) return err('Deal not found', 404)
  store.deals[idx] = { ...store.deals[idx], ...data, id: Number(id), updated_at: now() }
  save(store)
  return ok(store.deals[idx])
}

export const deleteDeal = async (id) => {
  await delay()
  const store = load()
  const idx = store.deals.findIndex(d => d.id === Number(id))
  if (idx === -1) return err('Deal not found', 404)
  store.deals.splice(idx, 1)
  save(store)
  return ok({ deleted: true })
}

export const transitionDeal = async (id, stage) => {
  await delay()
  const store = load()
  const idx = store.deals.findIndex(d => d.id === Number(id))
  if (idx === -1) return err('Deal not found', 404)
  const deal = store.deals[idx]
  const allowed = DEAL_TRANSITIONS[deal.stage] ?? []
  if (!allowed.includes(stage)) return err(`Invalid transition from '${deal.stage}' to '${stage}'. Allowed: ${allowed.join(', ') || 'none'}`)
  const prev = deal.stage
  store.deals[idx] = { ...deal, stage, updated_at: now() }
  store.workflow_history.unshift({ id: uid(store.workflow_history), entity_type: 'deal', entity_id: Number(id), from_status: prev, to_status: stage, changed_at: now(), notes: null })
  save(store)
  return ok(store.deals[idx])
}

export const duplicateDeal = async (id) => {
  await delay()
  const store = load()
  const original = store.deals.find(d => d.id === Number(id))
  if (!original) return err('Deal not found', 404)
  const copy = { ...original, id: uid(store.deals), title: `${original.title} (Copy)`, stage: 'prospect', created_at: now(), updated_at: now() }
  store.deals.unshift(copy)
  save(store)
  return ok(copy, 201)
}

export const bulkDeals = async ({ action, ids }) => {
  await delay()
  if (!ids?.length) return err('ids required')
  const store = load()
  if (action === 'delete') store.deals = store.deals.filter(d => !ids.includes(d.id))
  save(store)
  return ok({ success: true, count: ids.length })
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
export const getDashboard = async () => {
  await delay()
  const store = load()
  const { customers, leads, deals, followups, workflow_history } = store

  const customerCount = customers.length
  const activeCustomers = customers.filter(c => c.status === 'active').length
  const leadCount = leads.length
  const dealCount = deals.length

  const leadStatuses = ['new','contacted','qualified','unqualified','converted']
  const leadsByStatus = Object.fromEntries(leadStatuses.map(s => [s, leads.filter(l => l.status === s).length]))

  const dealStages = ['prospect','proposal','negotiation','closed-won','closed-lost']
  const dealsByStage = Object.fromEntries(dealStages.map(s => [s, deals.filter(d => d.stage === s).length]))

  const activeDealValues = deals.filter(d => !['closed-won','closed-lost'].includes(d.stage))
  const totalPipelineValue = activeDealValues.reduce((s, d) => s + Number(d.value || 0), 0)

  const weightedPipelineValue = Math.round(activeDealValues.reduce((s, d) => {
    const weight = { prospect: 0.2, proposal: 0.5, negotiation: 0.8 }[d.stage] ?? 0
    return s + Number(d.value || 0) * weight
  }, 0))

  const closedWonValue = deals.filter(d => d.stage === 'closed-won').reduce((s, d) => s + Number(d.value || 0), 0)
  const monthlyTarget = 250000
  const targetProgress = Math.min(100, Math.round((closedWonValue / monthlyTarget) * 100))

  const followupCount = followups.length
  const pendingFollowups = followups.filter(f => f.status === 'pending').length
  const overdueFollowups = followups.filter(f => f.status === 'pending' && new Date(f.scheduled_at) < new Date()).length

  const sources = [...new Set(leads.map(l => l.source))]
  const channelStats = sources.map(source => ({
    source,
    total_leads: leads.filter(l => l.source === source).length,
    converted_count: leads.filter(l => l.source === source && l.status === 'converted').length,
    total_value: leads.filter(l => l.source === source).reduce((s, l) => s + Number(l.value || 0), 0),
  }))

  const customerRevenue = customers.map(c => ({
    id: c.id, name: c.name, company: c.company,
    revenue: deals.filter(d => d.customer_id === c.id && d.stage === 'closed-won').reduce((s, d) => s + Number(d.value || 0), 0),
  })).filter(c => c.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  const recentActivity = [...workflow_history].sort((a, b) => b.changed_at.localeCompare(a.changed_at)).slice(0, 10)

  return ok({ customerCount, activeCustomers, leadCount, leadsByStatus, dealCount, dealsByStage, totalPipelineValue, weightedPipelineValue, closedWonValue, monthlyTarget, targetProgress, followupCount, pendingFollowups, overdueFollowups, channelStats, topAccounts: customerRevenue, recentActivity })
}

export const quickLogActivity = async (data) => {
  await delay()
  if (!data.notes?.trim()) return err('Notes are required')
  const store = load()
  const newRow = { id: uid(store.followups), customer_id: data.customer_id ? Number(data.customer_id) : null, lead_id: null, type: data.type || 'call', status: 'completed', scheduled_at: new Date().toISOString().slice(0, 16), notes: data.notes, created_at: now(), updated_at: now() }
  store.followups.unshift(newRow)
  store.workflow_history.unshift({ id: uid(store.workflow_history), entity_type: 'followup', entity_id: newRow.id, from_status: 'none', to_status: 'completed', changed_at: now(), notes: `Quick log: ${data.notes}` })
  save(store)
  return ok({ success: true, id: newRow.id, message: 'Activity logged!' })
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
export const getAnalytics = async () => {
  await delay()
  const store = load()
  const { leads, deals, followups } = store
  const convertedLeads = leads.filter(l => l.status === 'converted').length
  const leadConversionRate = leads.length ? Math.round((convertedLeads / leads.length) * 100) : 0
  const wonDeals = deals.filter(d => d.stage === 'closed-won').length
  const closedDeals = deals.filter(d => ['closed-won','closed-lost'].includes(d.stage)).length
  const winRate = closedDeals ? Math.round((wonDeals / closedDeals) * 100) : 0
  const completedFollowups = followups.filter(f => f.status === 'completed').length
  const followupCompletionRate = followups.length ? Math.round((completedFollowups / followups.length) * 100) : 0
  const healthScore = Math.round((winRate * 0.4) + (leadConversionRate * 0.3) + (followupCompletionRate * 0.3))
  const activeDealValues = deals.filter(d => !['closed-won','closed-lost'].includes(d.stage))
  const weightedPipeline = Math.round(activeDealValues.reduce((s, d) => {
    const weight = { prospect: 0.2, proposal: 0.5, negotiation: 0.8 }[d.stage] ?? 0
    return s + Number(d.value || 0) * weight
  }, 0))
  return ok({ performance: { convertedLeads, leadConversionRate, winRate, followupCompletionRate, healthScore }, forecast: { weightedPipeline } })
}

// ─── SEARCH ───────────────────────────────────────────────────────────────────
export const searchAll = async (q) => {
  await delay()
  if (!q) return ok([])
  const store = load()
  const term = q.toLowerCase()
  const results = [
    ...store.customers.filter(c => c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term)).map(c => ({ type: 'customer', ...c })),
    ...store.leads.filter(l => l.title.toLowerCase().includes(term)).map(l => ({ type: 'lead', ...l })),
    ...store.deals.filter(d => d.title.toLowerCase().includes(term)).map(d => ({ type: 'deal', ...d })),
  ].slice(0, 20)
  return ok(results)
}

// ─── EXPORT (no-op in demo) ───────────────────────────────────────────────────
export const exportData = async (type) => {
  await delay()
  return ok(new Blob([`Demo export for: ${type}`], { type: 'text/plain' }))
}
