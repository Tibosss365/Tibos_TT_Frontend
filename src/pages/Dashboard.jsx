import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Ticket, Clock, CheckCircle, AlertTriangle, Activity, TrendingUp,
  AlarmClock, ArrowRight, ChevronRight,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { useTicketStore } from '../stores/ticketStore'
import { useAdminStore } from '../stores/adminStore'
import { StatsCard } from '../components/ui/StatsCard'
import { Card, CardHeader } from '../components/ui/Card'
import { PriorityBadge, StatusBadge } from '../components/ui/Badge'
import { timeAgo, fmtSlaSeconds, PRIORITY_COLORS } from '../utils/ticketUtils'

const DEFAULT_CHART_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#64748b','#ec4899','#f97316','#84cc16']

// ── Overdue duration (live ticking) ──────────────────────────────────────────
function OverdueDuration({ slaDueTime }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 1000)
    return () => clearInterval(id)
  }, [])
  if (!slaDueTime) return <span className="text-rose-400 font-mono font-bold">—</span>
  const secs = Math.max(0, Math.floor((Date.now() - new Date(slaDueTime).getTime()) / 1000))
  return (
    <span className="text-rose-400 font-mono font-bold tabular-nums">
      +{fmtSlaSeconds(secs)}
    </span>
  )
}

export default function Dashboard() {
  const { tickets, loading } = useTicketStore()
  const { getAgentName, getCategoryName, categories } = useAdminStore()
  const navigate = useNavigate()

  // ── Core stats ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const open       = tickets.filter(t => t.status === 'open').length
    const inProgress = tickets.filter(t => t.status === 'in-progress').length
    const resolved   = tickets.filter(t => t.status === 'resolved').length
    const critical   = tickets.filter(t => t.priority === 'critical').length
    const slaOverdue = tickets.filter(t =>
      t.slaStatus === 'overdue' ||
      (t.slaStatus === 'active' && t.slaDueTime && new Date(t.slaDueTime) < new Date())
    ).length
    return { open, inProgress, resolved, critical, slaOverdue, total: tickets.length }
  }, [tickets])

  // ── Overdue tickets list (sorted by most overdue first) ───────────────────
  const overdueTickets = useMemo(() => {
    return tickets
      .filter(t =>
        t.slaStatus === 'overdue' ||
        (t.slaStatus === 'active' && t.slaDueTime && new Date(t.slaDueTime) < new Date())
      )
      .sort((a, b) => {
        const aMs = a.slaDueTime ? Date.now() - new Date(a.slaDueTime).getTime() : 0
        const bMs = b.slaDueTime ? Date.now() - new Date(b.slaDueTime).getTime() : 0
        return bMs - aMs  // most overdue first
      })
  }, [tickets])

  // ── Chart data ─────────────────────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const catColorMap = Object.fromEntries(
      categories.map((c, i) => [c.id, c.color || DEFAULT_CHART_COLORS[i % DEFAULT_CHART_COLORS.length]])
    )
    const counts = {}
    tickets.forEach(t => { counts[t.category] = (counts[t.category] || 0) + 1 })
    return Object.entries(counts)
      .map(([cat, count]) => ({ name: getCategoryName(cat), count, fill: catColorMap[cat] || '#6366f1' }))
      .sort((a, b) => b.count - a.count)
  }, [tickets, categories, getCategoryName])

  const statusData = useMemo(() => {
    const counts = {}
    tickets.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1 })
    return Object.entries(counts).map(([status, count]) => ({
      name: status.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
      count,
      fill: { open:'#3b82f6', 'in-progress':'#a855f7', 'on-hold':'#f59e0b', resolved:'#10b981', closed:'#64748b' }[status] || '#6366f1',
    }))
  }, [tickets])

  const recent = useMemo(() =>
    [...tickets].sort((a, b) => new Date(b.created) - new Date(a.created)).slice(0, 6),
    [tickets]
  )

  const activityFeed = useMemo(() => {
    const events = []
    tickets.forEach(ticket => {
      ;(ticket.timeline || []).forEach(ev => {
        events.push({ ...ev, ticketId: ticket.id, ticketSubject: ticket.subject })
      })
    })
    return events.sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 8)
  }, [tickets])

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="glass-card px-3 py-2 text-xs border border-glass shadow-glass">
        <div className="t-muted mb-1">{label || payload[0]?.name}</div>
        <div className="t-main font-bold">{payload[0]?.value} tickets</div>
      </div>
    )
  }

  // ── Priority colour helper ──────────────────────────────────────────────────
  const priorityDot = {
    critical: 'bg-rose-500',
    high:     'bg-orange-400',
    medium:   'bg-amber-400',
    low:      'bg-slate-400',
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold t-main">Dashboard</h1>
        <p className="text-sm t-muted mt-0.5">IT support overview &amp; activity</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard label="Open Tickets"  value={loading ? '…' : stats.open}        icon={Ticket}        color="indigo"  />
        <StatsCard label="In Progress"   value={loading ? '…' : stats.inProgress}  icon={Clock}         color="violet"  />
        <StatsCard label="Resolved"      value={loading ? '…' : stats.resolved}    icon={CheckCircle}   color="emerald" />
        <StatsCard label="Critical"      value={loading ? '…' : stats.critical}    icon={AlertTriangle} color="rose"    />
        <StatsCard label="SLA Overdue"   value={loading ? '…' : stats.slaOverdue}  icon={AlarmClock}    color={stats.slaOverdue > 0 ? 'rose' : 'emerald'} />
        <StatsCard label="Total Tickets" value={loading ? '…' : stats.total}       icon={Activity}      color="cyan"    />
      </div>

      {/* ── SLA Overdue Report ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <AlarmClock size={15} className={overdueTickets.length > 0 ? 'text-rose-500' : 'text-emerald-500'} />
              <span>SLA Overdue Report</span>
              {overdueTickets.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30 animate-pulse">
                  {overdueTickets.length} overdue
                </span>
              )}
            </div>
          }
          subtitle="Tickets that have exceeded their SLA deadline"
          action={
            overdueTickets.length > 0 && (
              <button
                onClick={() => navigate('/tickets')}
                className="text-xs text-rose-500 hover:text-rose-400 font-medium transition-colors flex items-center gap-1"
              >
                View all <ArrowRight size={12} />
              </button>
            )
          }
        />

        {loading ? (
          <div className="py-8 text-center text-sm t-sub">Loading…</div>
        ) : overdueTickets.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle size={20} className="text-emerald-500" />
            </div>
            <div className="text-sm font-semibold text-emerald-500">All tickets within SLA</div>
            <div className="text-xs t-muted">No breaches detected — great work!</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-glass">
                  {['Priority', 'Ticket', 'Subject', 'Assignee', 'Due At', 'Overdue By', ''].map(h => (
                    <th key={h} className="py-2.5 px-3 text-left text-[10px] font-bold t-sub uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overdueTickets.map((ticket, i) => (
                  <tr
                    key={ticket._uuid}
                    className={`border-b border-glass/50 hover:bg-rose-500/5 transition-colors cursor-pointer group ${
                      i === 0 ? 'bg-rose-500/5' : ''
                    }`}
                    onClick={() => navigate('/tickets', { state: { openTicketId: ticket.id } })}
                  >
                    {/* Priority */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <PriorityBadge priority={ticket.priority} />
                    </td>

                    {/* Ticket ID */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-bold t-sub">{ticket.id}</span>
                    </td>

                    {/* Subject */}
                    <td className="py-3 px-3 max-w-[240px]">
                      <div className="font-medium t-main truncate group-hover:text-rose-500 transition-colors">
                        {ticket.subject}
                      </div>
                      <div className="text-[10px] t-muted mt-0.5">{ticket.submitter}</div>
                    </td>

                    {/* Assignee */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {ticket.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-[8px] font-bold text-white">
                              {(ticket.assigneeObj?.name || ticket.assignee || '?').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <span className="t-main text-[11px]">{ticket.assigneeObj?.name || getAgentName(ticket.assignee)}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-amber-500 font-medium">Unassigned</span>
                      )}
                    </td>

                    {/* Due At */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {ticket.slaDueTime ? (
                        <span className="text-[11px] t-sub">
                          {new Date(ticket.slaDueTime).toLocaleString('en-US', {
                            month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      ) : '—'}
                    </td>

                    {/* Overdue By (live) */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
                        <OverdueDuration slaDueTime={ticket.slaDueTime} />
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        Open <ChevronRight size={10} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
        <div className="xl:col-span-3">
          <Card>
            <CardHeader
              title="Recent Tickets"
              subtitle="Latest submissions"
              action={
                <button onClick={() => navigate('/tickets')} className="text-xs text-indigo-500 hover:text-indigo-400 font-medium transition-colors">
                  View all →
                </button>
              }
            />
            <div className="space-y-2">
              {loading ? (
                <div className="py-6 text-center text-sm t-sub">Loading…</div>
              ) : recent.map(ticket => (
                <div
                  key={ticket._uuid}
                  onClick={() => navigate('/tickets', { state: { openTicketId: ticket.id } })}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-all group border border-transparent hover:border-indigo-500/20"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono t-sub font-bold">{ticket.id}</span>
                      <PriorityBadge priority={ticket.priority} />
                      {(ticket.slaStatus === 'overdue') && (
                        <span className="text-[9px] font-bold text-rose-500 bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.5 rounded-full">
                          SLA Overdue
                        </span>
                      )}
                    </div>
                    <div className="text-sm t-main font-bold truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {ticket.subject}
                    </div>
                    <div className="text-xs t-muted mt-0.5">{ticket.submitter} · {timeAgo(ticket.created)}</div>
                  </div>
                  <StatusBadge status={ticket.status} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="xl:col-span-2">
          <Card>
            <CardHeader title="Activity Feed" subtitle="Recent events" />
            <div className="space-y-3">
              {activityFeed.length === 0 ? (
                <div className="py-6 text-center text-sm t-sub">No activity yet</div>
              ) : activityFeed.map((ev, i) => {
                const typeStyle = {
                  created:   { dot: 'bg-blue-500',    label: 'Created' },
                  assign:    { dot: 'bg-violet-500',  label: 'Assigned' },
                  status:    { dot: 'bg-amber-500',   label: 'Updated' },
                  comment:   { dot: 'bg-indigo-500',  label: 'Comment' },
                  resolved:  { dot: 'bg-emerald-500', label: 'Resolved' },
                  email_out: { dot: 'bg-sky-500',     label: 'Email' },
                  email_in:  { dot: 'bg-teal-500',    label: 'Reply' },
                }[ev.type] || { dot: 'bg-gray-400', label: 'Event' }

                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${typeStyle.dot} shadow-sm`} />
                      {i < activityFeed.length - 1 && (
                        <div className="w-px flex-1 bg-gray-200 dark:bg-white/10 mt-1" />
                      )}
                    </div>
                    <div className="pb-3 flex-1 min-w-0">
                      <div className="text-[10px] font-bold t-sub uppercase tracking-wider mb-0.5">
                        {ev.ticketId}
                      </div>
                      <div
                        className="text-xs t-main leading-relaxed line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: ev.text }}
                      />
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
