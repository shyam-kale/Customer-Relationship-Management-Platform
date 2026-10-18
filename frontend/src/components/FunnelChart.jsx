import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LabelList, Cell,
} from 'recharts'

const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff']

/**
 * FunnelChart — horizontal funnel visualization using Recharts.
 * Props:
 *   data  {Array<{ label: string, count: number, value: number }>}
 */
export default function FunnelChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-slate-400">
        No funnel data available
      </div>
    )
  }

  const total = data[0]?.count || 1

  // Conversion % per stage (relative to first stage)
  const dataWithPct = data.map((item, i) => ({
    ...item,
    pct: i === 0 ? '100%' : `${((item.count / total) * 100).toFixed(0)}%`,
  }))

  return (
    <div className="w-full">
      {/* Conversion % row above chart */}
      <div
        className="flex mb-1"
        style={{ paddingLeft: 80 }}   /* approximate YAxis width */
      >
        {dataWithPct.map((item) => (
          <div
            key={item.label}
            className="flex-1 text-center text-[10px] font-bold text-indigo-600"
          >
            {item.pct}
          </div>
        ))}
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={dataWithPct}
            margin={{ top: 4, right: 24, left: 0, bottom: 4 }}
          >
            <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={80}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value, name, props) => [
                `${value} deals`,
                props.payload?.label,
              ]}
              contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }}
              cursor={{ fill: '#f1f5f9' }}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
              {dataWithPct.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
              <LabelList dataKey="count" position="right" style={{ fontSize: 11, fontWeight: 600, fill: '#475569' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
