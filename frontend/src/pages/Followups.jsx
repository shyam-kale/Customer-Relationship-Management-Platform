import { useEffect, useState, useMemo } from 'react'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import StatusBadge from '../components/StatusBadge'
import CalendarGrid from '../components/CalendarGrid'
import {
  getFollowups,
  createFollowup,
  updateFollowup,
  deleteFollowup,
  getCustomers,
  getLeads,
  rescheduleFollowup,
} from '../api'
import {
  CalendarClock,
  List,
  Calendar,
  Plus,
  Search,
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
  RotateCcw,
  Flame,
  X,
} from 'lucide-react'

const TYPE_CONFIG = {
  call:    { label: 'Phone Call',    icon: Phone,       color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  email:   { label: 'Email Outreach',icon: Mail,        color: 'text-blue-600 bg-blue-50 border-blue-200' },
  meeting: { label: 'Client Meeting',icon: Users,       color: 'text-purple-600 bg-purple-50 border-purple-200' },
  demo:    { label: 'Product Demo',  icon: MonitorPlay, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  other:   { label: 'General Task',  icon: Bookmark,    color: 'text-slate-600 bg-slate-50 border-slate-200' },
}

const BLANK = {
  customer_id: '',
  lead_id: '',
  type: 'call',
  status: 'pending',
  scheduled_at: '',
  notes: '',
}

function pad2(n) { return String(n).padStart(2, '0') }

function getTodayStr() {
  const t = new Date()
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`
}

function getCurrentMonth() {
  const t = new Date()
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}`
}

export default function Followups() {
  const [rows, setRows] = useState([])
  const [customers, setCustomers] = useState([])
  const [leads, setLeads] = useState([])
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [confirm, setConfirm] = useState(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  // View & tab state
  const [viewMode, setViewMode] = useState('list')   // 'list' | 'calendar'
  const [activeTab, setActiveTab] = useState('all')  // 'today' | 'week' | 'overdue' | 'all'
  const [selectedDate, setSelectedDate] = useState(getTodayStr())
  const [calMonth, setCalMonth] = useState(getCurrentMonth())

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

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

  useEffect(() => { loadData() }, [])

  const todayStr = getTodayStr()
  const nowIso = new Date().toISOString()

  // Add days helper for tab filtering
  function addDays(dateStr, days) {
    const d = new Date(dateStr)
    d.setDate(d.getDate() + days)
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  }

  // Snooze via rescheduleFollowup API
  const snoozeFollowup = async (id, days) => {
    try {
      await rescheduleFollowup(id, days)
      await loadData()
      showToast(`Task snoozed by ${days} day${days > 1 ? 's' : ''}`)
    } catch (e) {
      setErr('Failed to snooze follow-up')
    }
  }

  // Counts for tab labels and KPI cards
  const counts = useMemo(() => {
    const total = rows.length
    const pending = rows.filter(r => r.status === 'pending').length
    const completed = rows.filter(r => r.status === 'completed').length
    const overdue = rows.filter(r => r.status === 'pending' && r.scheduled_at < nowIso).length
    const today = rows.filter(r => r.scheduled_at && r.scheduled_at.slice(0, 10) === todayStr).length
    const weekEnd = addDays(todayStr, 7)
    const thisWeek = rows.filter(r => r.status === 'pending' && r.scheduled_at && r.scheduled_at.slice(0, 10) >= todayStr && r.scheduled_at.slice(0, 10) <= weekEnd).length
    return { total, pending, completed, overdue, today, thisWeek }
  }, [rows, nowIso, todayStr])

  // Completion streak calculation
  const streak = useMemo(() => {
    const completed = rows
      .filter(r => r.status === 'completed' && r.updated_at)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))

    if (completed.length === 0) return 0
    let count = 0
    let checkDate = new Date(todayStr)
    const completedDates = new Set(completed.map(r => r.updated_at.slice(0, 10)))

    for (let i = 0; i < 365; i++) {
      const ds = `${checkDate.getFullYear()}-${pad2(checkDate.getMonth() + 1)}-${pad2(checkDate.getDate())}`
      if (completedDates.has(ds)) {
        count++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }
    return count
  }, [rows, todayStr])

  // Overdue count for banner
  const overdueCount = counts.overdue

  // Tab filter logic
  const tabFilteredRows = useMemo(() => {
    switch (activeTab) {
      case 'today':
        return rows.filter(r => r.scheduled_at && r.scheduled_at.slice(0, 10) === todayStr)
      case 'week': {
        const weekEnd = addDays(todayStr, 7)
        return rows.filter(r => r.status === 'pending' && r.scheduled_at && r.scheduled_at.slice(0, 10) >= todayStr && r.scheduled_at.slice(0, 10) <= weekEnd)
      }
      case 'overdue':
        return rows.filter(r => r.status === 'pending' && r.scheduled_at < nowIso)
      default:
        return rows
    }
  }, [rows, activeTab, todayStr, nowIso])

  // Secondary type filter + search on top of tab filter
  const visible = useMemo(() => {
    return tabFilteredRows.filter(r => {
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
  }, [tabFilteredRows, typeFilter, search])

  // CalendarGrid needs followups with scheduled_date field mapped from scheduled_at
  const calFollowups = useMemo(() => rows.map(r => ({
    ...r,
    scheduled_date: r.scheduled_at ? r.scheduled_at.slice(0, 10) : null,
  })), [rows])

  // Calendar selected date filtered rows
  const calDayRows = useMemo(() => {
    if (!selectedDate) return []
    return rows.filter(r => r.scheduled_at && r.scheduled_at.slice(0, 10) === selectedDate)
  }, [rows, selectedDate])

  const openAdd = () => {
    setEditing(null)
    const localNow = new Date(Date.now() + 60 * 60 * 1000)
    localNow.setMinutes(0, 0, 0)
    const formattedDate = new Date(localNow.getTime() - localNow.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    setForm({ ...BLANK, scheduled_at: formattedDate })
    setErr('')
    setModal(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm({
      customer_id: row.customer_id ?? '',
      lead_id: row.lead_id ?? '',
      type: row.type ?? 'call',
      status: row.status ?? 'pending',
      scheduled_at: row.scheduled_at ? row.scheduled_at.slice(0, 16) : '',
      notes: row.notes ?? '',
    })
    setErr('')
    setModal(true)
  }

  const handleSave = async (e) => {
    e?.preventDefault()
    if (!form.scheduled_at) { setErr('Please select a scheduled date and time.'); return }
    setErr('')
    try {
      const payload = {
        ...form,
        customer_id: form.customer_id ? Number(form.customer_id) : null,
        lead_id: form.lead_id ? Number(form.lead_id) : null,
      }
      if (editing) {
        await updateFollowup(editing.id, payload)
        showToast('Follow-up updated')
      } else {
        await createFollowup(payload)
        showToast('Follow-up scheduled')
      }
      setModal(false)
      loadData()
    } catch (e) {
      setErr(e.response?.data?.error ?? 'Error saving follow-up')
    }
  }

  const handleQuickStatus = async (id, status) => {
    try {
      await updateFollowup(id, { status })
      showToast(status === 'completed' ? 'Task completed! 🎉' : 'Task reopened')
      loadData()
    } catch (e) {
      alert(e.response?.data?.error ?? 'Could not update status')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteFollowup(id)
      showToast('Follow-up deleted')
      loadData()
    } catch (e) {
      alert('Could not delete follow-up')
    }
  }

  const availableLeads = form.customer_id
    ? leads.filter(l => Number(l.customer_id) === Number(form.customer_id))
    : leads

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 text-xs font-bold flex items-center gap-3 animate-scaleIn">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toast}</span>
          <button onClick={() => setToast('')} className="text-slate-400 hover:text-white ml-1 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Overdue escalation banner */}
      {overdueCount > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-200 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm font-semibold text-amber-900">
              ⚠️ <span className="font-black text-rose-700">{overdueCount}</span> overdue task{overdueCount > 1 ? 's' : ''} — revenue momentum at risk
            </p>
          </div>
          <button
            onClick={() => setActiveTab('overdue')}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
          >
            View Overdue
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              Task Scheduler
            </span>
            {streak >= 2 && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                🔥 {streak}-day streak
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Follow-Ups &amp; Tasks
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Coordinate client touchpoints, schedule discovery demos, and ensure zero missed commitments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View toggle: List / Calendar */}
          <div className="bg-slate-200/80 p-1 rounded-xl flex items-center text-xs font-bold">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'calendar' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Calendar View"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
          </div>

          <button onClick={openAdd} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span>Schedule Task</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Total Tasks</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{counts.total}</div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase">Pending</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">{counts.pending}</div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase">Overdue</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">{counts.overdue}</div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{counts.completed}</div>
        </div>
      </div>

      {/* Tab Filter Row */}
      <div className="glass-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: 'today',   label: `Today (${counts.today})` },
            { key: 'week',    label: `This Week (${counts.thisWeek})` },
            { key: 'overdue', label: `Overdue (${counts.overdue})` },
            { key: 'all',     label: 'All' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === key
                  ? key === 'overdue'
                    ? 'bg-rose-600 text-white'
                    : 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Secondary type filter */}
        <div className="flex items-center gap-2">
          <select
            className="input py-2 text-xs font-medium w-auto"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="call">Phone Calls</option>
            <option value="email">Emails</option>
            <option value="meeting">Meetings</option>
            <option value="demo">Product Demos</option>
            <option value="other">General Tasks</option>
          </select>
        </div>
      </div>

      {/* Search bar */}
      <div className="glass-card p-4">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer, lead, or notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10 py-2"
          />
        </div>
      </div>

      {/* ── CALENDAR VIEW ── */}
      {viewMode === 'calendar' && (
        <div className="space-y-4">
          <CalendarGrid
            followups={calFollowups}
            selectedDate={selectedDate}
            onDateClick={setSelectedDate}
            month={calMonth}
            onMonthChange={setCalMonth}
          />

          {/* Selected date follow-ups */}
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200/80 bg-slate-50/80 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-800">
                Tasks for {selectedDate || '—'}
              </h3>
              <span className="ml-auto text-xs font-semibold text-slate-500">{calDayRows.length} task{calDayRows.length !== 1 ? 's' : ''}</span>
            </div>

            {calDayRows.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">No follow-ups scheduled for this day.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {calDayRows.map(r => {
                  const typeObj = TYPE_CONFIG[r.type] || TYPE_CONFIG.other
                  const TypeIcon = typeObj.icon
                  return (
                    <li key={r.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-slate-50/80 transition-colors">
                      <span className={`mt-0.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${typeObj.color} shrink-0`}>
                        <TypeIcon className="w-3.5 h-3.5" />
                        <span>{typeObj.label}</span>
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono text-slate-500">
                          {r.scheduled_at ? new Date(r.scheduled_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                        <div className="font-semibold text-sm text-slate-900 truncate">{r.customer_name || 'Unassigned'}</div>
                        {r.notes && <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{r.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {r.status === 'pending' && (
                          <button onClick={() => handleQuickStatus(r.id, 'completed')} className="btn-sm-green">
                            <CheckCircle2 className="w-3 h-3" /><span>Complete</span>
                          </button>
                        )}
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setConfirm(r.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {viewMode === 'list' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Activity Type</th>
                  <th className="px-5 py-3.5">Scheduled</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Related Lead</th>
                  <th className="px-5 py-3.5">Notes</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">Loading task schedule...</td>
                  </tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">No follow-ups found matching criteria.</td>
                  </tr>
                ) : (
                  visible.map(r => {
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
                            {r.scheduled_at ? new Date(r.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            {r.scheduled_at ? new Date(r.scheduled_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : ''}
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
                              <>
                                <button
                                  onClick={() => handleQuickStatus(r.id, 'completed')}
                                  title="Mark as Completed"
                                  className="btn-sm-green"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Complete</span>
                                </button>
                                {/* Snooze dropdown */}
                                <div className="relative group">
                                  <button
                                    type="button"
                                    title="Snooze this task"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                                  >
                                    <Flame className="w-4 h-4" />
                                  </button>
                                  <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 py-1">
                                    <div className="px-3 pt-1.5 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Snooze</div>
                                    <button type="button" onClick={() => snoozeFollowup(r.id, 1)} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 cursor-pointer">+1 Day</button>
                                    <button type="button" onClick={() => snoozeFollowup(r.id, 3)} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 cursor-pointer">+3 Days</button>
                                    <button type="button" onClick={() => snoozeFollowup(r.id, 7)} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 cursor-pointer border-t border-slate-100">+1 Week</button>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <button onClick={() => handleQuickStatus(r.id, 'pending')} title="Re-open task" className="btn-sm-amber">
                                <RotateCcw className="w-3 h-3" />
                                <span>Reopen</span>
                              </button>
                            )}

                            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer" title="Edit">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setConfirm(r.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer" title="Delete">
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
      )}

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
              <select className="input font-medium" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="call">Phone Call</option>
                <option value="email">Email Outreach</option>
                <option value="meeting">In-person / Video Meeting</option>
                <option value="demo">Product Demo</option>
                <option value="other">General Task</option>
              </select>
            </div>
            <div>
              <label className="label">Task Status</label>
              <select className="input font-medium capitalize" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Scheduled Date &amp; Time *</label>
            <input type="datetime-local" required className="input font-medium" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="label">Customer Account</label>
              <select className="input" value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
                <option value="">— Link Customer —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Related Lead</label>
              <select className="input" value={form.lead_id} onChange={e => setForm(f => ({ ...f, lead_id: e.target.value }))}>
                <option value="">— Link Lead —</option>
                {availableLeads.map(l => (
                  <option key={l.id} value={l.id}>{l.title}{l.customer_name ? ` (${l.customer_name})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Meeting Agenda / Action Notes</label>
            <textarea className="input resize-none" rows={3} placeholder="Key discussion agenda, attendee preparation, commercial targets..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Update Task' : 'Schedule Task'}</button>
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

      {/* Floating FAB */}
      <button
        onClick={openAdd}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full btn-primary shadow-2xl z-50 flex items-center justify-center"
        title="Schedule new task"
        aria-label="Schedule new task"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  )
}
