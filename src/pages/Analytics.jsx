import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, RadialBarChart, RadialBar, Legend
} from 'recharts'
import { useTicketStore } from '../stores/ticketStore'
import { useAdminStore } from '../stores/adminStore'
import { Card, CardHeader } from '../components/ui/Card'
import { categoryLabel } from '../utils/ticketUtils'

const STATUS_FILL = { open:'#3b82f6','in-progress':'#a855f7','on-hold':'#f59e0b',resolved:'#10b981',closed:'#64748b' }

export default function Analytics() {
  const { tickets } = useTicketStore()
  const { slaSettings, agents } = useAdminStore()

  const statusData = useMemo(() => {
    const counts = {}
    tickets.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1 })
    return Object.entries(counts).map(([s, count]) => ({
      name: s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
      count, fill: STATUS_FILL[s] || '#6366f1'
    }))
  }, [tickets])

  const categoryData = useMemo(() => {
    const counts = {}
    tickets.forEach(t => { counts[t.category] = (counts[t.category] || 0) + 1 })
    return Object.entries(counts)
      .map(([cat, count]) => ({ name: categoryLabel(cat), count }))
      .sort((a, b) => b.count - a.count)
  }, [tickets])

  const resolutionRate = useMemo(() => {
    const resolved = tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length
    return tickets.length ? Math.round((resolved / tickets.length) * 100) : 0
  }, [tickets])

  const priorityData = useMemo(() =>
    ['critical', 'high', 'medium', 'low'].map(p => ({
      name: p.charAt(0).toUpperCase() + p.slice(1),
      total: tickets.filter(t => t.priority === p).length,
      resolved: tickets.filter(t => t.priority === p && ['resolved', 'closed'].includes(t.status)).length,
    })),
    [tickets]
  )

  const slaData = useMemo(() => {
    return ['critical', 'high', 'medium', 'low'].map(p => {
      const pTickets = tickets.filter(t => t.priority === p && t.status === 'resolved')
      const slaMins = (slaSettings[p] || 4) * 60
      const compliant = pTickets.filter(t => {
        const diffMins = (new Date(t.updated) - new Date(t.created)) / 60000
        return diffMins <= slaMins
      }).length
      const rate = pTickets.length ? Math.round((compliant / pTickets.length) * 100) : 100
      return { priority: p.charAt(0).toUpperCase() + p.slice(1), rate, compliant, total: pTickets.length }
    })
  }, [tickets, slaSettings])

  const volumeData = useMemo(() => {
    const buckets = {}
    tickets.forEach(t => {
      const d = new Date(t.created)
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      buckets[key] = (buckets[key] || 0) + 1
    })
    return Object.entries(buckets).slice(-10).map(([date, count]) => ({ date, count }))
  }, [tickets])

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

  const slaColors = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#64748b' }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold t-main">Analytics</h1>
        <p className="text-sm t-muted mt-0.5">Performance metrics and insights</p>
      </div>

      {/* Top row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Status bar chart */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader title="Tickets by Status" subtitle="Current distribution" />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusData} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fill: 'var(--c-text-30)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--c-text-30)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--c-chart-grid)' }} />
                <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                  {statusData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Resolution rate */}
        <Card>
          <CardHeader title="Resolution Rate" />
          <div className="flex flex-col items-center justify-center h-48">
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" className="text-black/5 dark:text-white/5" strokeWidth="10" />
                <circle cx="60" cy="60" r="52" fill="none"
                  stroke="url(#grad)" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 52 * resolutionRate / 100} ${2 * Math.PI * 52}`}
                  style={{ transition: 'stroke-dasharray 1s ease' }} />
                <defs>
                  <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gradient">{resolutionRate}%</span>
                <span className="text-[10px] t-sub font-bold uppercase tracking-wider">resolved</span>
              </div>
            </div>
            <p className="text-xs t-muted mt-3 text-center">
              {tickets.filter(t => ['resolved','closed'].includes(t.status)).length} of {tickets.length} tickets resolved
            </p>
          </div>
        </Card>
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Volume trend */}
        <Card>
          <CardHeader title="Ticket Volume" subtitle="Tickets created over time" />
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={volumeData} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-chart-grid)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--c-text-30)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--c-text-30)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Top categories horizontal bar */}
        <Card>
          <CardHeader title="Top Categories" />
          <div className="space-y-3 mt-2">
            {categoryData.slice(0, 6).map((cat, i) => {
              const max = categoryData[0]?.count || 1
              const pct = (cat.count / max) * 100
              const colors = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444']
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
          {slaData.map(item => {
            const color = slaColors[item.priority.toLowerCase()] || '#6366f1'
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
                <div className="text-[10px] t-sub">{item.compliant}/{item.total} tickets</div>
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
                {['Priority', 'Total', 'Resolved', 'Open', 'Resolution Rate'].map(h => (
                  <th key={h} className="py-3 px-4 text-left text-[10px] font-bold t-sub uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {priorityData.map(row => {
                const open = row.total - row.resolved
                const rate = row.total ? Math.round((row.resolved / row.total) * 100) : 0
                const colors = { Critical: 'text-rose-400', High: 'text-orange-400', Medium: 'text-amber-400', Low: 'text-slate-400' }
                return (
                  <tr key={row.name} className="border-b border-glass hover:bg-black/5 dark:hover:bg-white/3 transition-all">
                    <td className={`py-3 px-4 text-sm font-bold ${colors[row.name] || 't-main'}`}>{row.name}</td>
                    <td className="py-3 px-4 t-muted">{row.total}</td>
                    <td className="py-3 px-4 text-emerald-500">{row.resolved}</td>
                    <td className="py-3 px-4 text-blue-500">{open}</td>
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
    </div>
  )
}
