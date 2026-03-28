import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ticket, Clock, CheckCircle, AlertTriangle, Activity, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { useTicketStore } from '../stores/ticketStore'
import { useAdminStore } from '../stores/adminStore'
import { StatsCard } from '../components/ui/StatsCard'
import { Card, CardHeader } from '../components/ui/Card'
import { PriorityBadge, StatusBadge } from '../components/ui/Badge'
import { timeAgo, PRIORITY_COLORS, STATUS_COLORS } from '../utils/ticketUtils'

const DEFAULT_CHART_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#64748b','#ec4899','#f97316','#84cc16']

export default function Dashboard() {
  const { tickets, loading } = useTicketStore()
  const { getAgentName, getCategoryName, categories } = useAdminStore()
  const navigate = useNavigate()

  const stats = useMemo(() => {
    const open       = tickets.filter(t => t.status === 'open').length
    const inProgress = tickets.filter(t => t.status === 'in-progress').length
    const resolved   = tickets.filter(t => t.status === 'resolved').length
    const critical   = tickets.filter(t => t.priority === 'critical').length
    return { open, inProgress, resolved, critical, total: tickets.length }
  }, [tickets])

  const categoryData = useMemo(() => {
    const catColorMap = Object.fromEntries(categories.map((c, i) => [c.id, c.color || DEFAULT_CHART_COLORS[i % DEFAULT_CHART_COLORS.length]]))
    const counts = {}
    tickets.forEach(t => { counts[t.category] = (counts[t.category] || 0) + 1 })
    return Object.entries(counts).map(([cat, count]) => ({
      name: getCategoryName(cat), count, fill: catColorMap[cat] || '#6366f1'
    })).sort((a, b) => b.count - a.count)
  }, [tickets, categories, getCategoryName])

  const statusData = useMemo(() => {
    const counts = {}
    tickets.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1 })
    return Object.entries(counts).map(([status, count]) => ({
      name: status.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
      count,
      fill: { open:'#3b82f6','in-progress':'#a855f7','on-hold':'#f59e0b',resolved:'#10b981',closed:'#64748b' }[status] || '#6366f1'
    }))
  }, [tickets])

  const recent = useMemo(() => [...tickets].sort((a, b) => new Date(b.created) - new Date(a.created)).slice(0, 6), [tickets])

  const activityFeed = useMemo(() => {
    const events = []
    tickets.forEach(ticket => {
      (ticket.timeline || []).forEach(ev => {
        events.push({ ...ev, ticketId: ticket.id, ticketSubject: ticket.subject })
      })
    })
    return events.sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 8)
  }, [tickets])

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card px-3 py-2 text-xs border border-glass shadow-glass">
          <div className="t-muted mb-1">{label || payload[0]?.name}</div>
          <div className="t-main font-bold">{payload[0]?.value} tickets</div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold t-main">Dashboard</h1>
        <p className="text-sm t-muted mt-0.5">IT support overview & activity</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard label="Open Tickets"   value={loading ? '…' : stats.open}       icon={Ticket}        color="indigo" />
        <StatsCard label="In Progress"    value={loading ? '…' : stats.inProgress} icon={Clock}         color="violet" />
        <StatsCard label="Resolved"       value={loading ? '…' : stats.resolved}   icon={CheckCircle}   color="emerald" />
        <StatsCard label="Critical"       value={loading ? '…' : stats.critical}   icon={AlertTriangle} color="rose" />
        <StatsCard label="Total Tickets"  value={loading ? '…' : stats.total}      icon={Activity}      color="cyan" />
        <StatsCard label="Total Tickets"  value={loading ? '…' : stats.total}      icon={TrendingUp}    color="amber" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Category chart */}
        <Card>
          <CardHeader title="Tickets by Category" subtitle="Distribution across categories" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: 'var(--c-chart-text)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--c-chart-text)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--c-chart-grid)' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {categoryData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Status donut */}
        <Card>
          <CardHeader title="Status Distribution" subtitle="Current ticket statuses" />
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="count">
                {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: 'var(--c-chart-text)' }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent tickets + activity */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Recent tickets */}
        <div className="xl:col-span-3">
          <Card>
            <CardHeader title="Recent Tickets" subtitle="Latest submissions"
              action={<button onClick={() => navigate('/tickets')} className="text-xs text-indigo-500 hover:text-indigo-400 font-medium transition-colors">View all →</button>} />
            <div className="space-y-2">
              {loading ? (
                <div className="py-6 text-center text-sm t-sub">Loading…</div>
              ) : recent.map(ticket => (
                <div key={ticket._uuid}
                  onClick={() => navigate('/tickets')}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-all group border border-transparent hover:border-indigo-500/20">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono t-sub font-bold">{ticket.id}</span>
                      <PriorityBadge priority={ticket.priority} />
                    </div>
                    <div className="text-sm t-main font-bold truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{ticket.subject}</div>
                    <div className="text-xs t-muted mt-0.5">{ticket.submitter} · {timeAgo(ticket.created)}</div>
                  </div>
                  <StatusBadge status={ticket.status} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Activity feed */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader title="Activity Feed" subtitle="Recent events" />
            <div className="space-y-3">
              {activityFeed.map((ev, i) => {
                const typeStyle = {
                  created:  { dot: 'bg-blue-500',    label: 'Created' },
                  assign:   { dot: 'bg-violet-500',  label: 'Assigned' },
                  status:   { dot: 'bg-amber-500',   label: 'Updated' },
                  comment:  { dot: 'bg-indigo-500',  label: 'Comment' },
                  resolved: { dot: 'bg-emerald-500', label: 'Resolved' },
                }[ev.type] || { dot: 'bg-gray-400', label: 'Event' }

                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${typeStyle.dot} shadow-sm`} />
                      {i < activityFeed.length - 1 && <div className="w-px flex-1 bg-gray-200 dark:bg-white/10 mt-1" />}
                    </div>
                    <div className="pb-3 flex-1 min-w-0">
                      <div className="text-[10px] font-bold t-sub uppercase tracking-wider mb-0.5">
                        {ev.ticketId}
                      </div>
                      <div className="text-xs t-main leading-relaxed line-clamp-2" dangerouslySetInnerHTML={{ __html: ev.text }} />
                      <div className="text-[10px] t-sub mt-0.5 font-medium">{timeAgo(ev.ts)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
