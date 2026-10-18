import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area, CartesianGrid
} from 'recharts'
import {
  Users, Target, Briefcase, DollarSign, TrendingUp, TrendingDown,
  Clock, AlertTriangle, ArrowUpRight, Sparkles, CheckCircle2,
  Calendar, Activity, Plus, Zap, BarChart2, Award, Shield,
  RefreshCw, ChevronRight, Star, Phone, Mail
} from 'lucide-react'
import { getDashboard, getAnalytics, quickLogActivity, getCustomers } from '../api'

const STAGE_COLORS = ['#6366f1', '#3b82f6', '#f59e0b', '#10b981', '#f43f5e']
const CHANNEL_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e', '#8b5cf6']

// ─── Metric Card ────────────────────────────────────────────────────────────
function MetricCard({ title, value, subtitle, icon: Icon, trend, trendUp = true, color = 'indigo', onClick }) {
  const themeMap = {
    indigo: { bg: 'bg-indigo-50 text-indigo-600 border-indigo-100', glow: 'group-hover:border-indigo-300', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/80' },
    emerald: { bg: 'bg-emerald-50 text-emerald-600 border-emerald-100', glow: 'group-hover:border-emerald-300', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80' },
    amber: { bg: 'bg-amber-50 text-amber-600 border-amber-100', glow: 'group-hover:border-amber-300', badge: 'bg-amber-50 text-amber-700 border-amber-200/80' },
    rose: { bg: 'bg-rose-50 text-rose-600 border-rose-100', glow: 'group-hover:border-rose-300', badge: 'bg-rose-50 text-rose-700 border-rose-200/80' },
    purple: { bg: 'bg-purple-50 text-purple-600 border-purple-100', glow: 'group-hover:border-purple-300', badge: 'bg-purple-50 text-purple-700 border-purple-200/80' },
    sky: { bg: 'bg-sky-50 text-sky-600 border-sky-100', glow: 'group-hover:border-sky-300', badge: 'bg-sky-50 text-sky-700 border-sky-200/80' },
  }[color] || {}

  return (
    <div
      className={`glass-card p-5 group hover:-translate-y-1 hover:shadow-lg transition-all duration-200 ${themeMap.glow} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight truncate">{value ?? '—'}</p>
        </div>
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xs shrink-0 ml-3 ${themeMap.bg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium truncate pr-2">{subtitle}</span>
        {trend && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] border shrink-0 ${themeMap.badge}`}>
            {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Health Score Ring ───────────────────────────────────────────────────────
function HealthRing({ score = 0 }) {
  const r = 54
  const c = 2 * Math.PI * r
  const filled = (score / 100) * c
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#f43f5e'
  const label = score >= 75 ? 'Excellent' : score >= 50 ? 'Fair' : 'At Risk'

  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <svg width="132" height="132" viewBox="0 0 132 132">
        <circle cx="66" cy="66" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="66" cy="66" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${filled} ${c - filled}`}
          strokeLinecap="round"
          strokeDashoffset={c * 0.25}
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x="66" y="60" textAnchor="middle" fontSize="24" fontWeight="800" fill="#0f172a" fontFamily="inherit">
          {score}
        </text>
        <text x="66" y="78" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="inherit">
          / 100
        </text>
      </svg>
      <span className="text-sm font-bold" style={{ color }}>{label}</span>
      <span className="text-xs text-slate-400">Pipeline Health</span>
    </div>
  )
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, prefix = '' }) {
  if (active && payload?.length) {
    return (
      <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl border border-slate-800">
        <p className="font-bold text-slate-200">{label || payload[0].name}</p>
        <p className="text-indigo-400 font-semibold mt-0.5">
          {prefix}{typeof payload[0].value === 'number' ? payload[0].value.toLocaleString() : payload[0].value}
        </p>
      </div>
    )
  }
  return null
}

// ─── Progress Bar ────────────────────────────────────────────────────────────
function TargetProgressBar({ current, target, label }) {
  const pct = Math.min(100, Math.round((current / target) * 100))
  const color = pct >= 80 ? 'from-emerald-500 to-emerald-400' : pct >= 50 ? 'from-amber-500 to-amber-400' : 'from-indigo-600 to-violet-500'

  return (
    <div>
      <div className="flex justify-between items-end mb-2">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <span className="text-xs font-extrabold text-slate-800">{pct}%</span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-slate-400 font-medium">
        <span>${Number(current).toLocaleString()} closed</span>
        <span>Target: ${Number(target).toLocaleString()}</span>
      </div>
    </div>
  )
}

// ─── Quick Log Modal ─────────────────────────────────────────────────────────
function QuickLogModal({ open, onClose, customers, onSaved }) {
  const [form, setForm] = useState({ customer_id: '', type: 'call', notes: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.notes.trim()) { setErr('Notes are required'); return }
    setSaving(true); setErr('')
    try {
      await quickLogActivity(form)
      onSaved()
      onClose()
      setForm({ customer_id: '', type: 'call', notes: '' })
    } catch { setErr('Failed to log activity') }
    finally { setSaving(false) }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-scaleIn">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Quick Activity Log</h3>
            <p className="text-xs text-slate-500">Log a call, email or meeting instantly</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="call">Phone Call</option>
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
              <option value="demo">Demo</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Customer (optional)</label>
            <select className="input" value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
              <option value="">— Select Customer —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Notes *</label>
            <textarea
              className="input resize-none h-24"
              placeholder="What happened? Key takeaways, next steps..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
          {err && <p className="text-xs text-rose-600 font-medium">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving...' : 'Log Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [customers, setCustomers] = useState([])
  const [err, setErr] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [quickLog, setQuickLog] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const load = useCallback(async () => {
    try {
      const [dashRes, analyticsRes, custRes] = await Promise.all([
        getDashboard(),
        getAnalytics(),
        getCustomers(),
      ])
      setData(dashRes.data)
      setAnalytics(analyticsRes.data)
      setCustomers(custRes.data || [])
      setErr(null)
    } catch {
      setErr('Could not connect to CRM backend. Ensure server is active.')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
    showToast('Dashboard refreshed successfully')
  }

  if (err) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto bg-white rounded-2xl border border-rose-200 shadow-sm mt-10">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Service Connectivity Notice</h3>
        <p className="text-sm text-slate-600 mt-1">{err}</p>
        <button onClick={load} className="btn-primary mt-4">Retry Connection</button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-500">Compiling executive intelligence metrics...</p>
      </div>
    )
  }

  const leadChartData = Object.entries(data.leadsByStatus || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }))

  const dealChartData = Object.entries(data.dealsByStage || {}).map(([name, value]) => ({
    name: name.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase()),
    value,
  }))

  const channelData = (data.channelStats || []).map((c, i) => ({
    name: c.source?.replace('-', ' ').replace(/\b\w/g, x => x.toUpperCase()) || 'Other',
    leads: c.total_leads,
    converted: c.converted_count,
    fill: CHANNEL_COLORS[i % CHANNEL_COLORS.length],
  }))

  const winRate = analytics?.performance?.winRate ?? 0
  const healthScore = analytics?.performance?.healthScore ?? 70
  const leadConvRate = analytics?.performance?.leadConversionRate ?? 0
  const weightedPipeline = analytics?.forecast?.weightedPipeline ?? data.weightedPipelineValue ?? 0

  return (
    <div className="space-y-7 animate-fadeIn">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[60] bg-emerald-600 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* Quick Log Modal */}
      <QuickLogModal
        open={quickLog}
        onClose={() => setQuickLog(false)}
        customers={customers}
        onSaved={() => { load(); showToast('Activity logged to CRM!') }}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              Q4 FY2026
            </span>
            <span className="text-xs text-slate-400 font-medium">Real-time Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Executive Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pipeline velocity, deal analytics, customer intelligence & revenue forecasting.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button onClick={handleRefresh} className="btn-secondary" disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button onClick={() => setQuickLog(true)} className="btn-ghost border border-slate-200">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Log Activity</span>
          </button>
          <Link to="/pipeline" className="btn-secondary">
            <Briefcase className="w-4 h-4 text-slate-500" />
            <span>Pipeline</span>
          </Link>
          <Link to="/customers" className="btn-primary">
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </Link>
        </div>
      </div>

      {/* Overdue Alert */}
      {data.overdueFollowups > 0 && (
        <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50 border border-rose-200 text-rose-900 rounded-2xl px-5 py-3.5 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-rose-950">
                Action Required: {data.overdueFollowups} Overdue Follow-Up{data.overdueFollowups > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-rose-700">
                Unresolved touches may jeopardize deal momentum. Review the follow-ups queue immediately.
              </p>
            </div>
          </div>
          <Link
            to="/followups"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0"
          >
            <span>Resolve Now</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <MetricCard
          title="Active Pipeline"
          value={`$${Number(data.totalPipelineValue || 0).toLocaleString()}`}
          subtitle={`${data.dealCount || 0} active deals in cycle`}
          icon={TrendingUp}
          trend="+18.4%"
          color="indigo"
        />
        <MetricCard
          title="Closed-Won Revenue"
          value={`$${Number(data.closedWonValue || 0).toLocaleString()}`}
          subtitle={`${data.dealsByStage?.['closed-won'] || 0} deals closed`}
          icon={DollarSign}
          trend={`${winRate}% Win Rate`}
          color="emerald"
        />
        <MetricCard
          title="Weighted Forecast"
          value={`$${Number(weightedPipeline).toLocaleString()}`}
          subtitle="Probability-adjusted pipeline"
          icon={BarChart2}
          trend="AI Forecast"
          color="purple"
        />
        <MetricCard
          title="Customer Base"
          value={data.customerCount || 0}
          subtitle={`${data.activeCustomers || 0} active accounts`}
          icon={Users}
          trend="+9.2%"
          color="sky"
        />
        <MetricCard
          title="Total Leads"
          value={data.leadCount || 0}
          subtitle="Top channel: Inbound Web"
          icon={Target}
          trend={`${leadConvRate}% Converted`}
          color="amber"
        />
        <MetricCard
          title="Pending Follow-Ups"
          value={data.pendingFollowups || 0}
          subtitle="Scheduled client touchpoints"
          icon={Clock}
          color="amber"
        />
        <MetricCard
          title="Overdue Actions"
          value={data.overdueFollowups || 0}
          subtitle="Immediate attention needed"
          icon={AlertTriangle}
          trendUp={false}
          color={data.overdueFollowups > 0 ? 'rose' : 'emerald'}
        />
        <MetricCard
          title="Lead Conv. Rate"
          value={`${leadConvRate}%`}
          subtitle={`${analytics?.performance?.convertedLeads || 0} of ${data.leadCount || 0} converted`}
          icon={CheckCircle2}
          trend={leadConvRate >= 20 ? 'Strong' : 'Needs Work'}
          color={leadConvRate >= 20 ? 'emerald' : 'amber'}
        />
      </div>

      {/* Revenue Target + Health Score Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Target Progress */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight">Revenue Target Tracker</h2>
              <p className="text-xs text-slate-400">Q4 monthly close goal vs actual performance</p>
            </div>
          </div>
          <div className="space-y-5">
            <TargetProgressBar
              current={data.closedWonValue || 0}
              target={data.monthlyTarget || 250000}
              label="Monthly Revenue Goal"
            />
            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-100">
              {[
                { label: 'Closed Won', value: `$${Number(data.closedWonValue || 0).toLocaleString()}`, icon: CheckCircle2, color: 'text-emerald-600' },
                { label: 'Unweighted', value: `$${Number(data.totalPipelineValue || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-indigo-600' },
                { label: 'Weighted', value: `$${Number(weightedPipeline).toLocaleString()}`, icon: BarChart2, color: 'text-purple-600' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="text-center">
                  <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
                  <div className="text-lg font-extrabold text-slate-900 leading-tight">{value}</div>
                  <div className="text-[11px] text-slate-500 font-medium">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pipeline Health Score */}
        <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-800 tracking-tight">Pipeline Health</h2>
          </div>
          <HealthRing score={healthScore} />
          <div className="grid grid-cols-2 gap-3 mt-4 w-full text-xs">
            <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-200/80">
              <div className="font-extrabold text-slate-900 text-base">{winRate}%</div>
              <div className="text-slate-500">Win Rate</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-200/80">
              <div className="font-extrabold text-slate-900 text-base">{analytics?.performance?.followupCompletionRate ?? 0}%</div>
              <div className="text-slate-500">SLA Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads Bar Chart */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight">Lead Status Distribution</h2>
              <p className="text-xs text-slate-400">Prospect progression across acquisition stages</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
              {data.leadCount || 0} Total
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Deals Donut */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight">Deals by Stage</h2>
              <p className="text-xs text-slate-400">Pipeline distribution from Prospect to Closed</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
              {data.dealCount || 0} Deals
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dealChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                  {dealChartData.map((_, i) => <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />)}
                </Pie>
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Channel Performance */}
      {channelData.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800 tracking-tight">Acquisition Channel Performance</h2>
                <p className="text-xs text-slate-400">Leads generated vs conversions by channel source</p>
              </div>
            </div>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="leads" name="Total Leads" fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="converted" name="Converted" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Bottom Row: Top Accounts + Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Key Accounts */}
        {data.topAccounts && data.topAccounts.length > 0 && (
          <div className="glass-card p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Star className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800 tracking-tight">Top Key Accounts</h2>
                <p className="text-xs text-slate-400">By closed-won revenue (LTV)</p>
              </div>
            </div>
            <div className="space-y-2">
              {data.topAccounts.map((acc, i) => (
                <div key={acc.id} className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-colors group">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-[11px] font-extrabold text-white shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-800 truncate">{acc.name}</div>
                    <div className="text-xs text-slate-500 truncate">{acc.company}</div>
                  </div>
                  <div className="text-sm font-extrabold text-emerald-700 shrink-0">
                    ${Number(acc.revenue).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workflow Activity Log */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800 tracking-tight">Live Audit Trail</h2>
                <p className="text-xs text-slate-400">Automated state transitions & events</p>
              </div>
            </div>
            <button onClick={() => setQuickLog(true)} className="btn-sm-blue">
              <Zap className="w-3.5 h-3.5" /> Log
            </button>
          </div>
          {!data.recentActivity || data.recentActivity.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No pipeline events yet. Perform lead transitions or move deals to see logs.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[280px] overflow-y-auto">
              {data.recentActivity.map((a) => (
                <div key={a.id} className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50/60 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                      {a.entity_type}
                    </span>
                    <div className="flex items-center gap-1 font-medium text-slate-700">
                      <span className="text-slate-500 text-[11px]">{a.from_status ?? 'Initial'}</span>
                      <ChevronRight className="w-3 h-3 text-indigo-400" />
                      <span className="text-emerald-700 font-bold text-[11px]">{a.to_status}</span>
                    </div>
                  </div>
                  <span className="text-slate-400 font-mono text-[10px] shrink-0 pl-2">
                    {a.changed_at?.slice(0, 16).replace('T', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
