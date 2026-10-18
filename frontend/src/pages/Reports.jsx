import { useEffect, useState, useMemo } from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getAnalytics, getDashboard } from '../api'
import { TrendingUp, DollarSign, Users, Target, PieChart as PieIcon, Calendar } from 'lucide-react'

export default function Reports() {
  const [analytics, setAnalytics] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [aRes, dRes] = await Promise.all([getAnalytics(), getDashboard()])
        setAnalytics(aRes.data)
        setDashboard(dRes.data)
      } catch (e) {
        console.error('Failed to load reports:', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">Loading reports...</div>
      </div>
    )
  }

  if (!analytics || !dashboard) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">No data available</div>
      </div>
    )
  }

  const salesPipeline = analytics.salesPipeline || []
  const sourceEffectiveness = analytics.sourceEffectiveness || []
  const conversionFunnel = analytics.conversionFunnel || []

  const stats = [
    {
      title: 'Total Revenue',
      value: `$${(dashboard.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-emerald-50 text-emerald-700',
      trend: '+12% from last month',
    },
    {
      title: 'Active Deals',
      value: dashboard.activeDeals || 0,
      icon: Target,
      color: 'bg-blue-50 text-blue-700',
      trend: `${dashboard.avgDealSize ? `$${(dashboard.avgDealSize / 1000).toFixed(1)}K avg` : 'N/A'}`,
    },
    {
      title: 'Conversion Rate',
      value: analytics.conversionRate ? `${(analytics.conversionRate * 100).toFixed(1)}%` : '0%',
      icon: TrendingUp,
      color: 'bg-indigo-50 text-indigo-700',
      trend: `${conversionFunnel.length} stages tracked`,
    },
    {
      title: 'Total Leads',
      value: dashboard.totalLeads || 0,
      icon: Users,
      color: 'bg-purple-50 text-purple-700',
      trend: `${dashboard.leadsBySource?.length || 0} sources`,
    },
  ]

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899']

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Sales Reports</h1>
        <p className="text-gray-600 mt-2">Comprehensive CRM analytics and performance metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">{stat.title}</h3>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
            <p className="text-xs text-gray-500 mt-2">{stat.trend}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Sales Pipeline Trend */}
        {salesPipeline.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Pipeline Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesPipeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Lead Source Effectiveness */}
        {sourceEffectiveness.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Source Effectiveness</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sourceEffectiveness}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="leads" fill="#6366f1" />
                <Bar dataKey="converted" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Conversion Funnel */}
        {conversionFunnel.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conversionFunnel} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="stage" type="category" width={80} />
                <Tooltip formatter={(value) => `${value} leads`} />
                <Bar dataKey="count" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Deal Distribution by Status */}
        {dashboard.dealsByStatus && dashboard.dealsByStatus.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Deals by Status</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={dashboard.dealsByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>
                  {dashboard.dealsByStatus.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Metrics Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="border-l-4 border-emerald-500 pl-4 py-2">
            <p className="text-sm text-gray-600">Average Deal Size</p>
            <p className="text-2xl font-bold text-gray-900">${(dashboard.avgDealSize || 0).toLocaleString()}</p>
          </div>
          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <p className="text-sm text-gray-600">Follow-up Completion Rate</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.completionRate ? `${(analytics.completionRate * 100).toFixed(0)}%` : 'N/A'}</p>
          </div>
          <div className="border-l-4 border-indigo-500 pl-4 py-2">
            <p className="text-sm text-gray-600">Sales Cycle Days</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.avgSalesCycleDays || 0}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
