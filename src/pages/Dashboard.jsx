import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Ticket, Clock, CheckCircle, AlertTriangle, Activity,
  AlarmClock, ArrowRight, ChevronRight, Filter, X, PauseCircle, Users, EyeOff,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { useTicketStore } from '../stores/ticketStore'
import { useAdminStore } from '../stores/adminStore'
import { StatsCard } from '../components/ui/StatsCard'
import { Card, CardHeader } from '../components/ui/Card'
import { PriorityBadge, StatusBadge } from '../components/ui/Badge'
import { timeAgo, fmtSlaSeconds } from '../utils/ticketUtils'

const DEFAULT_CHART_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#64748b','#ec4899','#f97316','#84cc16']

const DATE_RANGES = [
  { key: 'all',   label: 'All Time'   },
  { key: 'today', label: 'Today'      },
  { key: 'week',  label: 'This Week'  },
  { key: 'month', label: 'This Month' },
  { key: 'custom',label: 'Custom'     },
]

const STATUS_OPTIONS = [
  { key: '',           label: 'All'         },
  { key: 'open',       label: 'Open'        },
  { key: 'in-progress',label: 'In Progress' },
  { key: 'on-hold',    label: 'On Hold'     },
  { key: 'resolved',   label: 'Resolved'    },
  { key: 'closed',     label: 'Closed'      },
]

const STATUS_ACTIVE_CLS = {
  '':            'bg-indigo-500/15 text-indigo-500 border-indigo-500/40',
  'open':        'bg-blue-500/15 text-blue-500 border-blue-500/40',
  'in-progress': 'bg-violet-500/15 text-violet-500 border-violet-500/40',
  'on-hold':     'bg-amber-500/15 text-amber-500 border-amber-500/40',
  'resolved':    'bg-emerald-500/15 text-emerald-500 border-emerald-500/40',
  'closed':      'bg-slate-500/15 text-slate-400 border-slate-500/40',
}

const EMPTY_FILTERS = {
  dateRange: 'all', dateFrom: '', dateTo: '',
  status: '', priority: '', category: '', group: '', type: '', sla: '',
}

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

// ── SLA Ignore Modal ─────────────────────────────────────────────────────────
function SlaIgnoreModal({ ticket, onClose, onConfirm }) {
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (!reason.trim()) { setError('Please provide a justification before submitting.'); return }
    setSubmitted(true)
    setTimeout(() => { onConfirm(ticket.id, reason.trim()); onClose() }, 800)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="glass-card w-full max-w-md rounded-2xl shadow-2xl border border-glass animate-fade-in"
        style={{ padding: '28px 28px 24px' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <EyeOff size={16} className="text-amber-500" />
            </div>
            <div>
              <div className="font-bold t-main text-sm">Ignore SLA Overdue</div>
              <div className="text-[11px] t-muted mt-0.5">Ticket <span className="font-mono font-bold">{ticket.id}</span></div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center t-muted hover:t-main hover:bg-black/10 dark:hover:bg-white/10 transition-all"
          >
            <X size={14} />
          </button>
        </div>

        {/* Subject preview */}
        <div className="mb-4 px-3 py-2.5 rounded-lg bg-rose-500/8 border border-rose-500/20">
          <div className="text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Subject</div>
          <div className="text-xs t-main font-medium leading-snug line-clamp-2">{ticket.subject}</div>
        </div>

        {/* Justification textarea */}
        <div className="mb-1">
          <label className="block text-[11px] font-bold t-sub uppercase tracking-wider mb-1.5">
            Justification / Reason <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={4}
            value={reason}
            onChange={e => { setReason(e.target.value); if (e.target.value.trim()) setError('') }}
            placeholder="e.g. Customer agreed to extended deadline due to pending hardware delivery…"
            className="w-full px-3 py-2.5 text-xs rounded-xl border border-glass bg-white/60 dark:bg-white/5 t-main resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60 transition-all placeholder:t-sub"
            disabled={submitted}
          />
          {error && <div className="text-[11px] text-rose-500 mt-1.5 flex items-center gap-1"><span className="inline-block w-1 h-1 rounded-full bg-rose-500" />{error}</div>}
        </div>

        {/* Info note */}
        <div className="mt-3 mb-4 flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/20">
          <EyeOff size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <span className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">
            This ticket will be removed from the SLA Overdue dashboard report. The ignore reason will be recorded.
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitted}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-glass t-muted hover:t-main hover:border-indigo-500/30 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitted || !reason.trim()}
            className={`flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl transition-all ${
              submitted
                ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 cursor-default'
                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {submitted ? (
              <><CheckCircle size={12} /> Ignored!</>
            ) : (
              <><EyeOff size={12} /> Submit & Ignore</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { tickets, loading } = useTicketStore()
  const { getAgentName, getCategoryName, categories, groups, agents } = useAdminStore()
  const navigate = useNavigate()

  // ── SLA ignore state (persisted in localStorage) ──────────────────────────
  const [ignoredSlaIds, setIgnoredSlaIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sla-ignored-ids') || '{}') } catch { return {} }
  })
  const [ignoreModal, setIgnoreModal] = useState(null) // ticket object or null

  const handleIgnoreConfirm = (ticketId, justification) => {
    const updated = { ...ignoredSlaIds, [ticketId]: { justification, ignoredAt: new Date().toISOString() } }
    setIgnoredSlaIds(updated)
    localStorage.setItem('sla-ignored-ids', JSON.stringify(updated))
  }

  // ── Filter state (staged → applied on click) ────────────────────────────────
  const [dashFilters, setDashFilters] = useState(EMPTY_FILTERS)  // applied
  const [staged, setStaged]           = useState(EMPTY_FILTERS)  // in-progress

  const setSF     = (key, val) => setStaged(f => ({ ...f, [key]: val }))
  const applyFilters = () => setDashFilters({ ...staged })
  const clearFilters = () => { setDashFilters(EMPTY_FILTERS); setStaged(EMPTY_FILTERS) }

  const hasPending = JSON.stringify(staged) !== JSON.stringify(dashFilters)

  const activeFilterCount = [
    dashFilters.dateRange !== 'all',
    dashFilters.status,
    dashFilters.priority,
    dashFilters.category,
    dashFilters.group,
    dashFilters.type,
    dashFilters.sla,
  ].filter(Boolean).length

  // ── Filtered tickets (without status — used for status chip counts) ─────────
  const filteredTickets = useMemo(() => {
    let result = [...tickets]
    const now = new Date()

    if (dashFilters.dateRange === 'today') {
      const start = new Date(now); start.setHours(0, 0, 0, 0)
      result = result.filter(t => new Date(t.created) >= start)
    } else if (dashFilters.dateRange === 'week') {
      const start = new Date(now)
      start.setDate(now.getDate() - now.getDay())
      start.setHours(0, 0, 0, 0)
      result = result.filter(t => new Date(t.created) >= start)
    } else if (dashFilters.dateRange === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      result = result.filter(t => new Date(t.created) >= start)
    } else if (dashFilters.dateRange === 'custom') {
      if (dashFilters.dateFrom)
        result = result.filter(t => new Date(t.created) >= new Date(dashFilters.dateFrom))
      if (dashFilters.dateTo) {
        const end = new Date(dashFilters.dateTo); end.setHours(23, 59, 59, 999)
        result = result.filter(t => new Date(t.created) <= end)
      }
    }

    if (dashFilters.priority) result = result.filter(t => t.priority === dashFilters.priority)
    if (dashFilters.category) result = result.filter(t => t.category === dashFilters.category)
    if (dashFilters.group)    result = result.filter(t => t.group === dashFilters.group)
    if (dashFilters.type)     result = result.filter(t => t.type === dashFilters.type)
    if (dashFilters.sla === 'open')        result = result.filter(t => t.status === 'open')
    else if (dashFilters.sla === 'in-progress') result = result.filter(t => t.status === 'in-progress')
    else if (dashFilters.sla === 'on-hold')     result = result.filter(t => t.status === 'on-hold')
    else if (dashFilters.sla === 'resolved')    result = result.filter(t => t.status === 'resolved')
    else if (dashFilters.sla === 'critical')    result = result.filter(t => t.priority === 'critical')
    else if (dashFilters.sla === 'overdue')     result = result.filter(t =>
      (t.slaStatus === 'overdue' || (t.slaStatus === 'active' && t.slaDueTime && new Date(t.slaDueTime) < new Date())) &&
      !ignoredSlaIds[t.id]
    )

    return result
  }, [tickets, dashFilters, ignoredSlaIds])

  // ── Status chip counts ──────────────────────────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts = { '': filteredTickets.length }
    filteredTickets.forEach(t => {
      counts[t.status] = (counts[t.status] || 0) + 1
    })
    return counts
  }, [filteredTickets])

  // ── Display tickets (filteredTickets + status filter) ──────────────────────
  const displayTickets = useMemo(() => {
    if (!dashFilters.status) return filteredTickets
    return filteredTickets.filter(t => t.status === dashFilters.status)
  }, [filteredTickets, dashFilters.status])

  // ── Core stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const open       = displayTickets.filter(t => t.status === 'open').length
    const inProgress = displayTickets.filter(t => t.status === 'in-progress').length
    const onHold     = displayTickets.filter(t => t.status === 'on-hold').length
    const resolved   = displayTickets.filter(t => t.status === 'resolved').length
    const critical   = displayTickets.filter(t => t.priority === 'critical').length
    const slaOverdue = displayTickets.filter(t =>
      (t.slaStatus === 'overdue' ||
      (t.slaStatus === 'active' && t.slaDueTime && new Date(t.slaDueTime) < new Date())) &&
      !ignoredSlaIds[t.id]
    ).length
    return { open, inProgress, onHold, resolved, critical, slaOverdue, total: displayTickets.length }
  }, [displayTickets, ignoredSlaIds])

  // ── Overdue tickets (sorted by most overdue first) ─────────────────────────
  const overdueTickets = useMemo(() => {
    return displayTickets
      .filter(t =>
        (t.slaStatus === 'overdue' ||
        (t.slaStatus === 'active' && t.slaDueTime && new Date(t.slaDueTime) < new Date())) &&
        !ignoredSlaIds[t.id]
      )
      .sort((a, b) => {
        const aMs = a.slaDueTime ? Date.now() - new Date(a.slaDueTime).getTime() : 0
        const bMs = b.slaDueTime ? Date.now() - new Date(b.slaDueTime).getTime() : 0
        return bMs - aMs
      })
  }, [displayTickets, ignoredSlaIds])

  // ── Chart data ──────────────────────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const catColorMap = Object.fromEntries(
      categories.map((c, i) => [c.id, c.color || DEFAULT_CHART_COLORS[i % DEFAULT_CHART_COLORS.length]])
    )
    const counts = {}
    displayTickets.forEach(t => { counts[t.category] = (counts[t.category] || 0) + 1 })
    return Object.entries(counts)
      .map(([cat, count]) => ({ name: getCategoryName(cat), count, fill: catColorMap[cat] || '#6366f1' }))
      .sort((a, b) => b.count - a.count)
  }, [displayTickets, categories, getCategoryName])

  const statusData = useMemo(() => {
    const counts = {}
    displayTickets.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1 })
    return Object.entries(counts).map(([status, count]) => ({
      name: status.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
      count,
      fill: { open:'#3b82f6', 'in-progress':'#a855f7', 'on-hold':'#f59e0b', resolved:'#10b981', closed:'#64748b' }[status] || '#6366f1',
    }))
  }, [displayTickets])

  const recent = useMemo(() =>
    [...displayTickets].sort((a, b) => new Date(b.created) - new Date(a.created)).slice(0, 6),
    [displayTickets]
  )

  const activityFeed = useMemo(() => {
    const events = []
    displayTickets.forEach(ticket => {
      ;(ticket.timeline || []).forEach(ev => {
        events.push({ ...ev, ticketId: ticket.id, ticketSubject: ticket.subject })
      })
    })
    return events.sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 8)
  }, [displayTickets])

  // ── Agent wise ticket counts ────────────────────────────────────────────────
  const agentData = useMemo(() => {
    return agents
      .filter(a => a.id !== 'unassigned')
      .map(agent => {
        const agentTickets = displayTickets.filter(t => t.assignee === String(agent.id))
        return {
          id:         agent.id,
          name:       agent.name,
          initials:   agent.initials || agent.name.slice(0, 2).toUpperCase(),
          total:      agentTickets.length,
          open:       agentTickets.filter(t => t.status === 'open').length,
          inProgress: agentTickets.filter(t => t.status === 'in-progress').length,
          onHold:     agentTickets.filter(t => t.status === 'on-hold').length,
          resolved:   agentTickets.filter(t => t.status === 'resolved').length,
        }
      })
      .sort((a, b) => b.total - a.total)
  }, [displayTickets, agents])

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="glass-card px-3 py-2 text-xs border border-glass shadow-glass">
        <div className="t-muted mb-1">{label || payload[0]?.name}</div>
        <div className="t-main font-bold">{payload[0]?.value} tickets</div>
      </div>
    )
  }

  const selectCls = "h-8 px-2.5 text-xs rounded-lg border border-glass bg-white/60 dark:bg-slate-800 t-main focus:outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer min-w-[120px]"

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold t-main">Dashboard</h1>
          <p className="text-sm t-muted mt-0.5">IT support overview &amp; activity</p>
        </div>
        {activeFilterCount > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-indigo-500 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full font-semibold">
            <Filter size={11} />
            {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
          </span>
        )}
      </div>

      {/* ── Filter Panel ───────────────────────────────────────────────────── */}
      <Card>
        <div className="p-4 space-y-3">

          {/* Row 1: Date range + dropdown filters */}
          <div className="flex flex-wrap items-center gap-2">

            {/* Date range tabs */}
            <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 rounded-lg p-1 border border-glass">
              {DATE_RANGES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSF('dateRange', key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                    staged.dateRange === key
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 't-muted hover:t-main'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Custom date inputs */}
            {staged.dateRange === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={staged.dateFrom}
                  onChange={e => setSF('dateFrom', e.target.value)}
                  className={selectCls}
                />
                <span className="text-xs t-muted">to</span>
                <input
                  type="date"
                  value={staged.dateTo}
                  onChange={e => setSF('dateTo', e.target.value)}
                  className={selectCls}
                />
              </div>
            )}

            {/* Right-side dropdowns */}
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <select
                value={staged.priority}
                onChange={e => setSF('priority', e.target.value)}
                className={selectCls}
              >
                <option value="">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={staged.category}
                onChange={e => setSF('category', e.target.value)}
                className={selectCls}
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={staged.group}
                onChange={e => setSF('group', e.target.value)}
                className={selectCls}
              >
                <option value="">All Groups</option>
                {(groups || []).map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>

              <select
                value={staged.type}
                onChange={e => setSF('type', e.target.value)}
                className={selectCls}
              >
                <option value="">All Types</option>
                <option value="request">Request</option>
                <option value="incident">Incident</option>
              </select>

              <select
                value={staged.sla}
                onChange={e => setSF('sla', e.target.value)}
                className={selectCls}
              >
                <option value="">Ticket Status</option>
                <option value="open">Open Tickets</option>
                <option value="in-progress">In Progress</option>
                <option value="on-hold">On Hold</option>
                <option value="resolved">Resolved</option>
                <option value="critical">Critical</option>
                <option value="overdue">SLA Overdue</option>
              </select>

              {/* Clear button — always visible */}
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold t-muted hover:t-main border border-glass hover:border-rose-500/40 hover:text-rose-500 rounded-lg transition-all whitespace-nowrap"
              >
                <X size={12} /> Clear{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </button>

              {/* Apply button — always visible, highlights when pending */}
              <button
                onClick={applyFilters}
                className={`flex items-center gap-1.5 h-8 px-4 text-xs font-semibold rounded-lg transition-all whitespace-nowrap
                  ${hasPending
                    ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                    : 'bg-indigo-500/80 hover:bg-indigo-500 text-white'}`}
              >
                <Filter size={12} /> Apply
              </button>
            </div>
          </div>

          {/* Row 2: Status quick-filter chips */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-glass">
            <span className="text-[10px] font-bold t-sub uppercase tracking-wider mr-1">Status</span>
            {STATUS_OPTIONS.map(({ key, label }) => {
              const count = statusCounts[key] ?? 0
              const isActive = dashFilters.status === key && staged.status === key
              return (
                <button
                  key={key}
                  onClick={() => { const val = dashFilters.status === key && key !== '' ? '' : key; setSF('status', val); setDashFilters(f => ({ ...f, status: val })) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    isActive
                      ? STATUS_ACTIVE_CLS[key]
                      : 'border-glass t-muted hover:t-main hover:border-indigo-500/30'
                  }`}
                >
                  {label}
                  <span className={`min-w-[18px] text-center text-[10px] font-bold px-1 py-0.5 rounded-full ${
                    isActive ? 'bg-current/20' : 'bg-black/10 dark:bg-white/10 t-sub'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}

            {(activeFilterCount > 0) && (
              <span className="text-xs t-muted ml-auto">
                Showing <strong className="t-main">{displayTickets.length}</strong> of{' '}
                <strong className="t-main">{tickets.length}</strong> tickets
              </span>
            )}
          </div>

        </div>
      </Card>

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
        <StatsCard label="Open Tickets"  value={loading ? '…' : stats.open}        icon={Ticket}        color="indigo"  />
        <StatsCard label="In Progress"   value={loading ? '…' : stats.inProgress}  icon={Clock}         color="violet"  />
        <StatsCard label="On Hold"       value={loading ? '…' : stats.onHold}      icon={PauseCircle}   color="amber"   />
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
                  {['Priority', 'Ticket', 'Subject', 'Assignee', 'Due At', 'Overdue By', '', ''].map((h, i) => (
                    <th key={i} className="py-2.5 px-3 text-left text-[10px] font-bold t-sub uppercase tracking-wider whitespace-nowrap">
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
                    <td className="py-3 px-3 whitespace-nowrap">
                      <PriorityBadge priority={ticket.priority} />
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-bold t-sub">{ticket.id}</span>
                    </td>
                    <td className="py-3 px-3 max-w-[240px]">
                      <div className="font-medium t-main truncate group-hover:text-rose-500 transition-colors">
                        {ticket.subject}
                      </div>
                      <div className="text-[10px] t-muted mt-0.5">{ticket.submitter}</div>
                    </td>
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
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
                        <OverdueDuration slaDueTime={ticket.slaDueTime} />
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        Open <ChevronRight size={10} />
                      </span>
                    </td>
                    <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => { e.stopPropagation(); setIgnoreModal(ticket) }}
                        title="Ignore this overdue ticket"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-500/50 transition-all opacity-0 group-hover:opacity-100 whitespace-nowrap"
                      >
                        <EyeOff size={10} /> Ignore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── SLA Ignore Modal ────────────────────────────────────────────────── */}
      {ignoreModal && (
        <SlaIgnoreModal
          ticket={ignoreModal}
          onClose={() => setIgnoreModal(null)}
          onConfirm={handleIgnoreConfirm}
        />
      )}

      {/* ── Charts row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Tickets by Category" subtitle="Distribution across categories" />
          {categoryData.length === 0 ? (
            <div className="py-10 text-center text-sm t-muted">No data for selected filters</div>
          ) : (
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
          )}
        </Card>

        <Card>
          <CardHeader title="Status Distribution" subtitle="Current ticket statuses" />
          {statusData.length === 0 ? (
            <div className="py-10 text-center text-sm t-muted">No data for selected filters</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="count">
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: 'var(--c-chart-text)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* ── Agent Wise Ticket Count ────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <Users size={15} className="text-indigo-500" />
              <span>Agent Wise Ticket Count</span>
            </div>
          }
          subtitle="Ticket distribution per agent"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-glass">
                {['Agent', 'Created', 'Open', 'In Progress', 'On Hold', 'Resolved'].map(h => (
                  <th
                    key={h}
                    className={`py-2.5 px-4 text-[10px] font-bold t-sub uppercase tracking-wider whitespace-nowrap ${
                      h === 'Agent' ? 'text-left' : 'text-center'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-sm t-sub">Loading…</td></tr>
              ) : agentData.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-sm t-muted">No agents found</td></tr>
              ) : agentData.map(agent => (
                <tr key={agent.id} className="border-b border-glass/50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-white">{agent.initials}</span>
                      </div>
                      <span className="font-medium t-main">{agent.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
                      {agent.total}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                      {agent.open}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold">
                      {agent.inProgress}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                      {agent.onHold}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                      {agent.resolved}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Recent tickets + activity ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
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
              ) : recent.length === 0 ? (
                <div className="py-6 text-center text-sm t-muted">No tickets match the current filters</div>
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
                      {ticket.slaStatus === 'overdue' && (
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

        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Activity Feed" subtitle="Recent events" />
            <div className="space-y-3">
              {activityFeed.length === 0 ? (
                <div className="py-6 text-center text-sm t-sub">No activity yet</div>
              ) : activityFeed.map((ev, i) => {
                const typeStyle = {
                  created:   { dot: 'bg-blue-500',    label: 'Created'  },
                  assign:    { dot: 'bg-violet-500',  label: 'Assigned' },
                  status:    { dot: 'bg-amber-500',   label: 'Updated'  },
                  comment:   { dot: 'bg-indigo-500',  label: 'Comment'  },
                  resolved:  { dot: 'bg-emerald-500', label: 'Resolved' },
                  email_out: { dot: 'bg-sky-500',     label: 'Email'    },
                  email_in:  { dot: 'bg-teal-500',    label: 'Reply'    },
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
