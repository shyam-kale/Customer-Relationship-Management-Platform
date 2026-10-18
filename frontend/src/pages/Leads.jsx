import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import StatusBadge from '../components/StatusBadge'
import {
  getLeads,
  createLead,
  updateLead,
  deleteLead,
  transitionLead,
  convertLead,
  bulkLeads,
  getCustomers
} from '../api'
import { leadStatusColors, LEAD_TRANSITIONS } from '../utils/statusColors'
import {
  Target,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  ArrowRight,
  GitCommit,
  Edit3,
  Trash2,
  Building2,
  CheckCircle2,
  UserCheck,
  Sparkles,
  CheckSquare,
  Square,
  Briefcase,
  Calendar,
  X
} from 'lucide-react'

const BLANK = { title: '', customer_id: '', source: 'website', value: 0, notes: '' }
const SOURCES = ['website', 'referral', 'cold-call', 'email', 'social', 'other']

export default function Leads() {
  const [rows, setRows] = useState([])
  const [customers, setCustomers] = useState([])
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [confirm, setConfirm] = useState(null)
  const [transModal, setTransModal] = useState(null)
  const [transTo, setTransTo] = useState('')
  const [err, setErr] = useState('')
  const [transErr, setTransErr] = useState('')
  const [toast, setToast] = useState('')

  // Conversion Modal State
  const [convertModal, setConvertModal] = useState(null) // lead to convert
  const [convertForm, setConvertForm] = useState({
    dealTitle: '',
    stage: 'proposal',
    value: 0,
    closeDate: '',
    createKickoffTask: true,
  })

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  const load = () => {
    Promise.all([getLeads(), getCustomers()])
      .then(([l, c]) => {
        setRows(l.data)
        setCustomers(c.data)
      })
      .catch((e) => console.error(e))
  }

  useEffect(() => {
    load()
  }, [])

  const openAdd = () => {
    setEditing(null)
    setForm(BLANK)
    setErr('')
    setModal(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm({
      title: row.title,
      customer_id: row.customer_id ?? '',
      source: row.source,
      value: row.value,
      notes: row.notes ?? '',
    })
    setErr('')
    setModal(true)
  }

  const openTrans = (lead) => {
    const options = LEAD_TRANSITIONS[lead.status] ?? []
    setTransTo(options[0] ?? '')
    setTransErr('')
    setTransModal(lead)
  }

  const openConvert = (lead) => {
    const targetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    setConvertForm({
      dealTitle: `${lead.title} Opportunity`,
      stage: 'proposal',
      value: lead.value || 0,
      closeDate: targetDate,
      createKickoffTask: true,
    })
    setConvertModal(lead)
  }

  const handleConvertExecute = async (e) => {
    e?.preventDefault()
    if (!convertModal) return
    try {
      const res = await convertLead(convertModal.id, convertForm)
      try {
        confetti({
          particleCount: 110,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#10b981', '#f59e0b', '#3b82f6'],
        })
      } catch (_) {}
      showToast(res.data.message || 'Lead successfully converted to Opportunity Deal!')
      setConvertModal(null)
      load()
    } catch (e) {
      alert(e.response?.data?.error ?? 'Conversion failed')
    }
  }

  const handleSave = async (e) => {
    e?.preventDefault()
    setErr('')
    try {
      const payload = {
        ...form,
        customer_id: form.customer_id ? Number(form.customer_id) : null,
        value: Number(form.value) || 0,
      }
      if (editing) {
        await updateLead(editing.id, payload)
        showToast('Lead updated successfully')
      } else {
        await createLead(payload)
        showToast('Lead captured successfully')
      }
      setModal(false)
      load()
    } catch (e) {
      setErr(e.response?.data?.error ?? 'Error saving lead')
    }
  }

  const handleTransition = async () => {
    if (!transTo || !transModal) return
    setTransErr('')
    try {
      await transitionLead(transModal.id, transTo)
      showToast(`Lead moved to "${transTo}"`)
      setTransModal(null)
      load()
    } catch (e) {
      setTransErr(e.response?.data?.error ?? 'State transition failed')
    }
  }

  const handleDelete = async (id) => {
    await deleteLead(id)
    setSelectedIds((prev) => prev.filter((i) => i !== id))
    showToast('Lead deleted')
    load()
  }

  // Multi-select handlers
  const handleSelectAll = (filteredRows) => {
    if (selectedIds.length === filteredRows.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredRows.map((r) => r.id))
    }
  }

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  // Bulk batch actions
  const handleBulkTransition = async (status) => {
    if (selectedIds.length === 0) return
    try {
      await bulkLeads({ action: 'transition', ids: selectedIds, status })
      showToast(`Transitioned ${selectedIds.length} leads to "${status}"`)
      setSelectedIds([])
      load()
    } catch (e) {
      alert('Bulk transition failed')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!window.confirm(`Delete ${selectedIds.length} selected leads?`)) return
    try {
      await bulkLeads({ action: 'delete', ids: selectedIds })
      showToast(`Deleted ${selectedIds.length} leads`)
      setSelectedIds([])
      load()
    } catch (e) {
      alert('Bulk delete failed')
    }
  }

  const filtered = rows.filter((r) => {
    const matchesFilter = filter ? r.status === filter : true
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.customer_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      r.source.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const totalValue = rows.reduce((acc, r) => acc + (Number(r.value) || 0), 0)
  const convertedCount = rows.filter((r) => r.status === 'converted').length
  const qualifiedCount = rows.filter((r) => r.status === 'qualified').length

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
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
              Acquisition Funnel
            </span>
            <span className="text-xs text-slate-400 font-medium">Smart Lead Conversion Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Lead Qualification
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Capture, qualify, and execute automated 1-click conversion to Revenue Opportunities.
          </p>
        </div>

        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" />
          <span>New Lead</span>
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Captured</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{rows.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Target className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Qualified Leads</p>
            <p className="text-2xl font-black text-indigo-600 mt-0.5">{qualifiedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Converted Opportunities</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">{convertedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Pipeline Potential</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">${totalValue.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search leads by title, account, or source..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 py-2"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none pb-1 md:pb-0">
          <button
            onClick={() => setFilter('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filter === ''
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Leads ({rows.length})
          </button>
          {Object.keys(leadStatusColors).map((s) => {
            const count = rows.filter((r) => r.status === s).length
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer capitalize whitespace-nowrap ${
                  filter === s
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {s} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Leads Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 w-10">
                  <button
                    onClick={() => handleSelectAll(filtered)}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer pt-0.5"
                    title="Select All"
                  >
                    {selectedIds.length > 0 && selectedIds.length === filtered.length ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-5 py-3.5">Lead Opportunity</th>
                <th className="px-5 py-3.5">Account / Customer</th>
                <th className="px-5 py-3.5">Channel</th>
                <th className="px-5 py-3.5">Estimated Value</th>
                <th className="px-5 py-3.5">Stage</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400 text-sm">
                    No leads found matching current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const isSelected = selectedIds.includes(r.id)
                  const canConvert = r.status === 'qualified' || r.status === 'contacted'

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-indigo-50/30' : ''
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => toggleSelectOne(r.id)}
                          className="text-slate-400 hover:text-slate-700 cursor-pointer pt-0.5"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{r.title}</div>
                        {r.notes && (
                          <div className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
                            {r.notes}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        {r.customer_name ? (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium text-xs sm:text-sm">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{r.customer_name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Unassigned Account</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                          {r.source}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-extrabold text-slate-900">
                          ${Number(r.value || 0).toLocaleString()}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <StatusBadge status={r.status} />
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1-Click Convert to Deal Action */}
                          {canConvert && (
                            <button
                              onClick={() => openConvert(r)}
                              className="btn-sm-green shadow-xs"
                              title="Convert to Sales Opportunity Deal"
                            >
                              <Sparkles className="w-3 h-3 text-emerald-600" />
                              <span>Convert</span>
                            </button>
                          )}

                          <button
                            onClick={() => openTrans(r)}
                            className="btn-sm-purple"
                            title="Transition Status"
                          >
                            <GitCommit className="w-3 h-3" />
                            <span>Transition</span>
                          </button>

                          <button
                            onClick={() => openEdit(r)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit Lead"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setConfirm(r.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Lead"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Multi-Select Batch Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-4 animate-scaleIn">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-indigo-600 font-bold text-xs text-white">
              {selectedIds.length}
            </span>
            <span className="text-xs font-medium text-slate-300">Selected</span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkTransition('contacted')}
              className="px-3 py-1.5 bg-amber-600/90 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Mark Contacted
            </button>
            <button
              onClick={() => handleBulkTransition('qualified')}
              className="px-3 py-1.5 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Mark Qualified
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 bg-rose-600/90 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>

          <button
            onClick={() => setSelectedIds([])}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Deselect all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Convert Lead to Opportunity Deal Modal */}
      <Modal
        open={!!convertModal}
        onClose={() => setConvertModal(null)}
        title="Convert Lead to Pipeline Opportunity"
        subtitle="Transform qualified prospect into an active deal with automated meeting schedule"
        maxWidth="max-w-lg"
      >
        {convertModal && (
          <form onSubmit={handleConvertExecute} className="space-y-4">
            <div className="p-3 bg-gradient-to-r from-emerald-50 to-indigo-50 border border-emerald-200/80 rounded-xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-emerald-950">Enterprise Opportunity Conversion</p>
                <p className="text-[11px] text-emerald-700">
                  Account: <strong>{convertModal.customer_name || 'Individual'}</strong> · Source: {convertModal.source}
                </p>
              </div>
            </div>

            <div>
              <label className="label">Opportunity Deal Title *</label>
              <input
                required
                className="input"
                value={convertForm.dealTitle}
                onChange={(e) => setConvertForm((f) => ({ ...f, dealTitle: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="label">Pipeline Stage</label>
                <select
                  className="input font-medium"
                  value={convertForm.stage}
                  onChange={(e) => setConvertForm((f) => ({ ...f, stage: e.target.value }))}
                >
                  <option value="proposal">Proposal Stage</option>
                  <option value="negotiation">Negotiation Stage</option>
                  <option value="prospect">Initial Prospect</option>
                </select>
              </div>

              <div>
                <label className="label">Deal Value ($)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    className="input pl-8"
                    value={convertForm.value}
                    onChange={(e) => setConvertForm((f) => ({ ...f, value: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="label">Target Close Date</label>
              <input
                type="date"
                className="input font-medium"
                value={convertForm.closeDate}
                onChange={(e) => setConvertForm((f) => ({ ...f, closeDate: e.target.value }))}
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={convertForm.createKickoffTask}
                  onChange={(e) => setConvertForm((f) => ({ ...f, createKickoffTask: e.target.checked }))}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span>Auto-schedule Discovery Kickoff Touchpoint (+2 Days)</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConvertModal(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                <Sparkles className="w-4 h-4" />
                <span>Confirm & Create Deal</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add / Edit Lead Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Edit Lead Record' : 'Capture New Lead'}
        subtitle={editing ? 'Modify qualification parameters' : 'Register incoming prospect inquiry'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {err && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {err}
            </div>
          )}

          <div>
            <label className="label">Lead Subject / Opportunity Title *</label>
            <input
              required
              className="input"
              placeholder="e.g. Enterprise Cloud License - 50 Seats"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="label">Customer Account</label>
              <select
                className="input"
                value={form.customer_id}
                onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))}
              >
                <option value="">— Link to Customer —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Inbound Channel / Source</label>
              <select
                className="input uppercase text-xs font-semibold"
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Estimated Deal Value ($)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
              <input
                type="number"
                min="0"
                step="500"
                className="input pl-8"
                placeholder="25000"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="label">Context & Requirement Notes</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Budget range, timeline, decision makers involved..."
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
              {editing ? 'Save Changes' : 'Save Lead'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Transition State Modal */}
      <Modal
        open={!!transModal}
        onClose={() => setTransModal(null)}
        title="Execute Lead State Transition"
        subtitle="Advance the lead through the standard qualification pipeline"
        maxWidth="max-w-md"
      >
        {transModal && (
          <div className="space-y-4">
            {transErr && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {transErr}
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <p className="text-xs text-slate-500 uppercase font-semibold">Active Subject</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{transModal.title}</p>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200">
                <span className="text-xs text-slate-500">Current Status:</span>
                <StatusBadge status={transModal.status} />
              </div>
            </div>

            {(LEAD_TRANSITIONS[transModal.status] ?? []).length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 text-slate-500 text-sm text-center">
                This lead is currently in terminal status (<strong className="capitalize">{transModal.status}</strong>).
                No further automated transitions allowed.
              </div>
            ) : (
              <>
                <div>
                  <label className="label">Transition Target Stage</label>
                  <select
                    className="input capitalize"
                    value={transTo}
                    onChange={(e) => setTransTo(e.target.value)}
                  >
                    {(LEAD_TRANSITIONS[transModal.status] ?? []).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {transTo === 'converted' && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                    <span>
                      Converting this lead will automatically spawn an active opportunity deal in the Sales Pipeline.
                    </span>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setTransModal(null)} className="btn-secondary">
                    Cancel
                  </button>
                  <button onClick={handleTransition} className="btn-primary">
                    Confirm Transition
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => handleDelete(confirm)}
        message="Permanently delete this lead? Any associated activity history will be detached."
      />
    </div>
  )
}
