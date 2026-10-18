// ─── API ──────────────────────────────────────────────────────────────────────
// VITE_USE_MOCK=true  → GitHub Pages / static demo (localStorage mock)
// default            → local dev / self-hosted (real Express backend via proxy)

import axios from 'axios'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// ─── Real backend helpers (only used when not mocking) ───────────────────────
const base = axios.create({ baseURL: '/api' })
const _get  = (url, cfg)  => base.get(url, cfg)
const _post = (url, data) => base.post(url, data)
const _put  = (url, data) => base.put(url, data)
const _del  = (url)       => base.delete(url)

// ─── Shared real-backend API ─────────────────────────────────────────────────
const realApi = {
  getCustomers:       (p)       => _get('/customers', { params: p }),
  getCustomer:        (id)      => _get(`/customers/${id}`),
  getCustomerProfile: (id)      => _get(`/customers/${id}/profile`),
  createCustomer:     (d)       => _post('/customers', d),
  updateCustomer:     (id, d)   => _put(`/customers/${id}`, d),
  deleteCustomer:     (id)      => _del(`/customers/${id}`),
  bulkCustomers:      (d)       => _post('/customers/bulk', d),

  getLeads:           (p)       => _get('/leads', { params: p }),
  getLead:            (id)      => _get(`/leads/${id}`),
  createLead:         (d)       => _post('/leads', d),
  updateLead:         (id, d)   => _put(`/leads/${id}`, d),
  deleteLead:         (id)      => _del(`/leads/${id}`),
  transitionLead:     (id, s)   => _post(`/leads/${id}/transition`, { status: s }),
  convertLead:        (id, d)   => _post(`/leads/${id}/convert`, d),
  bulkLeads:          (d)       => _post('/leads/bulk', d),

  getFollowups:       (p)       => _get('/followups', { params: p }),
  getFollowup:        (id)      => _get(`/followups/${id}`),
  createFollowup:     (d)       => _post('/followups', d),
  updateFollowup:     (id, d)   => _put(`/followups/${id}`, d),
  deleteFollowup:     (id)      => _del(`/followups/${id}`),
  rescheduleFollowup: (id, days)=> _post(`/followups/${id}/reschedule`, { days }),
  bulkFollowups:      (d)       => _post('/followups/bulk', d),

  getDeals:           (p)       => _get('/deals', { params: p }),
  getDeal:            (id)      => _get(`/deals/${id}`),
  createDeal:         (d)       => _post('/deals', d),
  updateDeal:         (id, d)   => _put(`/deals/${id}`, d),
  deleteDeal:         (id)      => _del(`/deals/${id}`),
  transitionDeal:     (id, s)   => _post(`/deals/${id}/transition`, { stage: s }),
  duplicateDeal:      (id)      => _post(`/deals/${id}/duplicate`),
  bulkDeals:          (d)       => _post('/deals/bulk', d),

  getDashboard:       ()        => _get('/dashboard'),
  quickLogActivity:   (d)       => _post('/dashboard/quick-log', d),
  getAnalytics:       ()        => _get('/analytics'),
  searchAll:          (q)       => _get('/search', { params: { q } }),
  exportData:         (type)    => _get(`/export/${type}`, { responseType: 'blob' }),
}

// ─── Mock helpers (only imported/used when VITE_USE_MOCK=true) ───────────────
// Import is static so Vite can tree-shake it when not mocking.
import * as mock from './mockData.js'

const mockApi = {
  getCustomers:       mock.getCustomers,
  getCustomer:        mock.getCustomer,
  getCustomerProfile: mock.getCustomerProfile,
  createCustomer:     mock.createCustomer,
  updateCustomer:     mock.updateCustomer,
  deleteCustomer:     mock.deleteCustomer,
  bulkCustomers:      mock.bulkCustomers,

  getLeads:           mock.getLeads,
  getLead:            mock.getLead,
  createLead:         mock.createLead,
  updateLead:         mock.updateLead,
  deleteLead:         mock.deleteLead,
  transitionLead:     mock.transitionLead,
  convertLead:        mock.convertLead,
  bulkLeads:          mock.bulkLeads,

  getFollowups:       mock.getFollowups,
  getFollowup:        mock.getFollowup,
  createFollowup:     mock.createFollowup,
  updateFollowup:     mock.updateFollowup,
  deleteFollowup:     mock.deleteFollowup,
  rescheduleFollowup: mock.rescheduleFollowup,
  bulkFollowups:      mock.bulkFollowups,

  getDeals:           mock.getDeals,
  getDeal:            mock.getDeal,
  createDeal:         mock.createDeal,
  updateDeal:         mock.updateDeal,
  deleteDeal:         mock.deleteDeal,
  transitionDeal:     mock.transitionDeal,
  duplicateDeal:      mock.duplicateDeal,
  bulkDeals:          mock.bulkDeals,

  getDashboard:       mock.getDashboard,
  quickLogActivity:   mock.quickLogActivity,
  getAnalytics:       mock.getAnalytics,
  searchAll:          mock.searchAll,
  exportData:         mock.exportData,
}

// ─── Export the right implementation ─────────────────────────────────────────
const chosen = USE_MOCK ? mockApi : realApi

export const {
  getCustomers, getCustomer, getCustomerProfile,
  createCustomer, updateCustomer, deleteCustomer, bulkCustomers,
  getLeads, getLead, createLead, updateLead, deleteLead,
  transitionLead, convertLead, bulkLeads,
  getFollowups, getFollowup, createFollowup, updateFollowup,
  deleteFollowup, rescheduleFollowup, bulkFollowups,
  getDeals, getDeal, createDeal, updateDeal, deleteDeal,
  transitionDeal, duplicateDeal, bulkDeals,
  getDashboard, quickLogActivity, getAnalytics,
  searchAll, exportData,
} = chosen
