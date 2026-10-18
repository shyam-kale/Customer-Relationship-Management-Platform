import { useEffect, useState, useMemo } from 'react'
import confetti from 'canvas-confetti'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import StatusBadge from '../components/StatusBadge'
import {
  getDeals,
  createDeal,
  updateDeal,
  deleteDeal,
  transitionDeal,
  duplicateDeal,
  getCustomers,
  getLeads,
} from '../api'
import { dealStageColors, DEAL_TRANSITIONS } from '../utils/statusColors'
import {
  Kanban,
  LayoutGrid,
  List,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Building2,
  Target,
  Calendar,
  Edit3,
  Trash2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Copy,
  Percent,
  X
} from 'lucide-react'

const STAGES = [
  { id: 'prospect', label: 'Prospect', step: 1, accent: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  { id: 'proposal', label: 'Proposal', step: 2, accent: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'negotiation', label: 'Negotiation', step: 3, accent: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'closed-won', label: 'Closed Won', step: 4, accent: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'closed-lost', label: 'Closed Lost', step: 4, accent: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
]

const BLANK = {
  title: '',
  customer_id: '',
  lead_id: '',
  stage: 'prospect',
  value: 0,
  close_date: '',
  notes: '',
}

export default function Pipeline() {
  const [deals, setDeals] = useState([])
  const [customers, setCustomers] = useState([])
  const [leads, setLeads] = useState([])
  const [viewMode, setViewMode] = useState('kanban') // 'kanban' | 'table'
  const [search, setSearch] = useState('')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [confirm, setConfirm] = useState(null)
  const [transModal, setTransModal] = useState(null)
  const [transTo, setTransTo] = useState('')
  const [err, setErr] = useState('')
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  const loadData = async () => {
    try {
      const [dRes, cRes, lRes] = await Promise.all([
        getDeals(),
        getCustomers(),
        getLeads(),
      ])
      setDeals(dRes.data)
      setCustomers(cRes.data)
      setLeads(lRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // KPI aggregates
  const stats = useMemo(() => {
    const activeDeals = deals.filter(
      (d) => d.stage !== 'closed-won' && d.stage !== 'closed-lost'
    )
    const pipelineVal = activeDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0)
    const weightedVal = activeDeals.reduce((sum, d) => sum + (Number(d.weighted_value) || 0), 0)
    const wonVal = deals
      .filter((d) => d.stage === 'closed-won')
      .reduce((sum, d) => sum + (Number(d.value) || 0), 0)
    const wonCount = deals.filter((d) => d.stage === 'closed-won').length
    const lostCount = deals.filter((d) => d.stage === 'closed-lost').length
    const totalFinished = wonCount + lostCount
    const winRate = totalFinished > 0 ? Math.round((wonCount / totalFinished) * 100) : 0

    return {
      activeCount: activeDeals.length,
      pipelineVal,
      weightedVal,
      wonVal,
      winRate,
      wonCount,
      totalCount: deals.length,
    }
  }, [deals])

  const openAdd = () => {
    setEditing(null)
    const today = new Date().toISOString().slice(0, 10)
    setForm({ ...BLANK, close_date: today })
    setErr('')
    setModal(true)
  }

  const openEdit = (deal) => {
    setEditing(deal)
    setForm({
      title: deal.title,
      customer_id: deal.customer_id ?? '',
      lead_id: deal.lead_id ?? '',
      stage: deal.stage ?? 'prospect',
      value: deal.value ?? 0,
      close_date: deal.close_date ? deal.close_date.slice(0, 10) : '',
      notes: deal.notes ?? '',
    })
    setErr('')
    setModal(true)
  }

  const openTrans = (deal) => {
    const options = DEAL_TRANSITIONS[deal.stage] ?? []
    setTransTo(options[0] ?? '')
    setTransModal(deal)
  }

  const fireWonConfetti = () => {
    try {
      confetti({
        particleCount: 110,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#10b981', '#f59e0b', '#3b82f6'],
      })
    } catch (_) {}
  }

  const handleQuickTransition = async (dealId, nextStage) => {
    try {
      await transitionDeal(dealId, nextStage)
      if (nextStage === 'closed-won') {
        fireWonConfetti()
        showToast('Deal closed as WON! 🚀 Lifetime revenue recorded')
      } else {
        showToast(`Deal advanced to ${nextStage}`)
      }
      loadData()
    } catch (e) {
      alert(e.response?.data?.error ?? 'Transition failed')
    }
  }

  const handleDuplicate = async (dealId) => {
    try {
      const res = await duplicateDeal(dealId)
      showToast(`Cloned deal #${res.data.id} created in Prospect stage!`)
      loadData()
    } catch (e) {
      alert('Could not clone deal')
    }
  }

  const handleSave = async (e) => {
    e?.preventDefault()
    if (!form.title.trim()) {
      setErr('Title is required')
      return
    }
    setErr('')
    try {
      const payload = {
        ...form,
        customer_id: form.customer_id ? Number(form.customer_id) : null,
        lead_id: form.lead_id ? Number(form.lead_id) : null,
        value: Number(form.value) || 0,
        close_date: form.close_date || null,
      }
      if (editing) {
        await updateDeal(editing.id, payload)
        showToast('Opportunity updated')
      } else {
        await createDeal(payload)
        showToast('New opportunity created in Pipeline')
      }
      setModal(false)
      loadData()
    } catch (e) {
      setErr(e.response?.data?.error ?? 'Error saving deal')
    }
  }

  const handleApplyTransition = async () => {
    if (!transTo || !transModal) return
    try {
      await transitionDeal(transModal.id, transTo)
      if (transTo === 'closed-won') {
        fireWonConfetti()
        showToast('Deal closed as WON! 🚀')
      } else {
        showToast(`Deal advanced to ${transTo}`)
      }
      setTransModal(null)
      loadData()
    } catch (e) {
      alert(e.response?.data?.error ?? 'Transition failed')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteDeal(id)
      showToast('Deal deleted')
      loadData()
    } catch (e) {
      alert('Could not delete deal')
    }
  }

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      if (customerFilter !== 'all' && Number(d.customer_id) !== Number(customerFilter)) {
        return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchTitle = (d.title ?? '').toLowerCase().includes(q)
        const matchCustomer = (d.customer_name ?? '').toLowerCase().includes(q)
        const matchLead = (d.lead_title ?? '').toLowerCase().includes(q)
        if (!matchTitle && !matchCustomer && !matchLead) return false
      }
      return true
    })
  }, [deals, customerFilter, search])

  // Group deals by stage for kanban
  const stageGroups = useMemo(() => {
    const groups = {}
    for (const s of STAGES) {
      groups[s.id] = []
    }
    for (const d of filteredDeals) {
      if (groups[d.stage]) {
        groups[d.stage].push(d)
      }
    }
    return groups
  }, [filteredDeals])

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Toast Feedback */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 text-xs font-bold flex items-center gap-3 animate-scaleIn">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toast}</span>
          <button onClick={() => setToast('')} className="text-slate-400 hover:text-white ml-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              Deal Intelligence
            </span>
            <span className="text-xs text-slate-400 font-medium">Weighted Forecast Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Revenue Pipeline
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Visualize opportunity progression, calculate weighted forecasts, and clone deals in seconds.
          </p>
        </div>

        {/* View Switcher & Action */}
        <div className="flex items-center gap-2.5">
          <div className="bg-slate-200/80 p-1 rounded-xl flex items-center text-xs font-bold">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          <button onClick={openAdd} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span>Add Deal</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Active Pipeline</p>
            <p className="text-2xl font-black text-indigo-600 mt-0.5">
              ${stats.pipelineVal.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">{stats.activeCount} open opportunities</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Weighted Forecast</p>
            <p className="text-2xl font-black text-indigo-700 mt-0.5">
              ${stats.weightedVal.toLocaleString()}
            </p>
            <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">Probability-adjusted</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Percent className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Won Revenue</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">
              ${stats.wonVal.toLocaleString()}
            </p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">{stats.wonCount} deals closed ({stats.winRate}% win rate)</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Opportunities</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{stats.totalCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">All tracked stages</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
            <Kanban className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search deals, accounts, leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 py-2"
            />
          </div>

          <div className="w-full sm:w-auto">
            <select
              className="input py-2 text-xs font-medium"
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
            >
              <option value="all">All Accounts</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.company ? `(${c.company})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(search || customerFilter !== 'all') && (
          <button
            onClick={() => {
              setSearch('')
              setCustomerFilter('all')
            }}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Kanban Board View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
          {STAGES.map((col) => {
            const stageDeals = stageGroups[col.id] || []
            const colTotal = stageDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0)

            return (
              <div
                key={col.id}
                className="bg-slate-100/70 rounded-2xl border border-slate-200/80 p-3 min-h-[520px] flex flex-col"
              >
                {/* Column Header */}
                <div className="p-3 rounded-xl bg-white shadow-xs border border-slate-200/90 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${col.accent}`} />
                      <h3 className="font-bold text-xs uppercase tracking-wide text-slate-800">{col.label}</h3>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {stageDeals.length}
                    </span>
                  </div>
                  <div className="text-sm font-black text-slate-900 mt-1.5">
                    ${colTotal.toLocaleString()}
                  </div>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 flex-1">
                  {stageDeals.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-xs text-slate-400 font-medium">
                      No active deals
                    </div>
                  ) : (
                    stageDeals.map((deal) => {
                      const allowedTransitions = DEAL_TRANSITIONS[deal.stage] || []
                      const stageIndex = STAGES.findIndex((s) => s.id === deal.stage) + 1
                      const isHighValue = Number(deal.value || 0) >= 40000

                      return (
                        <div
                          key={deal.id}
                          className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/90 hover:shadow-md transition-all duration-150 group"
                        >
                          {/* Priority and Probability tag */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">
                              #{deal.id} · {deal.win_probability || 20}% Prob
                            </span>
                            {isHighValue && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                High Value
                              </span>
                            )}
                          </div>

                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-sm text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                              {deal.title}
                            </h4>
                          </div>

                          {/* Customer & Lead Tags */}
                          <div className="mt-2 space-y-1">
                            {deal.customer_name && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{deal.customer_name}</span>
                              </div>
                            )}
                            {deal.lead_title && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                <Target className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{deal.lead_title}</span>
                              </div>
                            )}
                          </div>

                          {/* Value & Close date */}
                          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                            <div>
                              <span className="text-base font-extrabold text-slate-900">
                                ${Number(deal.value || 0).toLocaleString()}
                              </span>
                              {deal.weighted_value > 0 && (
                                <p className="text-[10px] text-slate-400">
                                  Weighted: ${Number(deal.weighted_value).toLocaleString()}
                                </p>
                              )}
                            </div>
                            {deal.close_date && (
                              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {deal.close_date.slice(0, 10)}
                              </span>
                            )}
                          </div>

                          {/* Stage Progress Mini Bar */}
                          <div className="mt-2.5 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex gap-0.5">
                            {[1, 2, 3, 4].map((step) => (
                              <div
                                key={step}
                                className={`flex-1 h-full rounded-full ${
                                  step <= stageIndex
                                    ? deal.stage === 'closed-won'
                                      ? 'bg-emerald-500'
                                      : deal.stage === 'closed-lost'
                                      ? 'bg-rose-400'
                                      : 'bg-indigo-500'
                                    : 'bg-slate-200'
                                }`}
                              />
                            ))}
                          </div>

                          {/* Action Footbar */}
                          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                            {/* Quick Transitions */}
                            <div className="flex flex-wrap gap-1">
                              {allowedTransitions.map((targetStage) => (
                                <button
                                  key={targetStage}
                                  onClick={() => handleQuickTransition(deal.id, targetStage)}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer border ${
                                    targetStage === 'closed-won'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      : targetStage === 'closed-lost'
                                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                      : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                  }`}
                                  title={`Advance to ${targetStage}`}
                                >
                                  → {targetStage.replace('closed-', '')}
                                </button>
                              ))}
                            </div>

                            {/* Clone / Edit / Delete Icons */}
                            <div className="flex items-center gap-0.5 ml-auto">
                              <button
                                onClick={() => handleDuplicate(deal.id)}
                                className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                title="Duplicate / Clone Deal"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openEdit(deal)}
                                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Edit Deal"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setConfirm(deal.id)}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete Deal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Table List View */}
      {viewMode === 'table' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Opportunity Title</th>
                  <th className="px-5 py-3.5">Customer Account</th>
                  <th className="px-5 py-3.5">Associated Lead</th>
                  <th className="px-5 py-3.5">Pipeline Stage</th>
                  <th className="px-5 py-3.5">Deal Value</th>
                  <th className="px-5 py-3.5">Weighted ($)</th>
                  <th className="px-5 py-3.5">Target Close</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeals.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                      No deals found matching filter parameters.
                    </td>
                  </tr>
                ) : (
                  filteredDeals.map((deal) => (
                    <tr key={deal.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{deal.title}</div>
                        {deal.notes && (
                          <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
                            {deal.notes}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-slate-700 font-medium">
                        {deal.customer_name ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{deal.customer_name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Unassigned</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-slate-500">
                        {deal.lead_title ? (
                          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-md font-medium text-slate-600 border border-slate-200">
                            {deal.lead_title}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <StatusBadge status={deal.stage} />
                      </td>

                      <td className="px-5 py-3.5 font-black text-slate-900">
                        ${Number(deal.value || 0).toLocaleString()}
                      </td>

                      <td className="px-5 py-3.5 font-semibold text-indigo-700 text-xs">
                        ${Number(deal.weighted_value || 0).toLocaleString()} ({deal.win_probability || 20}%)
                      </td>

                      <td className="px-5 py-3.5 text-slate-500 text-xs font-mono">
                        {deal.close_date ? deal.close_date.slice(0, 10) : '—'}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleDuplicate(deal.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Clone Opportunity"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openTrans(deal)} className="btn-sm-purple">
                            Advance
                          </button>
                          <button onClick={() => openEdit(deal)} className="btn-sm-blue">
                            Edit
                          </button>
                          <button onClick={() => setConfirm(deal.id)} className="btn-sm-red">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Edit Pipeline Opportunity' : 'Create Pipeline Opportunity'}
        subtitle={editing ? 'Update opportunity parameters and projections' : 'Record a new sales deal into the pipeline'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {err && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {err}
            </div>
          )}

          <div>
            <label className="label">Opportunity Title *</label>
            <input
              required
              className="input"
              placeholder="e.g. Acme Corp Enterprise Platform Migration"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="label">Deal Value ($)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  className="input pl-8"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="label">Target Close Date</label>
              <input
                type="date"
                className="input"
                value={form.close_date}
                onChange={(e) => setForm((f) => ({ ...f, close_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="label">Associated Customer</label>
              <select
                className="input"
                value={form.customer_id}
                onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))}
              >
                <option value="">— Select Customer —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Originating Lead</label>
              <select
                className="input"
                value={form.lead_id}
                onChange={(e) => setForm((f) => ({ ...f, lead_id: e.target.value }))}
              >
                <option value="">— None —</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title} {l.customer_name ? `(${l.customer_name})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Pipeline Stage</label>
            <select
              className="input capitalize font-medium"
              value={form.stage}
              onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
            >
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Deal Notes & Strategic Terms</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Key stakeholders, commercial milestones, review schedule..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editing ? 'Update Deal' : 'Save Deal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Advance / Transition Modal */}
      <Modal
        open={!!transModal}
        onClose={() => setTransModal(null)}
        title="Advance Deal Stage"
        subtitle="Progress this opportunity across the sales lifecycle"
        maxWidth="max-w-md"
      >
        {transModal && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <p className="text-xs text-slate-500 uppercase font-semibold">Deal Opportunity</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{transModal.title}</p>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200">
                <span className="text-xs text-slate-500">Current Stage:</span>
                <StatusBadge status={transModal.stage} />
              </div>
            </div>

            {(DEAL_TRANSITIONS[transModal.stage] ?? []).length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-3">
                This stage is a final state and has no allowed transitions.
              </p>
            ) : (
              <>
                <div>
                  <label className="label">Move To Stage</label>
                  <select
                    className="input capitalize font-medium"
                    value={transTo}
                    onChange={(e) => setTransTo(e.target.value)}
                  >
                    {(DEAL_TRANSITIONS[transModal.stage] ?? []).map((s) => (
                      <option key={s} value={s}>
                        {s.replace('-', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                {transTo === 'closed-won' && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Moving to Closed-Won will register lifetime revenue to this account!</span>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setTransModal(null)} className="btn-secondary">
                    Cancel
                  </button>
                  <button onClick={handleApplyTransition} className="btn-primary">
                    Apply Stage Transition
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => handleDelete(confirm)}
        message="Are you sure you want to permanently delete this deal?"
      />
    </div>
  )
}
