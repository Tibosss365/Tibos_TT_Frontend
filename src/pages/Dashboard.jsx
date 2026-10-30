import { lazy, Suspense, useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Ticket, Clock, CheckCircle, AlertTriangle, Activity,
  AlarmClock, ArrowRight, ChevronRight, ChevronDown, Filter, X, PauseCircle, Users, EyeOff,
  FileSpreadsheet, FileText, Inbox, RotateCcw,
} from 'lucide-react'
import { useTicketStore } from '../stores/ticketStore'
import { useAdminStore } from '../stores/adminStore'
import { StatsCard } from '../components/ui/StatsCard'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PriorityBadge, StatusBadge } from '../components/ui/Badge'
import { timeAgo, fmtSlaSeconds } from '../utils/ticketUtils'
import { exportTicketsExcel, exportTicketsPdf } from '../utils/reportExport'

const DashboardCharts = lazy(() => import('../components/dashboard/DashboardCharts'))

const DEFAULT_CHART_COLORS = ['#0ea5e9','#2563eb','#06b6d4','#10b981','#f59e0b','#ef4444','#64748b','#ec4899','#f97316','#84cc16']

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
  const [dashboardDay, setDashboardDay] = useState(() => new Date())
  const [selectedAgentIds, setSelectedAgentIds] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard-visible-agent-ids')
      if (saved === null) return null
      const parsed = JSON.parse(saved)
      return Array.isArray(parsed) ? parsed.map(String) : null
    } catch { return null }
  })
  const [agentPickerOpen, setAgentPickerOpen] = useState(false)

  // Roll daily metrics over automatically at local midnight.
  useEffect(() => {
    let timer
    const scheduleNextDay = () => {
      const now = new Date()
      const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1)
      timer = setTimeout(() => {
        setDashboardDay(new Date())
        scheduleNextDay()
      }, Math.max(1000, nextDay.getTime() - now.getTime()))
    }
    scheduleNextDay()
    return () => clearTimeout(timer)
  }, [])

  // ── Report exports — respect the active dashboard filters ───────────────────
  const [exporting, setExporting] = useState(null) // 'excel' | 'pdf' | null
  // Human-readable description of the currently applied filters (for the report
  // header). Built at click time so it reflects exactly what's on screen.
  const buildFilterLabel = () => {
    const parts = []
    if (dashFilters.dateRange && dashFilters.dateRange !== 'all') {
      const dr = DATE_RANGES.find(r => r.key === dashFilters.dateRange)
      if (dashFilters.dateRange === 'custom') {
        parts.push(`${dashFilters.dateFrom || '…'} → ${dashFilters.dateTo || '…'}`)
      } else {
        parts.push(dr ? dr.label : dashFilters.dateRange)
      }
    }
    if (dashFilters.status)   parts.push(`Status: ${dashFilters.status}`)
    if (dashFilters.priority) parts.push(`Priority: ${dashFilters.priority}`)
    if (dashFilters.type)     parts.push(`Type: ${dashFilters.type}`)
    if (dashFilters.sla)      parts.push(dashFilters.sla === 'overdue' ? 'SLA Overdue' : `Priority: ${dashFilters.sla}`)
    if (dashFilters.category) parts.push(`Category: ${getCategoryName(dashFilters.category)}`)
    if (dashFilters.group)    parts.push(`Group: ${groups.find(g => g.id === dashFilters.group)?.name || dashFilters.group}`)
    return parts.length ? parts.join(' · ') : 'All Time (no filter)'
  }
  // Only active agents should appear in the report's agent-wise breakdown.
  const activeAgentIds = useMemo(
    () => new Set(agents.filter(a => a.is_active !== false).map(a => String(a.id))),
    [agents],
  )
  const handleExportExcel = async () => {
    setExporting('excel')
    try { await exportTicketsExcel(displayTickets, getAgentName, { filterLabel: buildFilterLabel(), activeAgentIds, getCategoryName }) }
    catch (e) { console.error('Excel export failed', e) }
    finally { setExporting(null) }
  }
  const handleExportPdf = async () => {
    setExporting('pdf')
    try { await exportTicketsPdf(displayTickets, getAgentName, { filterLabel: buildFilterLabel(), activeAgentIds, getCategoryName }) }
    catch (e) { console.error('PDF export failed', e) }
    finally { setExporting(null) }
  }
  const handleAgentDailyExcel = async () => {
    setExporting('agent-daily-excel')
    try {
      const { BASE } = await import('../api/client')
      const raw = localStorage.getItem('helpdesk-user')
      const token = raw ? (JSON.parse(raw)?.state?.token ?? null) : null
      const response = await fetch(`${BASE}/tickets/export/this-month.xlsx`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!response.ok) throw new Error(`Monthly ticket export failed (HTTP ${response.status})`)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `tickets-${new Date().toISOString().slice(0, 7)}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Monthly ticket Excel export failed', e)
    } finally {
      setExporting(null)
    }
  }

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
    const now = new Date()
    let from = null
    let to = null
    if (dashFilters.dateRange === 'today') {
      from = new Date(now); from.setHours(0, 0, 0, 0)
    } else if (dashFilters.dateRange === 'week') {
      from = new Date(now)
      from.setDate(now.getDate() - now.getDay())
      from.setHours(0, 0, 0, 0)
    } else if (dashFilters.dateRange === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (dashFilters.dateRange === 'custom') {
      if (dashFilters.dateFrom) from = new Date(dashFilters.dateFrom)
      if (dashFilters.dateTo) {
        to = new Date(dashFilters.dateTo); to.setHours(23, 59, 59, 999)
      }
    }
    const fromTime = from?.getTime()
    const toTime = to?.getTime()
    return tickets.filter(ticket => {
      if (from || to) {
        const created = new Date(ticket.created).getTime()
        if (!Number.isFinite(created) || (Number.isFinite(fromTime) && created < fromTime) || (Number.isFinite(toTime) && created > toTime)) return false
      }
      if (dashFilters.priority && ticket.priority !== dashFilters.priority) return false
      if (dashFilters.category && ticket.category !== dashFilters.category) return false
      if (dashFilters.group && ticket.group !== dashFilters.group) return false
      if (dashFilters.type && ticket.type !== dashFilters.type) return false
      if (dashFilters.sla === 'open' && ticket.status !== 'open') return false
      if (dashFilters.sla === 'in-progress' && ticket.status !== 'in-progress') return false
      if (dashFilters.sla === 'on-hold' && ticket.status !== 'on-hold') return false
      if (dashFilters.sla === 'resolved' && ticket.status !== 'resolved') return false
      if (dashFilters.sla === 'critical' && ticket.priority !== 'critical') return false
      if (dashFilters.sla === 'overdue') {
        const overdue = ticket.slaStatus === 'overdue' || (ticket.slaStatus === 'active' && ticket.slaDueTime && new Date(ticket.slaDueTime).getTime() < Date.now())
        if (!overdue || ignoredSlaIds[ticket.id]) return false
      }
      return true
    })
  }, [tickets, dashFilters, ignoredSlaIds])

  // ── Status chip counts ──────────────────────────────────────────────────────
  const displayTickets = useMemo(() => {
    if (!dashFilters.status) return filteredTickets
    return filteredTickets.filter(t => t.status === dashFilters.status)
  }, [filteredTickets, dashFilters.status])

  // ── Core stats ──────────────────────────────────────────────────────────────
  const dashboardData = useMemo(() => {
    const now = Date.now()
    const stats = { open: 0, inProgress: 0, onHold: 0, resolved: 0, reopened: 0, critical: 0, slaOverdue: 0, unassigned: 0, total: displayTickets.length }
    const statusCounts = { '': filteredTickets.length }
    const chartStatusCounts = {}
    const categoryCounts = new Map()
    const companyCounts = new Map()
    const agentCounts = new Map(agents.filter(agent => agent.id !== 'unassigned' && agent.is_active !== false && (agent.role === 'technician' || agent.role === 'admin')).map(agent => [String(agent.id), { id: agent.id, name: agent.name, initials: agent.initials || agent.name.slice(0, 2).toUpperCase(), total: 0, open: 0, inProgress: 0, onHold: 0, resolved: 0 }]))
    const overdueTickets = []
    const recent = []
    const activityEvents = []
    const keepNewest = (list, item, limit, dateValue) => {
      const time = new Date(dateValue).getTime()
      if (!Number.isFinite(time)) return
      if (list.length < limit) { list.push({ item, time }); return }
      let oldestIndex = 0
      for (let index = 1; index < list.length; index++) if (list[index].time < list[oldestIndex].time) oldestIndex = index
      if (time > list[oldestIndex].time) list[oldestIndex] = { item, time }
    }
    for (const ticket of filteredTickets) statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1
    for (const ticket of displayTickets) {
      chartStatusCounts[ticket.status] = (chartStatusCounts[ticket.status] || 0) + 1
      if (ticket.status === 'open') stats.open++
      if (ticket.status === 'in-progress') stats.inProgress++
      if (ticket.status === 'on-hold') stats.onHold++
      if (ticket.status === 'resolved') stats.resolved++
      if ((ticket.reopenCount || 0) > 0) stats.reopened++
      if (ticket.priority === 'critical') stats.critical++
      const overdue = ticket.slaStatus === 'overdue' || (ticket.slaStatus === 'active' && ticket.slaDueTime && new Date(ticket.slaDueTime).getTime() < now)
      if (overdue && !ignoredSlaIds[ticket.id]) { stats.slaOverdue++; overdueTickets.push(ticket) }
      if (!ticket.assignee && ticket.status !== 'resolved' && ticket.status !== 'closed') stats.unassigned++
      categoryCounts.set(ticket.category, (categoryCounts.get(ticket.category) || 0) + 1)
      const company = (ticket.company || '').trim() || 'Unknown'
      const email = (ticket.email || '').trim().toLowerCase()
      const domain = email.includes('@') ? email.split('@')[1] : ''
      if (!companyCounts.has(company)) companyCounts.set(company, { count: 0, domains: new Map() })
      const companyRow = companyCounts.get(company)
      companyRow.count++
      if (domain) companyRow.domains.set(domain, (companyRow.domains.get(domain) || 0) + 1)
      const agent = agentCounts.get(String(ticket.assignee || ''))
      if (agent) {
        agent.total++
        if (ticket.status === 'open') agent.open++
        if (ticket.status === 'in-progress') agent.inProgress++
        if (ticket.status === 'on-hold') agent.onHold++
        if (ticket.status === 'resolved') agent.resolved++
      }
      keepNewest(recent, ticket, 6, ticket.created)
      for (const event of ticket.timeline || []) keepNewest(activityEvents, { ...event, ticketId: ticket.id, ticketSubject: ticket.subject }, 8, event.ts)
    }
    overdueTickets.sort((a, b) => (b.slaDueTime ? now - new Date(b.slaDueTime).getTime() : 0) - (a.slaDueTime ? now - new Date(a.slaDueTime).getTime() : 0))
    recent.sort((a, b) => b.time - a.time)
    activityEvents.sort((a, b) => b.time - a.time)
    const categoryColors = new Map(categories.map((category, index) => [category.id, category.color || DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length]]))
    const categoryData = [...categoryCounts].map(([category, count]) => ({ name: getCategoryName(category), count, fill: categoryColors.get(category) || '#0ea5e9' })).sort((a, b) => b.count - a.count)
    const statusData = Object.entries(chartStatusCounts).map(([status, count]) => ({ name: status.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' '), count, fill: { open: '#3b82f6', 'in-progress': '#0ea5e9', 'on-hold': '#f59e0b', resolved: '#10b981', closed: '#64748b' }[status] || '#0ea5e9' }))
    const companyData = [...companyCounts].map(([company, row]) => {
      const topDomain = [...row.domains].sort((a, b) => b[1] - a[1])[0]?.[0]
      return { name: topDomain ? `${company} (@${topDomain})` : company, count: row.count }
    }).sort((a, b) => b.count - a.count).slice(0, 10).map((row, index) => ({ ...row, fill: DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length] }))
    return { stats, statusCounts, overdueTickets: overdueTickets.slice(0, 25), categoryData, statusData, companyData, recent: recent.map(row => row.item), activityFeed: activityEvents.map(row => row.item), agentData: [...agentCounts.values()].sort((a, b) => b.total - a.total) }
  }, [filteredTickets, displayTickets, ignoredSlaIds, agents, categories, getCategoryName])
  const { stats, statusCounts, overdueTickets, categoryData, statusData, companyData, recent, activityFeed, agentData } = dashboardData
  const openTicketsFromCard = card => navigate('/tickets', {
    state: { dashboardCardFilter: card, dashboardFilters: { ...dashFilters } },
  })

  // Agent workload and resolution summary, calculated from live ticket data.
  const dailyAgents = useMemo(() => agents
    .filter(a => a.id !== 'unassigned' && a.is_active !== false && (a.role === 'technician' || a.role === 'admin'))
    .sort((a, b) => a.name.localeCompare(b.name)), [agents])
  const visibleAgents = useMemo(() => selectedAgentIds === null
    ? dailyAgents
    : dailyAgents.filter(agent => selectedAgentIds.includes(String(agent.id))), [dailyAgents, selectedAgentIds])
  const toggleVisibleAgent = agentId => {
    const current = selectedAgentIds === null ? dailyAgents.map(agent => String(agent.id)) : selectedAgentIds
    const next = current.includes(String(agentId)) ? current.filter(id => id !== String(agentId)) : [...current, String(agentId)]
    setSelectedAgentIds(next)
    try { localStorage.setItem('dashboard-visible-agent-ids', JSON.stringify(next)) } catch { /* preference is still applied for this session */ }
  }
  const showAllAgents = () => {
    setSelectedAgentIds(null)
    try { localStorage.removeItem('dashboard-visible-agent-ids') } catch { /* preference is still reset for this session */ }
  }
  const agentWorkSummary = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today.getTime() + 86400000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const completed = ticket => ticket.status === 'resolved' || ticket.status === 'closed'
    const validDate = value => value instanceof Date && !Number.isNaN(value.getTime())
    const resolvedAt = ticket => {
      if (ticket.resolvedAt) {
        const explicitDate = new Date(ticket.resolvedAt)
        if (validDate(explicitDate)) return explicitDate
      }
      const timeline = ticket.timeline || []
      for (let index = timeline.length - 1; index >= 0; index--) {
        const event = timeline[index]
        const text = (event.text || '').replace(/<[^>]*>/g, '')
        const completionEvent = event.type === 'resolved' || event.type === 'closed' ||
          (event.type === 'status' && /\b(?:resolved|closed)\b/i.test(text))
        if (completionEvent && event.ts) return new Date(event.ts)
      }
      return completed(ticket) && ticket.updated ? new Date(ticket.updated) : null
    }
    const statsByAgent = new Map(dailyAgents.map(agent => [String(agent.id), {
      ...agent, today: 0, underOneHour: 0, oneToTwoHours: 0, twoToTwentyFourHours: 0,
      resolvedToday: 0, resolvedUnderOneHour: 0, resolvedOneToTwoHours: 0,
      resolvedTwoToTwentyFourHours: 0,
      month: 0, allTimeResolved: 0,
    }]))
    const agentNameById = new Map(dailyAgents.map(agent => [String(agent.id), agent.name]))
    const categoryMap = new Map()
    tickets.forEach(ticket => {
      const agentId = ticket.assignee ? String(ticket.assignee) : ''
      const agentStats = statsByAgent.get(agentId)
      const created = ticket.created ? new Date(ticket.created) : null
      if (agentStats && validDate(created)) {
        if (created >= today && created < tomorrow) agentStats.today++
        if (created >= monthStart && created < tomorrow) agentStats.month++
        if (!completed(ticket)) {
          const ageHours = (now - created) / 3600000
          if (ageHours >= 0 && ageHours < 1) agentStats.underOneHour++
          else if (ageHours >= 1 && ageHours < 2) agentStats.oneToTwoHours++
          else if (ageHours >= 2 && ageHours < 24) agentStats.twoToTwentyFourHours++
        }
      }
      if (!completed(ticket)) return
      if (agentStats) agentStats.allTimeResolved++
      const date = resolvedAt(ticket)
      if (agentStats && validDate(date) && date >= today && date < tomorrow) {
        agentStats.resolvedToday++
        if (validDate(created)) {
          const resolutionHours = (date.getTime() - created.getTime()) / 3600000
          if (resolutionHours >= 0 && resolutionHours < 1) agentStats.resolvedUnderOneHour++
          else if (resolutionHours >= 1 && resolutionHours < 2) agentStats.resolvedOneToTwoHours++
          else if (resolutionHours >= 2 && resolutionHours < 24) agentStats.resolvedTwoToTwentyFourHours++
        }
      }
      const category = ticket.category || 'uncategorized'
      if (!categoryMap.has(category)) categoryMap.set(category, { key: category, category, counts: {} })
      const row = categoryMap.get(category)
      const agentName = agentNameById.get(agentId) || 'Unassigned'
      row.counts[agentName] = (row.counts[agentName] || 0) + 1
    })
    return { agentStats: [...statsByAgent.values()], categoryRows: [...categoryMap.values()].sort((a, b) => a.category.localeCompare(b.category)) }
  }, [tickets, dailyAgents, dashboardDay])
  const visibleAgentStats = useMemo(() => {
    const ids = new Set(visibleAgents.map(agent => String(agent.id)))
    return agentWorkSummary.agentStats.filter(agent => ids.has(String(agent.id)))
  }, [agentWorkSummary.agentStats, visibleAgents])
  // ── Overdue tickets (sorted by most overdue first) ─────────────────────────
  const selectCls = "h-8 px-2.5 text-xs rounded-lg border border-glass bg-white/60 dark:bg-slate-800 t-main focus:outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer min-w-[120px]"

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold t-main">Dashboard</h1>
          <p className="text-sm t-muted mt-0.5">IT support overview &amp; activity</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {activeFilterCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-indigo-500 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full font-semibold">
              <Filter size={11} />
              {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={handleExportExcel} disabled={exporting === 'excel'}>
            <FileSpreadsheet size={14} className="text-emerald-500" /> <span className="hidden sm:inline">{exporting === 'excel' ? 'Exporting…' : 'Excel'}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportPdf} disabled={exporting === 'pdf'}>
            <FileText size={14} className="text-rose-500" /> <span className="hidden sm:inline">{exporting === 'pdf' ? 'Exporting…' : 'PDF'}</span>
          </Button>
        </div>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-9 gap-3 sm:gap-4">
        <StatsCard label="Open Tickets"  value={loading ? '…' : stats.open}        icon={Ticket}        color="indigo"  onClick={() => openTicketsFromCard('open')} disabled={loading} />
        <StatsCard label="Unassigned"    value={loading ? '…' : stats.unassigned}  icon={Inbox}         color="orange"  onClick={() => openTicketsFromCard('unassigned')} disabled={loading} />
        <StatsCard label="In Progress"   value={loading ? '…' : stats.inProgress}  icon={Clock}         color="violet"  onClick={() => openTicketsFromCard('in-progress')} disabled={loading} />
        <StatsCard label="On Hold"       value={loading ? '…' : stats.onHold}      icon={PauseCircle}   color="amber"   onClick={() => openTicketsFromCard('on-hold')} disabled={loading} />
        <StatsCard label="Resolved"      value={loading ? '…' : stats.resolved}    icon={CheckCircle}   color="emerald" onClick={() => openTicketsFromCard('resolved')} disabled={loading} />
        <StatsCard label="Reopened"      value={loading ? '…' : stats.reopened}    icon={RotateCcw}     color="amber"   onClick={() => openTicketsFromCard('reopened')} disabled={loading} />
        <StatsCard label="Critical"      value={loading ? '…' : stats.critical}    icon={AlertTriangle} color="rose"    onClick={() => openTicketsFromCard('critical')} disabled={loading} />
        <StatsCard label="SLA Overdue"   value={loading ? '…' : stats.slaOverdue}  icon={AlarmClock}    color={stats.slaOverdue > 0 ? 'rose' : 'emerald'} onClick={() => openTicketsFromCard('sla-overdue')} disabled={loading} />
        <StatsCard label="Total Tickets" value={loading ? '…' : stats.total}       icon={Activity}      color="cyan"    onClick={() => openTicketsFromCard('total')} disabled={loading} />
      </div>

      <Card>
        <CardHeader
          title={<div className="flex items-center gap-2"><Activity size={15} className="text-indigo-500" />Agent Performance</div>}
          subtitle={loading ? 'Showing loaded tickets while the remaining live data refreshes…' : 'Live ticket totals by agent · aging buckets count currently unresolved assigned tickets'}
          action={<div className="relative">
            <Button variant="outline" size="sm" onClick={() => setAgentPickerOpen(open => !open)}>
              <Users size={13} /> Display agents ({visibleAgents.length}/{dailyAgents.length}) <ChevronDown size={13} />
            </Button>
            {agentPickerOpen && <div className="absolute right-0 z-30 mt-2 max-h-72 w-64 overflow-y-auto rounded-xl border border-glass bg-white p-2 shadow-xl dark:bg-slate-900">
              <div className="sticky top-0 flex items-center justify-between border-b border-glass bg-white px-2 py-2 dark:bg-slate-900">
                <span className="text-[11px] font-bold t-main">Choose agents</span>
                <button type="button" onClick={showAllAgents} className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-400">Show all</button>
              </div>
              {dailyAgents.map(agent => <label key={agent.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs t-main hover:bg-indigo-500/5">
                <input type="checkbox" checked={visibleAgents.some(item => String(item.id) === String(agent.id))} onChange={() => toggleVisibleAgent(agent.id)} className="accent-indigo-500" />
                <span className="truncate">{agent.name}</span>
              </label>)}
              {dailyAgents.length === 0 && <div className="px-2 py-4 text-center text-xs t-sub">No active agents available.</div>}
            </div>}
          </div>}
        />
        {loading && tickets.length === 0 ? <div className="py-8 text-center text-sm t-sub">Loading live ticket data…</div> : <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 gap-2 mb-3">
            {visibleAgentStats.map(agent => <div key={agent.id} className="relative overflow-hidden rounded-lg border border-glass bg-gradient-to-br from-indigo-500/[0.09] to-cyan-500/[0.04] p-3">
              <div className="absolute right-0 top-0 h-14 w-14 rounded-full bg-indigo-500/[0.06] blur-2xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0"><div className="text-[9px] font-bold uppercase tracking-wider t-sub">Resolved score</div><div className="mt-0.5 text-sm font-bold t-main truncate">{agent.name}</div></div>
                <div className="shrink-0 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-right"><div className="text-lg leading-5 font-extrabold text-emerald-500 tabular-nums">{agent.allTimeResolved}</div><div className="text-[8px] font-bold uppercase tracking-wide text-emerald-500/80">completed</div></div>
              </div>
            </div>)}
            {visibleAgentStats.length === 0 && <div className="col-span-full py-5 text-center text-xs t-sub">No agents selected.</div>}
          </div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-xs font-bold t-main">Daily Agent Metrics</h3>
            <Button variant="outline" size="sm" onClick={handleAgentDailyExcel} disabled={exporting === 'agent-daily-excel'}>
              <FileSpreadsheet size={13} className="text-emerald-500" />{exporting === 'agent-daily-excel' ? 'Preparing Excel…' : 'Download Excel'}
            </Button>
          </div>
          <div className="mb-6 overflow-x-auto rounded-xl border border-glass">
            <table className="w-full text-xs min-w-max">
              <thead><tr className="bg-black/[0.03] dark:bg-white/[0.04] border-b border-glass">
                {[
                  { label: 'Agent' },
                  { label: 'Today created', date: dashboardDay.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) },
                  { label: 'Open < 1h' },
                  { label: 'Open 1–2h' },
                  { label: 'Open 2–24h' },
                  { label: 'Resolved today' },
                  { label: 'Resolved < 1h' },
                  { label: 'Resolved 1–2h' },
                  { label: 'Resolved 2–24h' },
                  { label: 'This month' },
                ].map(({ label, date }) => <th key={label} className="py-2.5 px-3 text-left text-[10px] font-bold t-sub uppercase tracking-wider whitespace-nowrap"><div>{label}</div>{date && <div className="mt-0.5 text-[9px] font-medium normal-case tracking-normal t-muted">{date}</div>}</th>)}
              </tr></thead>
              <tbody>{visibleAgentStats.map(agent => <tr key={agent.id} className="border-b border-glass last:border-0 hover:bg-indigo-500/[0.035]">
                <td className="py-3 px-3 font-semibold t-main">{agent.name}</td>
                {[agent.today, agent.underOneHour, agent.oneToTwoHours, agent.twoToTwentyFourHours, agent.resolvedToday, agent.resolvedUnderOneHour, agent.resolvedOneToTwoHours, agent.resolvedTwoToTwentyFourHours, agent.month].map((count, index) => <td key={index} className="py-3 px-3 tabular-nums t-main">{count}</td>)}
              </tr>)}
              {agentWorkSummary.agentStats.length === 0 && <tr><td colSpan={10} className="py-6 text-center t-sub">No agent ticket data available.</td></tr>}</tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 mb-3"><Users size={14} className="text-violet-500" /><h3 className="text-xs font-bold t-main">Category Specialists · Completed Tickets</h3></div>
          <div className="overflow-x-auto rounded-xl border border-glass">
            <table className="w-full text-xs min-w-max">
              <thead><tr className="bg-black/[0.03] dark:bg-white/[0.04] border-b border-glass">
                {['Category', ...visibleAgents.map(agent => agent.name)].map((heading, index) => <th key={`${heading}-${index}`} className="py-3 px-3 text-left text-[10px] font-bold t-sub uppercase tracking-wider whitespace-nowrap">{heading}</th>)}
              </tr></thead>
              <tbody>{agentWorkSummary.categoryRows.map(row => <tr key={row.key} className="border-b border-glass last:border-0 hover:bg-violet-500/[0.035]">
                <td className="py-3 px-3 t-main whitespace-nowrap">{getCategoryName(row.category) || 'Uncategorized'}</td>
                {visibleAgents.map(agent => { const count = row.counts[agent.name] || 0; return <td key={agent.id} className="py-3 px-3">{count ? <span className="inline-flex rounded-lg bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-500">{count} completed</span> : <span className="t-sub">—</span>}</td> })}
              </tr>)}
              {agentWorkSummary.categoryRows.length === 0 && <tr><td colSpan={visibleAgents.length + 1} className="py-8 text-center t-sub">No resolved or closed tickets yet.</td></tr>}</tbody>
            </table>
          </div>
        </>}
      </Card>

      {/* ── SLA Overdue Report ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <AlarmClock size={15} className={stats.slaOverdue > 0 ? 'text-rose-500' : 'text-emerald-500'} />
              <span>SLA Overdue Report</span>
              {stats.slaOverdue > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30 animate-pulse">
                  {stats.slaOverdue} overdue
                </span>
              )}
            </div>
          }
          subtitle={stats.slaOverdue > 25 ? `Showing the 25 most overdue of ${stats.slaOverdue} tickets` : 'Tickets that have exceeded their SLA deadline'}
          action={
            stats.slaOverdue > 0 && (
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
      <Suspense fallback={<div className="rounded-xl border border-glass p-8 text-center text-sm t-sub">Loading charts…</div>}><DashboardCharts categoryData={categoryData} statusData={statusData} companyData={companyData} /></Suspense>

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
