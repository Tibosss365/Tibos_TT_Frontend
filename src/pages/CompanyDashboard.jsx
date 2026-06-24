import { useState, useMemo } from 'react'
import {
  Building2, Ticket, FolderOpen, CheckCircle2, ShieldCheck, Search,
  TrendingUp, TrendingDown, Minus, AlertTriangle, FileSpreadsheet, FileText, Trophy,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useTicketStore } from '../stores/ticketStore'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { exportCompanyExcel, exportCompanyPdf } from '../utils/reportExport'

const COLORS = ['#0ea5e9', '#2563eb', '#06b6d4', '#14b8a6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#f97316', '#84cc16']

const DATE_RANGES = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
]

const isOverdue = (t) =>
  t.slaStatus === 'overdue' ||
  (t.slaStatus === 'active' && t.slaDueTime && new Date(t.slaDueTime) < new Date())

function inRange(dateStr, range) {
  if (range === 'all') return true
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  if (range === 'today') return d.toDateString() === now.toDateString()
  if (range === 'week') {
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
    return d >= weekAgo
  }
  if (range === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  return true
}

const initials = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'

// ── Build per-company stats from tickets ──────────────────────────────────────
function buildCompanies(tickets) {
  const now = new Date()
  const thisKey = `${now.getFullYear()}-${now.getMonth()}`
  const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastKey = `${lm.getFullYear()}-${lm.getMonth()}`

  const map = {}
  tickets.forEach(t => {
    const name = (t.company || '').trim() || 'Unknown'
    const email = (t.email || '').trim().toLowerCase()
    const domain = email.includes('@') ? email.split('@')[1] : ''
    if (!map[name]) map[name] = { name, domains: {}, total: 0, open: 0, closed: 0, critical: 0, overdue: 0, lastTs: 0, thisMonth: 0, lastMonth: 0 }
    const c = map[name]
    c.total++
    if (t.status === 'resolved' || t.status === 'closed') c.closed++
    else c.open++ // open + in-progress + on-hold = active
    if (t.priority === 'critical') c.critical++
    if (isOverdue(t)) c.overdue++
    if (domain) c.domains[domain] = (c.domains[domain] || 0) + 1
    if (t.created) {
      const d = new Date(t.created)
      const ts = d.getTime()
      if (ts > c.lastTs) c.lastTs = ts
      const k = `${d.getFullYear()}-${d.getMonth()}`
      if (k === thisKey) c.thisMonth++
      else if (k === lastKey) c.lastMonth++
    }
  })

  return Object.values(map).map(c => {
    const slaPct = c.total ? Math.round(((c.total - c.overdue) / c.total) * 100) : 100
    const topDomain = Object.entries(c.domains).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
    const trend = c.thisMonth - c.lastMonth
    return {
      ...c,
      slaPct,
      domain: topDomain,
      trend,
      lastTicket: c.lastTs ? new Date(c.lastTs).toLocaleDateString() : '',
    }
  })
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-3 py-2 text-xs" style={{ borderRadius: 8 }}>
      <div className="font-semibold t-main mb-0.5">{label ?? payload[0].name}</div>
      {payload.map((p, i) => (
        <div key={i} className="t-muted">{p.name}: <span className="font-bold t-main">{p.value}</span></div>
      ))}
    </div>
  )
}

// ── Summary card ──────────────────────────────────────────────────────────────
function SummaryCard({ icon: Icon, label, value, color }) {
  return (
    <div className="glass-card p-4 flex items-center gap-3 transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold t-main leading-none">{value}</div>
        <div className="text-[11px] t-muted mt-1 truncate">{label}</div>
      </div>
    </div>
  )
}

// ── Company card ──────────────────────────────────────────────────────────────
function CompanyCard({ c, color }) {
  const TrendIcon = c.trend > 0 ? TrendingUp : c.trend < 0 ? TrendingDown : Minus
  const trendCls = c.trend > 0 ? 'text-rose-500' : c.trend < 0 ? 'text-emerald-500' : 't-muted'
  const slaCls = c.slaPct >= 90 ? 'text-emerald-500' : c.slaPct >= 70 ? 'text-amber-500' : 'text-rose-500'
  return (
    <div className="glass-card p-4 transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white shadow-md" style={{ background: color }}>
          {initials(c.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold t-main truncate">{c.name}</div>
          {c.domain && <div className="text-[10px] t-muted truncate">@{c.domain}</div>}
        </div>
        <span className={`flex items-center gap-0.5 text-[10px] font-bold ${trendCls}`} title="vs last month">
          <TrendIcon size={12} />{c.trend !== 0 ? Math.abs(c.trend) : ''}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div><div className="text-base font-bold t-main">{c.total}</div><div className="text-[9px] t-muted uppercase tracking-wide">Total</div></div>
        <div><div className="text-base font-bold text-blue-500">{c.open}</div><div className="text-[9px] t-muted uppercase tracking-wide">Open</div></div>
        <div><div className="text-base font-bold text-emerald-500">{c.closed}</div><div className="text-[9px] t-muted uppercase tracking-wide">Closed</div></div>
        <div><div className="text-base font-bold text-rose-500">{c.critical}</div><div className="text-[9px] t-muted uppercase tracking-wide">Critical</div></div>
      </div>
      <div className="mt-3 pt-3 border-t border-glass flex items-center justify-between">
        <span className="text-[10px] t-muted">SLA Compliance</span>
        <span className={`text-xs font-bold ${slaCls}`}>{c.slaPct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${c.slaPct >= 90 ? 'bg-emerald-500' : c.slaPct >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${c.slaPct}%` }} />
      </div>
    </div>
  )
}

export default function CompanyDashboard() {
  const { tickets } = useTicketStore()
  const [dateRange, setDateRange] = useState('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('total')
  const [exporting, setExporting] = useState(null)

  const rangedTickets = useMemo(
    () => tickets.filter(t => inRange(t.created, dateRange)),
    [tickets, dateRange],
  )

  const companies = useMemo(() => buildCompanies(rangedTickets), [rangedTickets])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = q
      ? companies.filter(c => c.name.toLowerCase().includes(q) || (c.domain || '').toLowerCase().includes(q))
      : [...companies]
    const sorters = {
      total: (a, b) => b.total - a.total,
      open: (a, b) => b.open - a.open,
      closed: (a, b) => b.closed - a.closed,
      critical: (a, b) => b.critical - a.critical,
      sla: (a, b) => b.slaPct - a.slaPct,
      name: (a, b) => a.name.localeCompare(b.name),
    }
    return list.sort(sorters[sortBy] || sorters.total)
  }, [companies, search, sortBy])

  // ── Summary metrics ──
  const summary = useMemo(() => {
    const totalTickets = rangedTickets.length
    const overdue = rangedTickets.filter(isOverdue).length
    const open = companies.reduce((s, c) => s + c.open, 0)
    const closed = companies.reduce((s, c) => s + c.closed, 0)
    const slaPct = totalTickets ? Math.round(((totalTickets - overdue) / totalTickets) * 100) : 100
    return { companies: companies.length, totalTickets, open, closed, slaPct }
  }, [companies, rangedTickets])

  // ── Chart datasets ──
  const top10 = useMemo(() => [...companies].sort((a, b) => b.total - a.total).slice(0, 10), [companies])
  const barData = useMemo(() => top10.map((c, i) => ({ name: c.domain ? `${c.name} (@${c.domain})` : c.name, count: c.total, fill: COLORS[i % COLORS.length] })), [top10])
  const stackData = useMemo(() => top10.slice(0, 8).map(c => ({ name: c.name, Open: c.open, Closed: c.closed })), [top10])
  const donutData = useMemo(() => {
    const top = [...companies].sort((a, b) => b.total - a.total)
    const head = top.slice(0, 7).map((c, i) => ({ name: c.name, value: c.total, fill: COLORS[i % COLORS.length] }))
    const rest = top.slice(7).reduce((s, c) => s + c.total, 0)
    if (rest > 0) head.push({ name: 'Others', value: rest, fill: '#94a3b8' })
    return head
  }, [companies])

  const exportRows = filtered.map(c => ({ name: c.name, domain: c.domain, total: c.total, open: c.open, closed: c.closed, critical: c.critical, slaPct: c.slaPct, lastTicket: c.lastTicket }))
  const filterLabel = (DATE_RANGES.find(r => r.key === dateRange)?.label || 'All Time') + (search ? ` · "${search}"` : '')

  const doExport = async (kind) => {
    setExporting(kind)
    try {
      if (kind === 'excel') await exportCompanyExcel(exportRows, { filterLabel })
      else await exportCompanyPdf(exportRows, { filterLabel })
    } catch (e) { console.error(e) } finally { setExporting(null) }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold t-main flex items-center gap-2">
            <Building2 size={20} className="text-indigo-500" /> Company Dashboard
          </h1>
          <p className="text-sm t-muted mt-0.5">Company-wise ticket analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="glass-input text-xs py-1.5">
            {DATE_RANGES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
          <Button variant="ghost" size="sm" onClick={() => doExport('excel')} disabled={exporting === 'excel'}>
            <FileSpreadsheet size={14} className="text-emerald-500" /> <span className="hidden sm:inline">{exporting === 'excel' ? '…' : 'Excel'}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => doExport('pdf')} disabled={exporting === 'pdf'}>
            <FileText size={14} className="text-rose-500" /> <span className="hidden sm:inline">{exporting === 'pdf' ? '…' : 'PDF'}</span>
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard icon={Building2}    label="Total Companies" value={summary.companies}   color="bg-indigo-500/15 text-indigo-500" />
        <SummaryCard icon={Ticket}       label="Total Tickets"   value={summary.totalTickets} color="bg-sky-500/15 text-sky-500" />
        <SummaryCard icon={FolderOpen}   label="Open Tickets"    value={summary.open}        color="bg-blue-500/15 text-blue-500" />
        <SummaryCard icon={CheckCircle2} label="Closed Tickets"  value={summary.closed}      color="bg-emerald-500/15 text-emerald-500" />
        <SummaryCard icon={ShieldCheck}  label="SLA Compliance"  value={`${summary.slaPct}%`} color="bg-violet-500/15 text-violet-500" />
      </div>

      {/* Company cards grid */}
      <Card>
        <CardHeader title="Companies" subtitle={`${filtered.length} ${filtered.length === 1 ? 'company' : 'companies'}`} />
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-sm t-muted">No companies for the selected filter</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.slice(0, 12).map((c, i) => <CompanyCard key={c.name} c={c} color={COLORS[i % COLORS.length]} />)}
          </div>
        )}
      </Card>

      {/* Analytics: bar + stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Company-wise Ticket Count" subtitle="Top 10 by ticket volume" />
          {barData.length === 0 ? <div className="py-10 text-center text-sm t-muted">No data</div> : (
            <ResponsiveContainer width="100%" height={Math.max(240, barData.length * 34)}>
              <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: 'var(--c-chart-text)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={170} tick={{ fill: 'var(--c-chart-text)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--c-chart-grid)' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {barData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardHeader title="Open vs Closed by Company" subtitle="Top 8 companies" />
          {stackData.length === 0 ? <div className="py-10 text-center text-sm t-muted">No data</div> : (
            <ResponsiveContainer width="100%" height={Math.max(240, stackData.length * 34)}>
              <BarChart data={stackData} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: 'var(--c-chart-text)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: 'var(--c-chart-text)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--c-chart-grid)' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Open" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Closed" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Analytics: donut + leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Company Ticket Distribution" subtitle="Share of total tickets" />
          {donutData.length === 0 ? <div className="py-10 text-center text-sm t-muted">No data</div> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {donutData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardHeader title={<div className="flex items-center gap-2"><Trophy size={15} className="text-amber-500" /><span>Top 10 Companies</span></div>} subtitle="By ticket volume" />
          <div className="space-y-1.5">
            {top10.length === 0 ? <div className="py-10 text-center text-sm t-muted">No data</div> : top10.map((c, i) => {
              const max = top10[0].total || 1
              return (
                <div key={c.name} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <span className={`w-6 text-center text-xs font-bold ${i < 3 ? 'text-amber-500' : 't-muted'}`}>#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold t-main truncate">{c.name}{c.domain ? <span className="t-muted font-normal"> @{c.domain}</span> : ''}</span>
                      <span className="text-xs font-bold t-main flex-shrink-0">{c.total}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(c.total / max) * 100}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Company table */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <CardHeader title="Company Details" subtitle="Search, sort and export" />
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 t-muted" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company…" className="glass-input text-xs py-1.5 pl-8 w-44" />
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="glass-input text-xs py-1.5">
              <option value="total">Sort: Total</option>
              <option value="open">Sort: Open</option>
              <option value="closed">Sort: Closed</option>
              <option value="critical">Sort: Critical</option>
              <option value="sla">Sort: SLA %</option>
              <option value="name">Sort: Name</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-glass t-sub">
                <th className="text-left font-semibold uppercase tracking-wider py-2 px-3">Company</th>
                <th className="text-center font-semibold uppercase tracking-wider py-2 px-3">Total</th>
                <th className="text-center font-semibold uppercase tracking-wider py-2 px-3">Open</th>
                <th className="text-center font-semibold uppercase tracking-wider py-2 px-3">Closed</th>
                <th className="text-center font-semibold uppercase tracking-wider py-2 px-3">Critical</th>
                <th className="text-center font-semibold uppercase tracking-wider py-2 px-3">SLA %</th>
                <th className="text-right font-semibold uppercase tracking-wider py-2 px-3">Last Ticket</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center t-muted">No companies found</td></tr>
              ) : filtered.map((c, i) => (
                <tr key={c.name} className="border-b border-glass hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }}>{initials(c.name)}</div>
                      <div className="min-w-0">
                        <div className="font-semibold t-main truncate">{c.name}</div>
                        {c.domain && <div className="text-[10px] t-muted truncate">@{c.domain}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="text-center py-2.5 px-3 font-bold t-main">{c.total}</td>
                  <td className="text-center py-2.5 px-3 text-blue-500 font-semibold">{c.open}</td>
                  <td className="text-center py-2.5 px-3 text-emerald-500 font-semibold">{c.closed}</td>
                  <td className="text-center py-2.5 px-3">
                    {c.critical > 0
                      ? <span className="inline-flex items-center gap-1 text-rose-500 font-semibold"><AlertTriangle size={11} />{c.critical}</span>
                      : <span className="t-muted">0</span>}
                  </td>
                  <td className="text-center py-2.5 px-3">
                    <span className={`font-bold ${c.slaPct >= 90 ? 'text-emerald-500' : c.slaPct >= 70 ? 'text-amber-500' : 'text-rose-500'}`}>{c.slaPct}%</span>
                  </td>
                  <td className="text-right py-2.5 px-3 t-muted">{c.lastTicket || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
