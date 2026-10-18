import { useMemo } from 'react'
import { Building2, Target, Calendar, Edit3, Trash2, Copy } from 'lucide-react'
import { DEAL_TRANSITIONS } from '../utils/statusColors'

const STAGE_ORDER = ['prospect', 'proposal', 'negotiation', 'closed-won', 'closed-lost']

/**
 * KanbanCard — full deal card for Pipeline Kanban.
 * Props:
 *   deal          {object}
 *   onTransition  {(id, stage) => void}
 *   onEdit        {(deal) => void}
 *   onDelete      {(id) => void}
 *   onDuplicate   {(id) => void}
 */
export default function KanbanCard({ deal, onTransition, onEdit, onDelete, onDuplicate }) {
  const { daysToClose, health } = useMemo(() => {
    const days = Math.ceil((new Date(deal.close_date) - new Date()) / 86400000)
    let h = 'healthy'
    if (days < 0)   h = 'overdue'
    else if (days <= 7)  h = 'critical'
    else if (days <= 30) h = 'warning'
    return { daysToClose: days, health: h }
  }, [deal.close_date])

  const healthDot = {
    overdue:  'bg-rose-500 animate-pulse',
    critical: 'bg-rose-400',
    warning:  'bg-amber-400',
    healthy:  'bg-emerald-400',
  }[health]

  const closeBadge = {
    overdue:  'bg-rose-50 text-rose-600 border-rose-200',
    critical: 'bg-rose-50 text-rose-500 border-rose-200',
    warning:  'bg-amber-50 text-amber-600 border-amber-200',
    healthy:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  }[health]

  const stageIndex = STAGE_ORDER.indexOf(deal.stage)
  const progressFill = stageIndex < 0 ? 0 : stageIndex          // 0-4 filled segments out of 4
  const segments = 4

  const transitions = DEAL_TRANSITIONS[deal.stage] || []
  const notes = deal.notes ? deal.notes.slice(0, 80) + (deal.notes.length > 80 ? '…' : '') : ''

  const formatValue = (v) => {
    if (!v && v !== 0) return '—'
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`
    return `$${v}`
  }

  const closeLabel = daysToClose < 0
    ? `${Math.abs(daysToClose)}d overdue`
    : daysToClose === 0
    ? 'Due today'
    : `${daysToClose}d left`

  return (
    <div className="glass-card p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 group">
      {/* Top row: health dot + title */}
      <div className="flex items-start gap-2 mb-2">
        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${healthDot}`} aria-label={health} />
        <h3 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2 flex-1">
          {deal.title}
        </h3>
      </div>

      {/* Customer */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
        <Building2 className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{deal.customer_name || '—'}</span>
      </div>

      {/* Value + Close date */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-base font-extrabold text-slate-900">{formatValue(deal.value)}</span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${closeBadge}`}>
          <Calendar className="w-3 h-3" />
          {closeLabel}
        </span>
      </div>

      {/* Notes */}
      {notes && (
        <p className="text-xs text-slate-400 mb-2.5 leading-relaxed">{notes}</p>
      )}

      {/* Progress bar (stage index / 4 segments) */}
      <div className="flex gap-0.5 mb-3" aria-label={`Stage: ${deal.stage}`}>
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < progressFill ? 'bg-indigo-500' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* Transition pills */}
      {transitions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {transitions.map((stage) => (
            <button
              key={stage}
              onClick={() => onTransition(deal.id, stage)}
              className="btn-sm-blue text-[10px] capitalize"
            >
              → {stage}
            </button>
          ))}
        </div>
      )}

      {/* Icon actions */}
      <div className="flex items-center gap-1 pt-2 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(deal)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
          aria-label="Edit deal"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDuplicate(deal.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
          aria-label="Duplicate deal"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(deal.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer ml-auto"
          aria-label="Delete deal"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
