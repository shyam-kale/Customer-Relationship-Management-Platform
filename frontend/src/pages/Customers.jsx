import { useEffect, useState, useRef } from 'react'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import StatusBadge from '../components/StatusBadge'
import SidePanel from '../components/SidePanel'
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  bulkCustomers,
  getCustomerProfile,
  quickLogActivity,
} from '../api'
import {
  Users, UserPlus, Search, Building2, Mail, Phone,
  Edit3, Trash2, Sparkles, Download, Upload, Filter,
  CheckSquare, Square, ShieldCheck, TrendingUp, X,
  Pencil, Clock, PhoneCall, Copy, ArrowRight,
} from 'lucide-react'

const BLANK = { name: '', email: '', phone: '', company: '', status: 'active', notes: '' }

export default function Customers() {
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState('all')
  const [selectedIds, setSelectedIds] = useState([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [confirm, setConfirm] = useState(null)
  const [err, setErr] = useState('')
  const [toast, setToast] = useState('')

  // Inline editing
  const [inlineEditId, setInlineEditId] = useState(null)
  const [inlineForm, setInlineForm] = useState({})

  // Side panels
  const [timelinePanelId, setTimelinePanelId] = useState(null)
  const [contactPanelId, setContactPanelId] = useState(null)
  const [profileData, setProfileData] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)

  // Email template modal
  const [emailModal, setEmailModal] = useState(false)
  const [emailTemplate, setEmailTemplate] = useState(
    'Dear {name},\n\nI hope this message finds you well.\n\n...'
  )

  const importRef = useRef(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  const load = () => {
    getCustomers()
      .then((r) => setRows(r.data))
      .catch((e) => console.error(e))
  }

  useEffect(() => { load() }, [])

  // Load profile when a panel opens
  const activePanelId = timelinePanelId || contactPanelId
  useEffect(() => {
    if (!activePanelId) { setProfileData(null); return }
    setProfileLoading(true)
    getCustomerProfile(activePanelId)
      .then(r => setProfileData(r.data))
      .catch(() => setProfileData(null))
      .finally(() => setProfileLoading(false))
  }, [activePanelId])

  const openAdd = () => {
    setEditing(null); setForm(BLANK); setErr(''); setModal(true)
  }

  const openEdit = (row) => {
    setEditing(row); setForm({ ...row }); setErr(''); setModal(true)
  }

  const handleSave = async (e) => {
    e?.preventDefault(); setErr('')
    try {
      if (editing) {
        await updateCustomer(editing.id, form)
        showToast(`Customer "${form.name}" updated successfully!`)
      } else {
        await createCustomer(form)
        showToast(`Customer "${form.name}" registered successfully!`)
      }
      setModal(false); load()
    } catch (ex) {
      setErr(ex.response?.data?.error ?? 'Error saving customer profile')
    }
  }

  const handleDelete = async (id) => {
    await deleteCustomer(id)
    setSelectedIds((prev) => prev.filter((i) => i !== id))
    showToast('Customer account deleted'); load()
  }

  // ── Inline edit ─────────────────────────────────────────────────────────
  const startInlineEdit = (row) => {
    setInlineEditId(row.id)
    setInlineForm({ name: row.name, email: row.email, phone: row.phone ?? '' })
  }

  const saveInlineEdit = async (id) => {
    try {
      await updateCustomer(id, inlineForm)
      showToast('Customer updated')
    } catch { showToast('Failed to save inline edit') }
    finally { setInlineEditId(null); load() }
  }

  const cancelInlineEdit = () => setInlineEditId(null)

  // ── Multi-select ─────────────────────────────────────────────────────────
  const handleSelectAll = (filteredRows) => {
    if (selectedIds.length === filteredRows.length) setSelectedIds([])
    else setSelectedIds(filteredRows.map((r) => r.id))
  }

  const toggleSelectOne = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )

  // ── Bulk actions ─────────────────────────────────────────────────────────
  const handleBulkStatus = async (status) => {
    if (!selectedIds.length) return
    try {
      await bulkCustomers({ action: 'status', ids: selectedIds, status })
      showToast(`Updated status to "${status}" for ${selectedIds.length} accounts`)
      setSelectedIds([]); load()
    } catch { alert('Bulk status update failed') }
  }

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return
    if (!window.confirm(`Permanently delete ${selectedIds.length} selected customer accounts?`)) return
    try {
      await bulkCustomers({ action: 'delete', ids: selectedIds })
      showToast(`Deleted ${selectedIds.length} accounts`)
      setSelectedIds([]); load()
    } catch { alert('Bulk delete failed') }
  }

  // ── CSV Export ────────────────────────────────────────────────────────────
  const exportToCSV = (dataToExport) => {
    const list = dataToExport?.length ? dataToExport : rows
    if (!list.length) return
    const headers = ['name', 'email', 'phone', 'company', 'status', 'notes']
    const csvRows = [
      headers.join(','),
      ...list.map((r) =>
        headers.map(h => `"${(r[h] ?? '').toString().replace(/"/g, '""')}"`).join(',')
      ),
    ]
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `customers_export_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast(`Exported ${list.length} accounts to CSV`)
  }

  // ── CSV Import ─────────────────────────────────────────────────────────────
  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (evt) => {
      const lines = evt.target.result.split('\n').filter(Boolean)
      const dataLines = lines.slice(1) // skip header
      let success = 0
      for (const line of dataLines) {
        const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"'))
        const [name, email, phone, company, status, notes] = cols
        if (!name || !email) continue
        try {
          await createCustomer({
            name, email,
            phone: phone ?? '',
            company: company ?? '',
            status: status === 'inactive' ? 'inactive' : 'active',
            notes: notes ?? '',
          })
          success++
        } catch { /* skip invalid rows */ }
      }
      showToast(`Imported ${success} customer${success !== 1 ? 's' : ''} successfully`)
      load()
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── Quick contact actions ──────────────────────────────────────────────────
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => showToast(`${label} copied`))
  }

  const quickLogCall = async (customerId) => {
    try {
      await quickLogActivity({ customer_id: customerId, type: 'call', notes: 'Quick call logged' })
      showToast('Call logged successfully')
    } catch { showToast('Failed to log call') }
  }

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = rows.filter((r) => {
    const s = search.toLowerCase()
    const matchesSearch =
      r.name.toLowerCase().includes(s) ||
      r.email.toLowerCase().includes(s) ||
      (r.company ?? '').toLowerCase().includes(s)
    let matchesSeg = true
    if (segment === 'active') matchesSeg = r.status === 'active'
    else if (segment === 'inactive') matchesSeg = r.status === 'inactive'
    else if (segment === 'at-risk') matchesSeg = r.health_grade === 'C'
    return matchesSearch && matchesSeg
  })

  const activeCount = rows.filter((r) => r.status === 'active').length
  const inactiveCount = rows.filter((r) => r.status === 'inactive').length
  const atRiskCount = rows.filter((r) => r.health_grade === 'C').length
  const totalLtv = rows.reduce((acc, r) => acc + Number(r.lifetime_value || 0), 0)

  const segments = [
    { key: 'all',      label: 'All',      count: rows.length },
    { key: 'active',   label: 'Active',   count: activeCount },
    { key: 'inactive', label: 'Inactive', count: inactiveCount },
    { key: 'at-risk',  label: 'At Risk',  count: atRiskCount },
  ]

  // ── Timeline / Contact panel helpers ─────────────────────────────────────
  const historyTypeColors = {
    lead: 'bg-indigo-50 text-indigo-700',
    deal: 'bg-emerald-50 text-emerald-700',
    followup: 'bg-amber-50 text-amber-700',
  }

  const selectedEmails = rows.filter(r => selectedIds.includes(r.id)).map(r => r.email).filter(Boolean)

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 text-xs font-bold flex items-center gap-3 animate-scaleIn">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toast}</span>
          <button onClick={() => setToast('')} className="text-slate-400 hover:text-white ml-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Hidden CSV import input */}
      <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              Accounts Directory
            </span>
            <span className="text-xs text-slate-400 font-medium">Batch Controls Enabled</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Customer Accounts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage enterprise accounts, monitor health scores, and execute batch operations.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button onClick={() => importRef.current?.click()} className="btn-secondary">
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Import CSV</span>
          </button>
          <button onClick={() => exportToCSV(filtered)} className="btn-secondary">
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button onClick={openAdd} className="btn-primary">
            <UserPlus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Accounts</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{rows.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Active Accounts</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Lifetime Won LTV</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">${totalLtv.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Dormant Accounts</p>
            <p className="text-2xl font-black text-slate-500 mt-0.5">{inactiveCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search + Smart Segments */}
      <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 py-2"
          />
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto scrollbar-none">
          {segments.map(s => (
            <button
              key={s.key}
              onClick={() => setSegment(s.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                segment === s.key
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>{s.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                segment === s.key ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {s.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Customers Table */}
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
                <th className="px-5 py-3.5">Account / Contact</th>
                <th className="px-5 py-3.5">Company</th>
                <th className="px-5 py-3.5">Health Grade</th>
                <th className="px-5 py-3.5">Won Revenue</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400 text-sm">
                    No customers match your query. Try resetting your search or filter.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const isSelected = selectedIds.includes(r.id)
                  const isInlineEditing = inlineEditId === r.id
                  const initials = r.name
                    ? r.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                    : 'CU'

                  const healthColors = ({
                    'A+': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    'A': 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    'B': 'bg-amber-50 text-amber-700 border-amber-200',
                    'C': 'bg-slate-100 text-slate-600 border-slate-200',
                  })[r.health_grade || 'C'] || 'bg-slate-100 text-slate-600 border-slate-200'

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50/80 transition-colors group ${isSelected ? 'bg-indigo-50/30' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="px-5 py-3.5">
                        <button onClick={() => toggleSelectOne(r.id)} className="text-slate-400 hover:text-slate-700 cursor-pointer pt-0.5">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>

                      {/* Name / Email — inline editable */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            {isInlineEditing ? (
                              <>
                                <input
                                  autoFocus
                                  className="input py-1 text-sm font-bold mb-1 w-full"
                                  value={inlineForm.name ?? ''}
                                  onChange={e => setInlineForm(f => ({ ...f, name: e.target.value }))}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') saveInlineEdit(r.id)
                                    if (e.key === 'Escape') cancelInlineEdit()
                                  }}
                                  onBlur={() => saveInlineEdit(r.id)}
                                />
                                <input
                                  className="input py-1 text-xs w-full"
                                  value={inlineForm.email ?? ''}
                                  onChange={e => setInlineForm(f => ({ ...f, email: e.target.value }))}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') saveInlineEdit(r.id)
                                    if (e.key === 'Escape') cancelInlineEdit()
                                  }}
                                />
                              </>
                            ) : (
                              <>
                                <div className="font-bold text-slate-900 truncate">{r.name}</div>
                                <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Mail className="w-3 h-3 text-slate-400" />
                                  <span>{r.email}</span>
                                </div>
                              </>
                            )}
                          </div>
                          {!isInlineEditing && (
                            <button
                              onClick={() => startInlineEdit(r)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer shrink-0"
                              title="Inline edit"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Company */}
                      <td className="px-5 py-3.5">
                        {r.company ? (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{r.company}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Individual Account</span>
                        )}
                      </td>

                      {/* Health Grade */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border ${healthColors}`}>
                          <span>{r.health_grade || 'C'}</span>
                          <span className="text-[10px] font-medium opacity-80">{r.health_label || 'Prospect'}</span>
                        </span>
                      </td>

                      {/* Won Revenue */}
                      <td className="px-5 py-3.5">
                        <span className="font-extrabold text-slate-900">
                          ${Number(r.lifetime_value || 0).toLocaleString()}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <StatusBadge status={r.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setTimelinePanelId(r.id)}
                            className="btn-sm-blue"
                            title="Activity Timeline"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Timeline</span>
                          </button>
                          <button
                            onClick={() => setContactPanelId(r.id)}
                            className="btn-sm-action"
                            title="Quick Contact"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Contact</span>
                          </button>
                          <button
                            onClick={() => openEdit(r)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirm(r.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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

      {/* Floating Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-4 animate-scaleIn">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-indigo-600 font-bold text-xs text-white">{selectedIds.length}</span>
            <span className="text-xs font-medium text-slate-300">Selected</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => handleBulkStatus('active')} className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer">
              Mark Active
            </button>
            <button onClick={() => handleBulkStatus('inactive')} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer">
              Mark Inactive
            </button>
            <button
              onClick={() => setEmailModal(true)}
              className="px-3 py-1.5 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Template</span>
            </button>
            <button
              onClick={() => exportToCSV(rows.filter((r) => selectedIds.includes(r.id)))}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Selected</span>
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 bg-rose-600/90 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
          <button onClick={() => setSelectedIds([])} className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Edit Customer Account' : 'Create Customer Account'}
        subtitle={editing ? 'Update client details and relationship status' : 'Register a new enterprise or private client'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {err && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">{err}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="label">Customer Name *</label>
              <input
                required className="input" placeholder="e.g. Johnathan Vance"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Work Email *</label>
              <input
                type="email" required className="input" placeholder="john@company.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="label">Company / Organization</label>
              <input
                className="input" placeholder="e.g. Acme Corp Inc."
                value={form.company ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input
                className="input" placeholder="+1 (555) 000-0000"
                value={form.phone ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="label">Account Status</label>
            <select className="input font-medium" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="active">Active Client</option>
              <option value="inactive">Inactive / Past Client</option>
            </select>
          </div>
          <div>
            <label className="label">Account Notes &amp; Context</label>
            <textarea
              className="input resize-none" rows={3}
              placeholder="Strategic notes, purchasing authority, contract preferences..."
              value={form.notes ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Save Changes' : 'Create Account'}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => handleDelete(confirm)}
        message="Are you sure you want to delete this customer? All associated leads will have their customer link unassigned."
      />

      {/* Email Template Modal */}
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEmailModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 animate-scaleIn">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Bulk Email Template</h3>
                <p className="text-xs text-slate-500">{selectedIds.length} recipient{selectedIds.length !== 1 ? 's' : ''} selected</p>
              </div>
              <button onClick={() => setEmailModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              className="input resize-none h-32 w-full mb-3"
              value={emailTemplate}
              onChange={e => setEmailTemplate(e.target.value)}
              placeholder="Write your email template here..."
            />
            <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-600 mb-1.5">Recipients:</p>
              <p className="text-xs text-slate-500 break-all">{selectedEmails.join(', ') || 'No emails available'}</p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  copyToClipboard(selectedEmails.join(', '), 'All emails')
                  setEmailModal(false)
                }}
                className="btn-primary"
              >
                <Copy className="w-4 h-4" />
                <span>Copy All Emails</span>
              </button>
              <button onClick={() => setEmailModal(false)} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Timeline Side Panel */}
      <SidePanel
        open={!!timelinePanelId}
        onClose={() => setTimelinePanelId(null)}
        title="Activity Timeline"
        subtitle={profileData?.customer?.name ?? 'Customer History'}
      >
        {profileLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : profileData ? (
          <div className="space-y-4">
            {/* Customer header */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                {(profileData.customer?.name || 'CU').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">{profileData.customer?.name}</p>
                <p className="text-xs text-slate-500">{profileData.customer?.company || 'Individual'}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-[11px] font-bold text-emerald-700">${Number(profileData.metrics?.lifetime_value || 0).toLocaleString()}</p>
                <p className="text-[10px] text-slate-400">LTV</p>
              </div>
            </div>

            {/* Stat pills */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-center">
                <p className="text-sm font-extrabold text-emerald-700">${Number(profileData.metrics?.lifetime_value || 0).toLocaleString()}</p>
                <p className="text-[10px] text-emerald-600">Lifetime Value</p>
              </div>
              <div className="p-2.5 bg-indigo-50 rounded-xl text-center">
                <p className="text-sm font-extrabold text-indigo-700">${Number(profileData.metrics?.pipeline_value || 0).toLocaleString()}</p>
                <p className="text-[10px] text-indigo-600">Pipeline Value</p>
              </div>
            </div>

            {/* History timeline */}
            <div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">History</p>
              {(!profileData.history || profileData.history.length === 0) ? (
                <p className="text-xs text-slate-400 text-center py-4">No history events yet</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {profileData.history.map(h => (
                    <div key={h.id} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${historyTypeColors[h.entity_type] || 'bg-slate-100 text-slate-600'}`}>
                        {h.entity_type}
                      </span>
                      <span className="text-slate-500">{h.from_status ?? '—'}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="text-slate-800 font-semibold">{h.to_status}</span>
                      <span className="ml-auto text-slate-400 text-[10px] whitespace-nowrap">{(h.changed_at || '').slice(0, 10)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active leads */}
            {profileData.leads?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Active Leads</p>
                <div className="space-y-1.5">
                  {profileData.leads.filter(l => !['converted','unqualified'].includes(l.status)).map(l => (
                    <div key={l.id} className="p-2.5 bg-amber-50 rounded-xl border border-amber-100 text-xs">
                      <p className="font-semibold text-slate-800 truncate">{l.title}</p>
                      <p className="text-amber-600 font-bold">${Number(l.value || 0).toLocaleString()} · {l.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active deals */}
            {profileData.deals?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Active Deals</p>
                <div className="space-y-1.5">
                  {profileData.deals.filter(d => !['closed-won','closed-lost'].includes(d.stage)).map(d => (
                    <div key={d.id} className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 text-xs">
                      <p className="font-semibold text-slate-800 truncate">{d.title}</p>
                      <p className="text-indigo-600 font-bold">${Number(d.value || 0).toLocaleString()} · {d.stage}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-8">Failed to load profile data</p>
        )}
      </SidePanel>

      {/* Quick Contact Side Panel */}
      {(() => {
        const contactRow = rows.find(r => r.id === contactPanelId)
        return (
          <SidePanel
            open={!!contactPanelId}
            onClose={() => setContactPanelId(null)}
            title="Quick Contact"
            subtitle={contactRow?.name ?? ''}
          >
            {contactRow && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-slate-700 flex-1 truncate">{contactRow.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-slate-700 flex-1">{contactRow.phone || '—'}</span>
                  </div>
                  {contactRow.notes && (
                    <div className="pt-2 border-t border-slate-200 text-xs text-slate-500">{contactRow.notes}</div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => copyToClipboard(contactRow.email, 'Email')}
                    className="btn-secondary w-full justify-start gap-2"
                  >
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>Copy Email</span>
                  </button>
                  <button
                    onClick={() => copyToClipboard(contactRow.phone || '', 'Phone')}
                    className="btn-secondary w-full justify-start gap-2"
                    disabled={!contactRow.phone}
                  >
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>Copy Phone</span>
                  </button>
                  <button
                    onClick={() => {
                      quickLogCall(contactRow.id)
                      setContactPanelId(null)
                    }}
                    className="btn-primary w-full justify-start gap-2"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Log Call</span>
                  </button>
                </div>
              </div>
            )}
          </SidePanel>
        )
      })()}
    </div>
  )
}
