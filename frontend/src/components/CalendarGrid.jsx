import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const TYPE_COLORS = {
  call:    'bg-indigo-500',
  email:   'bg-blue-500',
  meeting: 'bg-purple-500',
  demo:    'bg-emerald-500',
  other:   'bg-slate-400',
}

function pad2(n) { return String(n).padStart(2, '0') }

/**
 * CalendarGrid — monthly calendar with follow-up indicators.
 * Props:
 *   followups      {array}   array of followup objects (must have scheduled_date, type)
 *   selectedDate   {string}  YYYY-MM-DD
 *   onDateClick    {(dateStr) => void}
 *   month          {string}  YYYY-MM
 *   onMonthChange  {(newYYYYMM) => void}
 */
export default function CalendarGrid({ followups = [], selectedDate, onDateClick, month, onMonthChange }) {
  const [year, monthIndex] = useMemo(() => {
    const [y, m] = (month || '').split('-').map(Number)
    return [y, m - 1]   // monthIndex is 0-based
  }, [month])

  const { firstDayOfWeek, daysInMonth } = useMemo(() => ({
    firstDayOfWeek: new Date(year, monthIndex, 1).getDay(),
    daysInMonth:    new Date(year, monthIndex + 1, 0).getDate(),
  }), [year, monthIndex])

  // Build a map: YYYY-MM-DD → [followup, ...]
  const followupMap = useMemo(() => {
    const map = {}
    for (const fu of followups) {
      const d = fu.scheduled_date ? fu.scheduled_date.slice(0, 10) : null
      if (!d) continue
      if (!map[d]) map[d] = []
      map[d].push(fu)
    }
    return map
  }, [followups])

  const todayStr = useMemo(() => {
    const t = new Date()
    return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`
  }, [])

  const monthLabel = useMemo(() => {
    return new Date(year, monthIndex, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
  }, [year, monthIndex])

  function changeMonth(delta) {
    const d = new Date(year, monthIndex + delta, 1)
    onMonthChange(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`)
  }

  // Build grid cells: leading nulls + day numbers
  const cells = useMemo(() => {
    const arr = Array(firstDayOfWeek).fill(null)
    for (let d = 1; d <= daysInMonth; d++) arr.push(d)
    return arr
  }, [firstDayOfWeek, daysInMonth])

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <button
          onClick={() => changeMonth(-1)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-slate-900">{monthLabel}</span>
        <button
          onClick={() => changeMonth(1)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {DAY_LABELS.map((d) => (
          <div key={d} className="py-2 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="h-16 border-b border-r border-slate-50 last:border-r-0" />
          }

          const dateStr = `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`
          const dayFus  = followupMap[dateStr] || []
          const isToday    = dateStr === todayStr
          const isSelected = dateStr === selectedDate
          const dots       = dayFus.slice(0, 3)
          const extra      = dayFus.length - 3

          return (
            <button
              key={dateStr}
              onClick={() => onDateClick(dateStr)}
              className={`h-16 flex flex-col items-center pt-1.5 gap-1 border-b border-r border-slate-100 last:border-r-0 cursor-pointer transition-colors
                ${isSelected ? 'ring-2 ring-inset ring-indigo-500' : ''}
                ${isToday && !isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}
              `}
              aria-label={dateStr}
              aria-pressed={isSelected}
            >
              <span className={`text-xs font-semibold leading-none ${
                isSelected ? 'text-indigo-600' : isToday ? 'text-indigo-600' : 'text-slate-700'
              }`}>
                {day}
              </span>

              {/* Dot indicators */}
              {dots.length > 0 && (
                <div className="flex gap-0.5">
                  {dots.map((fu, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${TYPE_COLORS[fu.type] || TYPE_COLORS.other}`}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              )}

              {extra > 0 && (
                <span className="text-[9px] text-slate-400 font-medium leading-none">+{extra}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
