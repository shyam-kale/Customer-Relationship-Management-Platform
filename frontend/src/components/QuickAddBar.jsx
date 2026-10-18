import { useState } from 'react'
import { Plus, Users, Target, Briefcase, CalendarClock } from 'lucide-react'

const ACTIONS = [
  { icon: Users,        label: 'Add Customer',       color: 'text-emerald-600 hover:bg-emerald-50', key: 'customer'  },
  { icon: Target,       label: 'Add Lead',            color: 'text-amber-600 hover:bg-amber-50',    key: 'lead'      },
  { icon: Briefcase,    label: 'Add Deal',            color: 'text-indigo-600 hover:bg-indigo-50',  key: 'deal'      },
  { icon: CalendarClock,label: 'Schedule Follow-Up',  color: 'text-purple-600 hover:bg-purple-50',  key: 'followup'  },
]

/**
 * QuickAddBar — fixed bottom-right FAB that expands into 4 action buttons.
 * Props:
 *   onAddCustomer  {function}
 *   onAddLead      {function}
 *   onAddDeal      {function}
 *   onAddFollowup  {function}
 */
export default function QuickAddBar({ onAddCustomer, onAddLead, onAddDeal, onAddFollowup }) {
  const [expanded, setExpanded] = useState(false)

  const handlers = {
    customer: onAddCustomer,
    lead:     onAddLead,
    deal:     onAddDeal,
    followup: onAddFollowup,
  }

  function handleAction(key) {
    setExpanded(false)
    handlers[key]?.()
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-3">
      {/* Action buttons (shown when expanded) */}
      {ACTIONS.map(({ icon: Icon, label, color, key }) => (
        <div
          key={key}
          className={`flex items-center gap-2 transition-all duration-200 ${
            expanded ? 'opacity-100 translate-y-0 pointer-events-auto animate-scaleIn' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          {/* Tooltip label */}
          <span className="bg-slate-800 text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap">
            {label}
          </span>

          {/* Action button */}
          <button
            onClick={() => handleAction(key)}
            className={`w-11 h-11 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center transition-all duration-150 cursor-pointer ${color}`}
            aria-label={label}
          >
            <Icon className="w-5 h-5" />
          </button>
        </div>
      ))}

      {/* Main FAB */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className={`w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-2xl flex items-center justify-center transition-transform duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
          expanded ? 'rotate-45' : 'rotate-0'
        }`}
        aria-label={expanded ? 'Close quick add menu' : 'Open quick add menu'}
        aria-expanded={expanded}
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  )
}
