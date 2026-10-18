import { useEffect, useState } from 'react'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import StatusBadge from '../components/StatusBadge'
import CustomerProfileModal from '../components/CustomerProfileModal'
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  bulkCustomers
} from '../api'
import {
  Users,
  UserPlus,
  Search,
  Building2,
  Mail,
  Phone,
  Edit3,
  Trash2,
  Sparkles,
  Download,
  Filter,
  CheckSquare,
  Square,
  ShieldCheck,
  TrendingUp,
  X
} from 'lucide-react'

const BLANK = { name: '', email: '', phone: '', company: '', status: 'active', notes: '' }

export default function Customers() {
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [confirm, setConfirm] = useState(null)
  const [err, setErr] = useState('')
  const [toast, setToast] = useState('')
  const [profileCustomerId, setProfileCustomerId] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  const load = () => {
    getCustomers()
      .then((r) => setRows(r.data))
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
    setForm({ ...row })
    setErr('')
    setModal(true)
  }

  const handleSave = async (e) => {
    e?.preventDefault()
    setErr('')
    try {
      if (editing) {
        await updateCustomer(editing.id, form)
        showToast(`Customer "${form.name}" updated successfully!`)
      } else {
        await createCustomer(form)
        showToast(`Customer "${form.name}" registered successfully!`)
      }
      setModal(false)
      load()
    } catch (e) {
      setErr(e.response?.data?.error ?? 'Error saving customer profile')
    }
  }

  const handleDelete = async (id) => {
    await deleteCustomer(id)
    setSelectedIds((prev) => prev.filter((i) => i !== id))
    showToast('Customer account deleted')
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

  // Batch bulk actions
  const handleBulkStatus = async (status) => {
    if (selectedIds.length === 0) return
    try {
      await bulkCustomers({ action: 'status', ids: selectedIds, status })
      showToast(`Updated status to "${status}" for ${selectedIds.length} accounts`)
      setSelectedIds([])
      load()
    } catch (e) {
      alert('Bulk status update failed')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!window.confirm(`Permanently delete ${selectedIds.length} selected customer accounts?`)) return
    try {
      await bulkCustomers({ action: 'delete', ids: selectedIds })
      showToast(`Deleted ${selectedIds.length} accounts`)
      setSelectedIds([])
      load()
    } catch (e) {
      alert('Bulk delete failed')
    }
  }

  // Export to CSV helper
  const exportToCSV = (dataToExport) => {
    const list = dataToExport && dataToExport.length > 0 ? dataToExport : rows
    if (list.length === 0) return
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Company', 'Status', 'Lifetime Won ($)', 'Open Pipeline ($)', 'Health Grade', 'Created At']
    const csvRows = [
      headers.join(','),
      ...list.map((r) =>
        [
          r.id,
          `"${r.name || ''}"`,
          `"${r.email || ''}"`,
          `"${r.phone || ''}"`,
          `"${r.company || ''}"`,
          r.status,
          r.lifetime_value || 0,
          r.pipeline_value || 0,
          r.health_grade || 'C',
          r.created_at,
        ].join(',')
      ),
    ]
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `customers_export_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast(`Exported ${list.length} accounts to CSV`)
  }

  const filtered = rows.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      (r.company ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const activeCount = rows.filter((r) => r.status === 'active').length
  const inactiveCount = rows.filter((r) => r.status === 'inactive').length
  const totalLtv = rows.reduce((acc, r) => acc + Number(r.lifetime_value || 0), 0)

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Toast feedback */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 text-xs font-bold flex items-center gap-3 animate-scaleIn">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toast}</span>
          <button onClick={() => setToast('')} className="text-slate-400 hover:text-white ml-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
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

      {/* Summary KPI Cards Strip */}
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

      {/* Search and Filters Toolbar */}
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

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {['all', 'active', 'inactive'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                  statusFilter === s
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Customers Table */}
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
                  const initials = r.name
                    ? r.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    : 'CU'

                  const healthColors = {
                    'A+': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    'A': 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    'B': 'bg-amber-50 text-amber-700 border-amber-200',
                    'C': 'bg-slate-100 text-slate-600 border-slate-200',
                  }[r.health_grade || 'C']

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50/80 transition-colors group ${
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

                      <td
                        className="px-5 py-3.5 cursor-pointer"
                        onClick={() => setProfileCustomerId(r.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                              <span>{r.name}</span>
                              <span className="text-[10px] text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                                View 360°
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{r.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 cursor-pointer" onClick={() => setProfileCustomerId(r.id)}>
                        {r.company ? (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{r.company}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Individual Account</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 cursor-pointer" onClick={() => setProfileCustomerId(r.id)}>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border ${healthColors}`}>
                          <span>{r.health_grade || 'C'}</span>
                          <span className="text-[10px] font-medium opacity-80 font-sans">
                            {r.health_label || 'Prospect'}
                          </span>
                        </span>
                      </td>

                      <td className="px-5 py-3.5 cursor-pointer" onClick={() => setProfileCustomerId(r.id)}>
                        <span className="font-extrabold text-slate-900">
                          ${Number(r.lifetime_value || 0).toLocaleString()}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 cursor-pointer" onClick={() => setProfileCustomerId(r.id)}>
                        <StatusBadge status={r.status} />
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setProfileCustomerId(r.id)}
                            className="btn-sm-blue"
                            title="Open Customer 360 Profile"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>360° Profile</span>
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
              onClick={() => handleBulkStatus('active')}
              className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Mark Active
            </button>
            <button
              onClick={() => handleBulkStatus('inactive')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Mark Inactive
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

          <button
            onClick={() => setSelectedIds([])}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Deselect all"
          >
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
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {err}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="label">Customer Name *</label>
              <input
                required
                className="input"
                placeholder="e.g. Johnathan Vance"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Work Email *</label>
              <input
                type="email"
                required
                className="input"
                placeholder="john@company.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="label">Company / Organization</label>
              <input
                className="input"
                placeholder="e.g. Acme Corp Inc."
                value={form.company ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input
                className="input"
                placeholder="+1 (555) 000-0000"
                value={form.phone ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="label">Account Status</label>
            <select
              className="input font-medium"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="active">Active Client</option>
              <option value="inactive">Inactive / Past Client</option>
            </select>
          </div>

          <div>
            <label className="label">Account Notes & Context</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Strategic notes, purchasing authority, contract preferences..."
              value={form.notes ?? ''}
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
              {editing ? 'Save Changes' : 'Create Account'}
            </button>
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

      {/* Customer 360° Intelligence Modal */}
      <CustomerProfileModal
        customerId={profileCustomerId}
        open={!!profileCustomerId}
        onClose={() => setProfileCustomerId(null)}
      />
    </div>
  )
}
