import { useEffect, useState } from 'react'
import Modal from './Modal'
import StatusBadge from './StatusBadge'
import { getCustomerProfile } from '../api'
import {
  Building2,
  Mail,
  Phone,
  DollarSign,
  TrendingUp,
  Briefcase,
  Target,
  Calendar,
  History,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react'

export default function CustomerProfileModal({ customerId, open, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('deals') // 'deals' | 'leads' | 'followups' | 'history'

  useEffect(() => {
    if (!customerId || !open) {
      setData(null)
      return
    }
    setLoading(true)
    getCustomerProfile(customerId)
      .then((res) => setData(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [customerId, open])

  if (!open) return null

  const customer = data?.customer
  const metrics = data?.metrics || {}

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Customer 360° Intelligence Profile"
      subtitle={customer ? `${customer.name} · ${customer.company || 'Private Account'}` : 'Loading profile...'}
      maxWidth="max-w-3xl"
    >
      {loading || !customer ? (
        <div className="py-12 text-center text-slate-500 space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm">Fetching 360° intelligence & financial metrics...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Profile Summary Card */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-lg border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-xl font-extrabold text-white shadow-md shadow-indigo-500/30 border border-indigo-300/30">
                  {customer.name?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-xl font-bold text-white tracking-tight">{customer.name}</h3>
                    <StatusBadge status={customer.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1.5">
                    {customer.company && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                        {customer.company}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-indigo-400" />
                      {customer.email}
                    </span>
                    {customer.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-indigo-400" />
                        {customer.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Status Tag */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Account Standing</span>
                <span className="text-emerald-400 font-bold text-sm flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" /> Good Standing
                </span>
              </div>
            </div>

            {/* Financial Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
              <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
                <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Lifetime Won
                </div>
                <div className="text-lg font-black text-white mt-0.5">
                  ${Number(metrics.lifetimeValue || 0).toLocaleString()}
                </div>
              </div>

              <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
                <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> Open Pipeline
                </div>
                <div className="text-lg font-black text-indigo-200 mt-0.5">
                  ${Number(metrics.openPipelineValue || 0).toLocaleString()}
                </div>
              </div>

              <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
                <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-amber-400" /> Won Deals
                </div>
                <div className="text-lg font-black text-white mt-0.5">
                  {metrics.wonDealsCount || 0} <span className="text-xs font-normal text-slate-400">/ {metrics.dealsCount || 0}</span>
                </div>
              </div>

              <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
                <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-sky-400" /> Touchpoints
                </div>
                <div className="text-lg font-black text-white mt-0.5">
                  {(metrics.followupsCount || 0) + (metrics.leadsCount || 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            {[
              { id: 'deals', label: `Deals (${data.deals?.length || 0})`, icon: Briefcase },
              { id: 'leads', label: `Leads (${data.leads?.length || 0})`, icon: Target },
              { id: 'followups', label: `Follow-Ups (${data.followups?.length || 0})`, icon: Calendar },
              { id: 'history', label: `Audit Log (${data.history?.length || 0})`, icon: History },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  tab === id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content Panes */}
          <div className="min-h-[180px]">
            {tab === 'deals' && (
              <div className="space-y-2">
                {!data.deals || data.deals.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">No deals recorded for this customer yet.</p>
                ) : (
                  data.deals.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-colors"
                    >
                      <div>
                        <div className="text-sm font-bold text-slate-800">{d.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Target Close: {d.close_date ? d.close_date.slice(0, 10) : 'Not scheduled'}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-extrabold text-slate-900">
                          ${Number(d.value || 0).toLocaleString()}
                        </span>
                        <StatusBadge status={d.stage} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'leads' && (
              <div className="space-y-2">
                {!data.leads || data.leads.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">No leads associated with this account.</p>
                ) : (
                  data.leads.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-colors"
                    >
                      <div>
                        <div className="text-sm font-bold text-slate-800">{l.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5 capitalize">
                          Source: {l.source} · Created {l.created_at?.slice(0, 10)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-700">
                          ${Number(l.value || 0).toLocaleString()}
                        </span>
                        <StatusBadge status={l.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'followups' && (
              <div className="space-y-2">
                {!data.followups || data.followups.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">No follow-up touchpoints scheduled.</p>
                ) : (
                  data.followups.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-colors"
                    >
                      <div>
                        <div className="text-sm font-bold text-slate-800 capitalize flex items-center gap-2">
                          <span className="capitalize">{f.type}</span>
                          {f.lead_title && <span className="text-xs text-slate-400 font-normal">({f.lead_title})</span>}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Scheduled: {f.scheduled_at?.slice(0, 16).replace('T', ' ')}
                        </div>
                      </div>
                      <StatusBadge status={f.status} />
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'history' && (
              <div className="space-y-2">
                {!data.history || data.history.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">No automated workflow events logged yet.</p>
                ) : (
                  data.history.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-600 uppercase">{h.entity_type}</span>
                        <span className="text-slate-500">#{h.entity_id}:</span>
                        <span className="font-medium text-slate-600">{h.from_status || 'Initial'}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="font-bold text-emerald-600">{h.to_status}</span>
                      </div>
                      <span className="text-slate-400">
                        {h.changed_at?.slice(0, 16).replace('T', ' ')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button onClick={onClose} className="btn-secondary">
              Close Profile
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
