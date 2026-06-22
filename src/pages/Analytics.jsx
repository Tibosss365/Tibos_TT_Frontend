import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, PieChart, Pie, Legend,
} from 'recharts'
import { Star, Clock, RotateCcw } from 'lucide-react'
import { useAdminStore } from '../stores/adminStore'
import { api, normalizeTicket } from '../api/client'
import { Card, CardHeader } from '../components/ui/Card'
import { fmtSlaSeconds, getSlaRemainingSeconds } from '../utils/ticketUtils'

const STATUS_FILL = { open:'#3b82f6','in-progress':'#0ea5e9','on-hold':'#f59e0b',resolved:'#10b981',closed:'#64748b' }
const slaColors = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#64748b' }

const PRIORITY_BADGE = {
  critical: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
  high:     'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  medium:   'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  low:      'bg-slate-500/15 text-slate-400 border border-slate-500/30',
}

export default function Analytics() {
  const { slaSettings, getCategoryName, getAgentName } = useAdminStore()
  const [data, setData] = useState(null)
  const [overdueTickets, setOverdueTickets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/analytics'),
      api.get('/tickets?sla_status=overdue&limit=100').catch(() => []),
    ]).then(([analytics, overdue]) => {
      setData(analytics)
      const raw = Array.isArray(overdue) ? overdue : (overdue?.tickets || overdue?.items || [])
      setOverdueTickets(raw.map(normalizeTicket))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const categoryLabel = getCategoryName

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="glass-card px-3 py-2 text-xs shadow-glass border border-glass">
        <div className="t-muted mb-1">{label || payload[0]?.name}</div>
        {payload.map((p, i) => (
          <div key={i} className="t-main font-bold">{p.name ? `${p.name}: ` : ''}{p.value}</div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold t-main">Analytics</h1>
          <p className="text-sm t-muted mt-0.5">Loading metrics…</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold t-main">Analytics</h1>
          <p className="text-sm t-muted mt-0.5">Failed to load analytics data.</p>
        </div>
      </div>
    )
  }

  // Prepare chart data from API response
  const apiStatusData = Object.entries(data.status_distribution || {}).map(([s, count]) => ({
    name: s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
    count,
    fill: STATUS_FILL[s] || '#0ea5e9',
  }))

  const apiCategoryData = Object.entries(data.category_distribution || {})
    .map(([cat, count]) => ({ name: categoryLabel(cat), count }))
    .sort((a, b) => b.count - a.count)

  const apiVolumeData = (data.tickets_over_time || []).map(row => ({
    date: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: row.count,
  }))

  const apiPriorityData = ['critical', 'high', 'medium', 'low'].map(p => ({
    name: p.charAt(0).toUpperCase() + p.slice(1),
    total: data.priority_distribution?.[p] || 0,
    resolved: 0,
  }))

  const apiSlaData = ['critical', 'high', 'medium', 'low'].map(p => ({
    priority: p.charAt(0).toUpperCase() + p.slice(1),
    rate: data.sla_compliance?.[p] ?? 100,
  }))

  const apiResolutionRate = data.resolution_rate || 0
  const totalResolved = (data.status_distribution?.resolved || 0) + (data.status_distribution?.closed || 0)
  const totalTickets = Object.values(data.status_distribution || {}).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold t-main">Analytics</h1>
          <p className="text-sm t-muted mt-0.5">Performance metrics and insights</p>
        </div>
        <div className="text-xs t-sub flex-shrink-0">Avg resolution: <span className="font-bold t-main">{data.avg_resolution_hours}h</span></div>
      </div>

      {/* Top row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status bar chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Tickets by Status" subtitle="Current distribution" />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={apiStatusData} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fill: 'var(--c-text-30)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--c-text-30)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--c-chart-grid)' }} />
                <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                  {apiStatusData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Resolution rate */}
        <Card>
          <CardHeader title="Resolution Rate" />
          <div className="flex flex-col items-center justify-center py-4 lg:h-48">
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" className="text-black/5 dark:text-white/5" strokeWidth="10" />
                <circle cx="60" cy="60" r="52" fill="none"
                  stroke="url(#grad)" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 52 * apiResolutionRate / 100} ${2 * Math.PI * 52}`}
                  style={{ transition: 'stroke-dasharray 1s ease' }} />
                <defs>
                  <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gradient">{apiResolutionRate}%</span>
                <span className="text-[10px] t-sub font-bold uppercase tracking-wider">resolved</span>
              </div>
            </div>
            <p className="text-xs t-muted mt-3 text-center">
              {totalResolved} of {totalTickets} tickets resolved
            </p>
          </div>
        </Card>
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Volume trend */}
        <Card>
          <CardHeader title="Ticket Volume" subtitle="Tickets created over last 30 days" />
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={apiVolumeData} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-chart-grid)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--c-text-30)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--c-text-30)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2} dot={{ fill: '#0ea5e9', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Top categories horizontal bar */}
        <Card>
          <CardHeader title="Top Categories" />
          <div className="space-y-3 mt-2">
            {apiCategoryData.slice(0, 6).map((cat, i) => {
              const max = apiCategoryData[0]?.count || 1
              const pct = (cat.count / max) * 100
              const colors = ['#0ea5e9','#2563eb','#06b6d4','#10b981','#f59e0b','#ef4444']
              return (
                <div key={cat.name} className="flex items-center gap-3">
                  <div className="w-20 text-xs t-muted truncate flex-shrink-0">{cat.name}</div>
                  <div className="flex-1 h-2 rounded-full bg-black/5 dark:bg-white/8 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
                  </div>
                  <div className="w-5 text-xs t-sub text-right flex-shrink-0">{cat.count}</div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* SLA compliance */}
      <Card>
        <CardHeader title="SLA Compliance" subtitle="Response time targets met per priority" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {apiSlaData.map(item => {
            const color = slaColors[item.priority.toLowerCase()] || '#0ea5e9'
            return (
              <div key={item.priority} className="text-center p-4 rounded-xl bg-black/5 dark:bg-white/3 border border-glass">
                <div className="text-xs font-bold mb-3" style={{ color }}>{item.priority}</div>
                <div className="relative w-16 h-16 mx-auto mb-2">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" className="text-black/5 dark:text-white/5" strokeWidth="6" />
                    <circle cx="32" cy="32" r="26" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 26 * item.rate / 100} ${2 * Math.PI * 26}`} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold t-main">{item.rate}%</span>
                  </div>
                </div>
                <div className="text-[10px] t-sub opacity-50 mt-0.5">≤ {slaSettings[item.priority.toLowerCase()]}h target</div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Priority breakdown table */}
      <Card>
        <CardHeader title="Priority Breakdown" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass">
                {['Priority', 'Total', 'SLA Compliance'].map(h => (
                  <th key={h} className="py-3 px-4 text-left text-[10px] font-bold t-sub uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apiPriorityData.map(row => {
                const slaRow = apiSlaData.find(s => s.priority === row.name)
                const rate = slaRow?.rate ?? 100
                const colors = { Critical: 'text-rose-400', High: 'text-orange-400', Medium: 'text-amber-400', Low: 'text-slate-400' }
                return (
                  <tr key={row.name} className="border-b border-glass hover:bg-black/5 dark:hover:bg-white/3 transition-all">
                    <td className={`py-3 px-4 text-sm font-bold ${colors[row.name] || 't-main'}`}>{row.name}</td>
                    <td className="py-3 px-4 t-muted">{row.total}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-black/5 dark:bg-white/8 overflow-hidden max-w-20">
                          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-xs t-sub">{rate}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* CSAT + Response metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* CSAT Score Card */}
        <Card>
          <CardHeader title="CSAT Score" subtitle={`${data.csat_count || 0} ratings received`} />
          {data.csat_avg != null ? (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="text-5xl font-bold text-gradient mb-2">{data.csat_avg?.toFixed(1)}</div>
              <div className="flex items-center gap-0.5 mb-2">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} size={20} className={n <= Math.round(data.csat_avg) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'} />
                ))}
              </div>
              <div className="text-xs t-muted">out of 5.0</div>
              {/* Star distribution */}
              <div className="w-full mt-4 space-y-1.5">
                {[5,4,3,2,1].map(n => {
                  const cnt = data.csat_distribution?.[String(n)] || 0
                  const pct = data.csat_count ? (cnt / data.csat_count) * 100 : 0
                  return (
                    <div key={n} className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5 w-14 flex-shrink-0">
                        <Star size={10} className="text-amber-400 fill-amber-400" />
                        <span className="text-[10px] t-muted">{n}</span>
                      </div>
                      <div className="flex-1 h-1.5 rounded-full bg-black/5 dark:bg-white/8 overflow-hidden">
                        <div className="h-full rounded-full bg-amber-400/70 transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] t-sub w-5 text-right">{cnt}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-10 text-sm t-muted">No CSAT data yet</div>
          )}
        </Card>

        {/* First Response Time */}
        <Card>
          <CardHeader title="Avg First Response" subtitle="Time to first staff reply" />
          <div className="flex flex-col items-center justify-center py-8">
            <Clock size={36} className="text-indigo-400 mb-3" />
            {data.avg_first_response_hours != null ? (
              <>
                <div className="text-4xl font-bold text-gradient mb-1">
                  {data.avg_first_response_hours < 1
                    ? `${Math.round(data.avg_first_response_hours * 60)}m`
                    : `${data.avg_first_response_hours.toFixed(1)}h`}
                </div>
                <div className="text-xs t-muted">average first response time</div>
              </>
            ) : (
              <div className="text-sm t-muted">No data yet</div>
            )}
          </div>
        </Card>

        {/* Reopen Rate */}
        <Card>
          <CardHeader title="Reopen Rate" subtitle="Tickets reopened after resolution" />
          <div className="flex flex-col items-center justify-center py-8">
            <RotateCcw size={36} className={`mb-3 ${(data.reopen_rate || 0) > 10 ? 'text-rose-400' : 'text-emerald-400'}`} />
            <div className={`text-4xl font-bold mb-1 ${(data.reopen_rate || 0) > 10 ? 'text-rose-400' : 'text-emerald-500'}`}>
              {data.reopen_rate || 0}%
            </div>
            <div className="text-xs t-muted">
              {(data.reopen_rate || 0) > 10 ? 'Above average — review resolution quality' : 'Within healthy range'}
            </div>
          </div>
        </Card>
      </div>

      {/* Source distribution */}
      {Object.keys(data.source_distribution || {}).length > 0 && (
        <Card>
          <CardHeader title="Ticket Sources" subtitle="How tickets are being submitted" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-2">
            {(() => {
              const sourceIcons = { portal:'🌐', email:'📧', phone:'📞', api:'⚙️', walk_in:'🚶', chat:'💬' }
              const sourceColors = { portal:'#0ea5e9', email:'#3b82f6', phone:'#10b981', api:'#f59e0b', walk_in:'#2563eb', chat:'#06b6d4' }
              const total = Object.values(data.source_distribution).reduce((a,b) => a+b, 0)
              return Object.entries(data.source_distribution)
                .sort((a,b) => b[1] - a[1])
                .map(([src, cnt]) => {
                  const pct = total ? Math.round(cnt / total * 100) : 0
                  return (
                    <div key={src} className="text-center p-3 rounded-xl border border-glass bg-black/3 dark:bg-white/3">
                      <div className="text-2xl mb-1">{sourceIcons[src] || '📋'}</div>
                      <div className="text-lg font-bold t-main">{cnt}</div>
                      <div className="text-[10px] t-muted capitalize">{src.replace('_',' ')}</div>
                      <div className="text-[10px] font-bold mt-0.5" style={{ color: sourceColors[src] || '#0ea5e9' }}>{pct}%</div>
                    </div>
                  )
                })
            })()}
          </div>
        </Card>
      )}
    </div>
  )
}
