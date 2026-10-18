import { useEffect, useState, useMemo } from 'react'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import StatusBadge from '../components/StatusBadge'
import {
  getFollowups,
  createFollowup,
  updateFollowup,
  deleteFollowup,
  getCustomers,
  getLeads,
} from '../api'
import { followupStatusColors } from '../utils/statusColors'
import {
  CalendarClock,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  Users,
  MonitorPlay,
  Bookmark,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Target,
  Edit3,
  Trash2,
  RotateCcw
} from 'lucide-react'

const TYPE_CONFIG = {
  call: { label: 'Phone Call', icon: Phone, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  email: { label: 'Email Outreach', icon: Mail, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  meeting: { label: 'Client Meeting', icon: Users, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  demo: { label: 'Product Demo', icon: MonitorPlay, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  other: { label: 'General Task', icon: Bookmark, color: 'text-slate-600 bg-slate-50 border-slate-200' },
}

const BLANK = {
  customer_id: '',
  lead_id: '',
  type: 'call',
  status: 'pending',
  scheduled_at: '',
  notes: '',
}

export default function Followups() {
  const [rows, setRows] = useState([])
  const [customers, setCustomers] = useState([])
  const [leads, setLeads] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [confirm, setConfirm] = useState(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const [fRes, cRes, lRes] = await Promise.all([
        getFollowups(),
        getCustomers(),
        getLeads(),
      ])
      setRows(fRes.data)
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

  const nowIso = new Date().toISOString()

  const counts = useMemo(() => {
    const total = rows.length
    const pending = rows.filter((r) => r.status === 'pending').length
    const completed = rows.filter((r) => r.status === 'completed').length
    const overdue = rows.filter((r) => r.status === 'pending' && r.scheduled_at < nowIso).length
    return { total, pending, completed, overdue }
  }, [rows, nowIso])

  const openAdd = () => {
    setEditing(null)
    const localNow = new Date(Date.now() + 60 * 60 * 1000)
    localNow.setMinutes(0, 0, 0)
    const formattedDate = new Date(localNow.getTime() - localNow.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)

    setForm({ ...BLANK, scheduled_at: formattedDate })
    setErr('')
    setModal(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    let formattedDate = ''
    if (row.scheduled_at) {
      formattedDate = row.scheduled_at.slice(0, 16)
    }
    setForm({
      customer_id: row.customer_id ?? '',
      lead_id: row.lead_id ?? '',
      type: row.type ?? 'call',
      status: row.status ?? 'pending',
      scheduled_at: formattedDate,
      notes: row.notes ?? '',
    })
    setErr('')
    setModal(true)
  }

  const handleSave = async (e) => {
    e?.preventDefault()
    if (!form.scheduled_at) {
      setErr('Please select a scheduled date and time.')
      return
    }
    setErr('')
    try {
      const payload = {
        ...form,
        customer_id: form.customer_id ? Number(form.customer_id) : null,
        lead_id: form.lead_id ? Number(form.lead_id) : null,
      }
      if (editing) {
        await updateFollowup(editing.id, payload)
      } else {
        await createFollowup(payload)
      }
      setModal(false)
      loadData()
    } catch (e) {
      setErr(e.response?.data?.error ?? 'Error saving follow-up touchpoint')
    }
  }

  const handleQuickStatus = async (id, status) => {
    try {
      await updateFollowup(id, { status })
      loadData()
    } catch (e) {
      alert(e.response?.data?.error ?? 'Could not update status')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteFollowup(id)
      loadData()
    } catch (e) {
      alert('Could not delete follow-up')
    }
  }

  const visible = rows.filter((r) => {
    const isOverdue = r.status === 'pending' && r.scheduled_at < nowIso
    if (statusFilter === 'overdue' && !isOverdue) return false
    if (statusFilter !== 'all' && statusFilter !== 'overdue' && r.status !== statusFilter) return false
    if (typeFilter !== 'all' && r.type !== typeFilter) return false

    if (search.trim()) {
      const q = search.toLowerCase()
      const matchCustomer = (r.customer_name ?? '').toLowerCase().includes(q)
      const matchLead = (r.lead_title ?? '').toLowerCase().includes(q)
      const matchNotes = (r.notes ?? '').toLowerCase().includes(q)
      if (!matchCustomer && !matchLead && !matchNotes) return false
    }

    return true
  })

  // Filter leads based on selected customer in form
  const availableLeads = form.customer_id
    ? leads.filter((l) => Number(l.customer_id) === Number(form.customer_id))
    : leads

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              Task Scheduler
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Follow-Ups & Tasks
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Coordinate client touchpoints, schedule discovery demos, and ensure zero missed commitments.
          </p>
        </div>

        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" />
          <span>Schedule Task</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setStatusFilter('all')}
          className={`glass-card p-4 text-left transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'ring-2 ring-indigo-600 bg-indigo-50/20'
              : 'hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Total Tasks</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{counts.total}</div>
        </button>

        <button
          onClick={() => setStatusFilter('pending')}
          className={`glass-card p-4 text-left transition-all cursor-pointer ${
            statusFilter === 'pending'
              ? 'ring-2 ring-amber-500 bg-amber-50/20'
              : 'hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase">Pending</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">{counts.pending}</div>
        </button>

        <button
          onClick={() => setStatusFilter('overdue')}
          className={`glass-card p-4 text-left transition-all cursor-pointer ${
            statusFilter === 'overdue'
              ? 'ring-2 ring-rose-500 bg-rose-50/20'
              : 'hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase">Overdue</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">{counts.overdue}</div>
        </button>

        <button
          onClick={() => setStatusFilter('completed')}
          className={`glass-card p-4 text-left transition-all cursor-pointer ${
            statusFilter === 'completed'
              ? 'ring-2 ring-emerald-500 bg-emerald-50/20'
              : 'hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{counts.completed}</div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer, lead, or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 py-2"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <select
            className="input py-2 text-xs font-medium w-auto"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Channels</option>
            <option value="call">Phone Calls</option>
            <option value="email">Emails</option>
            <option value="meeting">Meetings</option>
            <option value="demo">Product Demos</option>
            <option value="other">General Tasks</option>
          </select>

          <select
            className="input py-2 text-xs font-medium w-auto"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="overdue">Overdue Only</option>
          </select>

          {(statusFilter !== 'all' || typeFilter !== 'all' || search) && (
            <button
              onClick={() => {
                setStatusFilter('all')
                setTypeFilter('all')
                setSearch('')
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Follow-ups Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Activity Type</th>
                <th className="px-5 py-3.5">Scheduled Timeline</th>
                <th className="px-5 py-3.5">Customer / Contact</th>
                <th className="px-5 py-3.5">Related Lead</th>
                <th className="px-5 py-3.5">Objective / Notes</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    Loading task schedule...
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    No follow-ups found matching criteria.
                  </td>
                </tr>
              ) : (
                visible.map((r) => {
                  const isOverdue = r.status === 'pending' && r.scheduled_at < nowIso
                  const typeObj = TYPE_CONFIG[r.type] || TYPE_CONFIG.other
                  const TypeIcon = typeObj.icon

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${typeObj.color}`}>
                          <TypeIcon className="w-3.5 h-3.5" />
                          <span>{typeObj.label}</span>
                        </span>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {r.scheduled_at
                            ? new Date(r.scheduled_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '—'}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          {r.scheduled_at
                            ? new Date(r.scheduled_at).toLocaleTimeString(undefined, {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </div>
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                            <AlertTriangle className="w-3 h-3" /> OVERDUE
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 font-bold text-slate-800">
                        {r.customer_name ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{r.customer_name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-normal italic text-xs">Unassigned</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-slate-600">
                        {r.lead_title ? (
                          <span className="inline-flex items-center gap-1 text-indigo-700 font-semibold bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-md text-xs">
                            <Target className="w-3 h-3" />
                            <span>{r.lead_title}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 max-w-xs text-slate-600">
                        <p className="line-clamp-2 text-xs">{r.notes || '—'}</p>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <StatusBadge status={r.status} />
                      </td>

                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {r.status === 'pending' ? (
                            <button
                              onClick={() => handleQuickStatus(r.id, 'completed')}
                              title="Mark as Completed"
                              className="btn-sm-green"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Complete</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleQuickStatus(r.id, 'pending')}
                              title="Re-open task"
                              className="btn-sm-amber"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reopen</span>
                            </button>
                          )}

                          <button
                            onClick={() => openEdit(r)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setConfirm(r.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete"
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

      {/* Add / Edit Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Edit Follow-Up Task' : 'Schedule Follow-Up Task'}
        subtitle={editing ? 'Update task schedule and notes' : 'Book a client meeting, phone call, or product demo'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {err && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {err}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="label">Activity Type *</label>
              <select
                className="input font-medium"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="call">Phone Call</option>
                <option value="email">Email Outreach</option>
                <option value="meeting">In-person / Video Meeting</option>
                <option value="demo">Product Demo</option>
                <option value="other">General Task</option>
              </select>
            </div>

            <div>
              <label className="label">Task Status</label>
              <select
                className="input font-medium capitalize"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Scheduled Date & Time *</label>
            <input
              type="datetime-local"
              required
              className="input font-medium"
              value={form.scheduled_at}
              onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
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
                <option value="">— Link Customer —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Related Lead</label>
              <select
                className="input"
                value={form.lead_id}
                onChange={(e) => setForm((f) => ({ ...f, lead_id: e.target.value }))}
              >
                <option value="">— Link Lead —</option>
                {availableLeads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title} {l.customer_name ? `(${l.customer_name})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Meeting Agenda / Action Notes</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Key discussion agenda, attendee preparation, commercial targets..."
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
              {editing ? 'Update Task' : 'Schedule Task'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => handleDelete(confirm)}
        message="Are you sure you want to permanently delete this scheduled follow-up?"
      />
    </div>
  )
}
