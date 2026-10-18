import { useMemo } from 'react'

/**
 * ScoreBadge — colored pill showing a 0-100 lead/deal score.
 * Props:
 *   score  {number}  0-100 integer
 */
export default function ScoreBadge({ score = 0 }) {
  const config = useMemo(() => {
    if (score <= 30) return { bg: 'bg-rose-50',   text: 'text-rose-600',   label: 'Low'  }
    if (score <= 60) return { bg: 'bg-amber-50',  text: 'text-amber-600',  label: 'Fair' }
    if (score <= 80) return { bg: 'bg-indigo-50', text: 'text-indigo-600', label: 'Good' }
    return             { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Hot'  }
  }, [score])

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide ${config.bg} ${config.text}`}
      aria-label={`Score ${score} — ${config.label}`}
    >
      <span>{score}</span>
      <span className="font-semibold opacity-80">{config.label}</span>
    </span>
  )
}
