export default function StatusBadge({ status, colorMap, className = '' }) {
  // Enhanced color mappings for modern executive look
  const defaultColors = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dot-emerald-500',
    inactive: 'bg-slate-100 text-slate-600 border-slate-200 dot-slate-400',
    new: 'bg-sky-50 text-sky-700 border-sky-200 dot-sky-500',
    contacted: 'bg-amber-50 text-amber-700 border-amber-200 dot-amber-500',
    qualified: 'bg-indigo-50 text-indigo-700 border-indigo-200 dot-indigo-500',
    unqualified: 'bg-rose-50 text-rose-700 border-rose-200 dot-rose-500',
    converted: 'bg-violet-50 text-violet-700 border-violet-200 dot-violet-500',
    prospect: 'bg-slate-100 text-slate-700 border-slate-200 dot-slate-400',
    proposal: 'bg-blue-50 text-blue-700 border-blue-200 dot-blue-500',
    negotiation: 'bg-amber-50 text-amber-700 border-amber-200 dot-amber-500',
    'closed-won': 'bg-emerald-50 text-emerald-700 border-emerald-200 dot-emerald-500',
    'closed-lost': 'bg-rose-50 text-rose-700 border-rose-200 dot-rose-500',
    pending: 'bg-amber-50 text-amber-700 border-amber-200 dot-amber-500',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dot-emerald-500',
    cancelled: 'bg-slate-100 text-slate-600 border-slate-200 dot-slate-400',
  }

  const customCls = colorMap?.[status]
  const config = defaultColors[status] || 'bg-slate-100 text-slate-700 border-slate-200 dot-slate-400'
  
  // Extract dot color from config or fallback
  let dotColor = 'bg-slate-400'
  if (config.includes('dot-emerald')) dotColor = 'bg-emerald-500'
  else if (config.includes('dot-blue') || config.includes('dot-sky')) dotColor = 'bg-sky-500'
  else if (config.includes('dot-amber')) dotColor = 'bg-amber-500'
  else if (config.includes('dot-indigo')) dotColor = 'bg-indigo-500'
  else if (config.includes('dot-violet')) dotColor = 'bg-violet-500'
  else if (config.includes('dot-rose')) dotColor = 'bg-rose-500'

  const formattedStatus = (status || '').replace('-', ' ')

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border shadow-2xs ${
        customCls || config
      } ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span className="capitalize">{formattedStatus}</span>
    </span>
  )
}
