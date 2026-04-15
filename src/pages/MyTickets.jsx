import { useState, useRef, useEffect } from 'react'
import { useTicketStore } from '../stores/ticketStore'
import { useUserStore } from '../stores/userStore'
import { PriorityBadge, StatusBadge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { TicketDetailModal } from '../components/tickets/TicketDetailModal'
import { timeAgo, PRIORITIES, TICKET_TYPES, TICKET_TYPE_META } from '../utils/ticketUtils'
import { useAdminStore } from '../stores/adminStore'
import { SlidersHorizontal, Check, Search, X, Filter, Calendar, RotateCcw } from 'lucide-react'

// ── Column definitions ────────────────────────────────────────────────────────
const ALL_COLUMNS = [
  { key: 'id',         label: 'ID' },
  { key: 'type',       label: 'Type' },
  { key: 'subject',    label: 'Subject' },
  { key: 'assignedTo', label: 'Assigned To' },
  { key: 'priority',   label: 'Priority' },
  { key: 'status',     label: 'Status' },
  { key: 'category',   label: 'Category' },
  { key: 'created',    label: 'Created' },
  { key: 'updated',    label: 'Updated' },
]
const DEFAULT_COLS = ['id','subject','assignedTo','priority','status','category','updated']

// ── Staged filter defaults ────────────────────────────────────────────────────
const STAGED_DEFAULTS = { status: '', priority: '', category: '', group: '', type: '', assignee: '', dateFrom: '', dateTo: '', dateField: 'created' }

// ── Helpers ───────────────────────────────────────────────────────────────────
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const fmtStatus = (s) => s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
const todayStr  = () => new Date().toISOString().split('T')[0]
const daysAgoStr = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0] }

const chipColors = {
  violet:  'bg-violet-500/12 border-violet-400/30 text-violet-700 dark:text-violet-300',
  orange:  'bg-orange-500/12 border-orange-400/30 text-orange-700 dark:text-orange-300',
  emerald: 'bg-emerald-500/12 border-emerald-400/30 text-emerald-700 dark:text-emerald-300',
  blue:    'bg-blue-500/12 border-blue-400/30 text-blue-700 dark:text-blue-300',
  teal:    'bg-teal-500/12 border-teal-400/30 text-teal-700 dark:text-teal-300',
  rose:    'bg-rose-500/12 border-rose-400/30 text-rose-700 dark:text-rose-300',
  indigo:  'bg-indigo-500/12 border-indigo-400/30 text-indigo-700 dark:text-indigo-300',
}

export default function MyTickets() {
  const { tickets, loading }   = useTicketStore()
  const { currentUser }        = useUserStore()
  const { getCategoryName, getAgentName, getGroupName, categories, groups, agents } = useAdminStore()

  const [selectedTicket, setSelectedTicket] = useState(null)
  const [visibleCols, setVisibleCols]       = useState(DEFAULT_COLS)
  const [showColPicker, setShowColPicker]   = useState(false)
  const [search, setSearch]                 = useState('')
  const [applied, setApplied]               = useState(STAGED_DEFAULTS)
  const [staged, setStaged]                 = useState(STAGED_DEFAULTS)
  const pickerRef = useRef(null)

  const setSF = (key, val) => setStaged(s => ({ ...s, [key]: val }))

  // Close col picker on outside click
  useEffect(() => {
    const h = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowColPicker(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── Filter logic ──────────────────────────────────────────────────────────
  const baseTickets = tickets.filter(t =>
    t.assignee === String(currentUser?.id) && t.status !== 'resolved' && t.status !== 'closed'
  )

  let myTickets = [...baseTickets]
  if (search) {
    const q = search.toLowerCase()
    myTickets = myTickets.filter(t =>
      (t.subject||'').toLowerCase().includes(q) ||
      (t.id||'').toLowerCase().includes(q) ||
      (t.submitter||'').toLowerCase().includes(q)
    )
  }
  if (applied.status)   myTickets = myTickets.filter(t => t.status === applied.status)
  if (applied.priority) myTickets = myTickets.filter(t => t.priority === applied.priority)
  if (applied.category) myTickets = myTickets.filter(t => t.category === applied.category)
  if (applied.group)    myTickets = myTickets.filter(t => String(t.group) === String(applied.group))
  if (applied.type)     myTickets = myTickets.filter(t => t.type === applied.type)
  if (applied.assignee) {
    if (applied.assignee === 'unassigned') myTickets = myTickets.filter(t => !t.assignee)
    else myTickets = myTickets.filter(t => String(t.assignee) === String(applied.assignee))
  }
  if (applied.dateFrom || applied.dateTo) {
    const field = applied.dateField || 'created'
    const from  = applied.dateFrom ? new Date(applied.dateFrom) : null
    const to    = applied.dateTo   ? new Date(applied.dateTo + 'T23:59:59') : null
    myTickets = myTickets.filter(t => {
      const d = new Date(t[field])
      if (from && d < from) return false
      if (to   && d > to)   return false
      return true
    })
  }
  myTickets.sort((a, b) => new Date(b.updated) - new Date(a.updated))

  // ── Apply / Clear ─────────────────────────────────────────────────────────
  const applyFilters = () => { setApplied({ ...staged }) }

  const clearAllFilters = () => {
    setApplied(STAGED_DEFAULTS); setStaged(STAGED_DEFAULTS); setSearch('')
  }

  const removeChip = (key) => {
    if (key === 'dateRange') {
      setApplied(s => ({ ...s, dateFrom: '', dateTo: '' }))
      setStaged(s => ({ ...s, dateFrom: '', dateTo: '' }))
    } else {
      setApplied(s => ({ ...s, [key]: '' }))
      setStaged(s => ({ ...s, [key]: '' }))
    }
  }

  // ── Column customization ──────────────────────────────────────────────────
  const toggleCol = (key) => {
    setVisibleCols(prev =>
      prev.includes(key)
        ? prev.length > 1 ? prev.filter(k => k !== key) : prev
        : [...prev, key]
    )
  }
  const cols = ALL_COLUMNS.filter(c => visibleCols.includes(c.key))

  // ── Active filter chips ───────────────────────────────────────────────────
  const filterChips = [
    applied.status   && { key: 'status',    label: 'Status',   value: fmtStatus(applied.status),        color: 'violet' },
    applied.priority && { key: 'priority',  label: 'Priority', value: cap(applied.priority),             color: 'orange' },
    applied.category && { key: 'category',  label: 'Category', value: getCategoryName(applied.category), color: 'blue' },
    applied.group    && { key: 'group',     label: 'Group',    value: getGroupName(applied.group),       color: 'teal' },
    applied.type     && { key: 'type',      label: 'Type',     value: cap(applied.type),                 color: 'rose' },
    applied.assignee && { key: 'assignee',  label: 'Assignee', value: applied.assignee === 'unassigned' ? 'Unassigned' : getAgentName(applied.assignee), color: 'indigo' },
    (applied.dateFrom || applied.dateTo) && {
      key: 'dateRange',
      label: applied.dateField === 'updated' ? 'Updated' : 'Created',
      value: [applied.dateFrom, applied.dateTo].filter(Boolean).join(' → '),
      color: 'emerald',
    },
  ].filter(Boolean)

  const appliedCount = filterChips.length
  const hasSearch = !!search
  const hasAnyFilter = appliedCount > 0 || hasSearch

  const hasPending = (
    staged.status    !== applied.status    ||
    staged.priority  !== applied.priority  ||
    staged.category  !== applied.category  ||
    staged.group     !== applied.group     ||
    staged.type      !== applied.type      ||
    staged.assignee  !== applied.assignee  ||
    staged.dateFrom  !== applied.dateFrom  ||
    staged.dateTo    !== applied.dateTo
  )

  // ── Cell renderer ─────────────────────────────────────────────────────────
  const cellValue = (ticket, key) => {
    switch (key) {
      case 'id':
        return <td key={key} className="py-3 px-4 font-mono text-[11px] t-sub">{ticket.id}</td>
      case 'type': return (
        <td key={key} className="py-3 px-4 whitespace-nowrap">
          {(() => {
            const t = ticket.type || 'request'; const m = TICKET_TYPE_META[t] || TICKET_TYPE_META.request
            return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${m.bg} ${m.border} ${m.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />{m.label}
            </span>
          })()}
        </td>
      )
      case 'subject': return (
        <td key={key} className="py-3 px-4 max-w-xs">
          <div className="t-main font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">{ticket.subject}</div>
          <div className="text-[10px] t-muted mt-0.5">{ticket.submitter_name}</div>
        </td>
      )
      case 'priority':   return <td key={key} className="py-3 px-4"><PriorityBadge priority={ticket.priority} /></td>
      case 'status':     return <td key={key} className="py-3 px-4"><StatusBadge status={ticket.status} /></td>
      case 'assignedTo': return (
        <td key={key} className="py-3 px-4">
          {ticket?.assignee
            ? <span className="inline-flex items-center gap-1.5 text-xs font-medium t-main">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  {getAgentName(ticket.assignee).charAt(0).toUpperCase()}
                </span>
                {getAgentName(ticket.assignee)}
              </span>
            : <span className="text-xs t-muted">—</span>}
        </td>
      )
      case 'category': return <td key={key} className="py-3 px-4 text-xs t-muted">{getCategoryName(ticket.category)}</td>
      case 'created':  return <td key={key} className="py-3 px-4 text-xs t-sub">{timeAgo(ticket.created)}</td>
      case 'updated':  return <td key={key} className="py-3 px-4 text-xs t-sub">{timeAgo(ticket.updated_at)}</td>
      default: return null
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold t-main">My Tickets</h1>
          <p className="text-sm t-muted mt-0.5">
            {myTickets.length} ticket{myTickets.length !== 1 ? 's' : ''}{hasAnyFilter ? ' (filtered)' : ' assigned to you'}
          </p>
        </div>

        {/* Column picker */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowColPicker(p => !p)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all
              ${showColPicker ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-600 dark:text-indigo-400' : 'border-glass t-muted hover:t-main hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            <SlidersHorizontal size={13} /> Customize Columns
          </button>
          {showColPicker && (
            <div className="absolute right-0 top-full mt-2 w-52 glass-card border border-glass rounded-xl shadow-xl z-50 p-2 animate-fade-in">
              <div className="text-[10px] font-bold t-sub uppercase tracking-wider px-2 py-1.5">Visible Columns</div>
              {ALL_COLUMNS.map(col => (
                <button key={col.key} onClick={() => toggleCol(col.key)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                  <span className="text-xs t-main">{col.label}</span>
                  {visibleCols.includes(col.key)
                    ? <Check size={13} className="text-indigo-500" />
                    : <span className="w-3.5 h-3.5 rounded border-2 border-glass/60" />}
                </button>
              ))}
              <div className="border-t border-glass mt-1 pt-1">
                <button onClick={() => setVisibleCols(DEFAULT_COLS)}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-xs t-muted transition-all">
                  <RotateCcw size={11} /> Reset to default
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Filter card ───────────────────────────────────────────────────── */}
      <Card className="p-0 overflow-hidden">

        {/* Search + active badge bar */}
        <div className="flex flex-wrap items-center gap-2 p-4 pb-3">
          <div className="relative flex-1 min-w-52">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 t-sub" />
            <input
              type="text" placeholder="Search my tickets by subject, ID…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="glass-input w-full pl-9 pr-3 py-2 text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 t-sub hover:t-main">
                <X size={13} />
              </button>
            )}
          </div>
          {appliedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/12 border border-indigo-400/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
              <Filter size={12} />
              {appliedCount} filter{appliedCount > 1 ? 's' : ''} active
            </span>
          )}
        </div>

        {/* Active filter chips */}
        {filterChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
            <span className="text-[10px] font-bold t-sub uppercase tracking-wider">Active:</span>
            {filterChips.map(chip => (
              <span key={chip.key}
                className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium border ${chipColors[chip.color]}`}>
                <span className="opacity-60 font-semibold">{chip.label}:</span>
                <span>{chip.value}</span>
                <button onClick={() => removeChip(chip.key)}
                  className="ml-0.5 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* ── Always-visible filter panel ───────────────────────────────────── */}
        <div className="border-t border-glass">
          <div className="p-4 space-y-5">

              {/* Value filters */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold t-sub uppercase tracking-wider">Filter By</span>
                  <div className="flex-1 h-px bg-glass" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    {
                      key: 'status', label: 'Status', placeholder: 'Any Status',
                      options: ['open','in-progress','on-hold','resolved','closed'].map(s => ({ value: s, label: fmtStatus(s) })),
                    },
                    {
                      key: 'priority', label: 'Priority', placeholder: 'Any Priority',
                      options: PRIORITIES.map(p => ({ value: p, label: cap(p) })),
                    },
                    {
                      key: 'category', label: 'Category', placeholder: 'Any Category',
                      options: [...categories].sort((a,b) => a.sortOrder - b.sortOrder).map(c => ({ value: c.id, label: getCategoryName(c.id) })),
                    },
                    {
                      key: 'group', label: 'Group', placeholder: 'Any Group',
                      options: groups.map(g => ({ value: g.id, label: g.name })),
                    },
                    {
                      key: 'type', label: 'Ticket Type', placeholder: 'Any Type',
                      options: TICKET_TYPES.map(t => ({ value: t, label: cap(t) })),
                    },
                    {
                      key: 'assignee', label: 'Agent', placeholder: 'All Agents',
                      options: [
                        { value: 'unassigned', label: 'Unassigned' },
                        ...(agents || []).map(a => ({ value: String(a.id), label: a.name })),
                      ],
                    },
                  ].map(({ key, label, placeholder, options }) => (
                    <div key={key} className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold t-sub uppercase tracking-wider">{label}</label>
                      <select
                        value={staged[key]}
                        onChange={e => setSF(key, e.target.value)}
                        className={`glass-input text-sm py-2 font-medium transition-all
                          ${staged[key] ? 'border-indigo-400/50 bg-indigo-500/5 text-indigo-700 dark:text-indigo-300' : ''}`}
                      >
                        <option value="">{placeholder}</option>
                        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date range */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={12} className="t-sub" />
                  <span className="text-[10px] font-bold t-sub uppercase tracking-wider">Date Range</span>
                  <div className="flex-1 h-px bg-glass" />
                </div>
                <div className="p-3 rounded-xl border border-glass/60 bg-black/[0.02] dark:bg-white/[0.02] space-y-3">
                  <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold t-sub uppercase tracking-wider">Apply To</label>
                      <select value={staged.dateField} onChange={e => setSF('dateField', e.target.value)}
                        className="glass-input text-sm py-2 font-medium min-w-36">
                        <option value="created">Created Date</option>
                        <option value="updated">Last Updated</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold t-sub uppercase tracking-wider">From</label>
                      <input type="date" value={staged.dateFrom} onChange={e => setSF('dateFrom', e.target.value)}
                        className={`glass-input text-sm py-2 font-medium ${staged.dateFrom ? 'border-indigo-400/50 bg-indigo-500/5' : ''}`} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold t-sub uppercase tracking-wider">To</label>
                      <input type="date" value={staged.dateTo} onChange={e => setSF('dateTo', e.target.value)}
                        className={`glass-input text-sm py-2 font-medium ${staged.dateTo ? 'border-indigo-400/50 bg-indigo-500/5' : ''}`} />
                    </div>
                    {(staged.dateFrom || staged.dateTo) && (
                      <button onClick={() => { setSF('dateFrom',''); setSF('dateTo','') }}
                        className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-400 transition-colors pb-2">
                        <X size={11} /> Clear dates
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-medium t-muted">Quick:</span>
                    {[
                      { label: 'Today',   days: 0 },
                      { label: '7 days',  days: 7 },
                      { label: '30 days', days: 30 },
                      { label: '90 days', days: 90 },
                    ].map(({ label, days }) => {
                      const from = daysAgoStr(days), to = todayStr()
                      const isActive = staged.dateFrom === from && staged.dateTo === to
                      return (
                        <button key={label}
                          onClick={() => {
                            if (isActive) { setSF('dateFrom',''); setSF('dateTo','') }
                            else { setSF('dateFrom', from); setSF('dateTo', to) }
                          }}
                          className={`px-3 py-1 rounded-lg border text-xs font-medium transition-all
                            ${isActive
                              ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-600 dark:text-indigo-400'
                              : 'border-glass t-muted hover:t-main hover:bg-black/5 dark:hover:bg-white/5'}`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Panel action buttons */}
              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] t-muted">
                  {hasPending
                    ? <span className="text-amber-500 font-medium">Unsaved changes — click Apply to filter</span>
                    : filterChips.length > 0
                      ? `${filterChips.length} filter${filterChips.length > 1 ? 's' : ''} applied`
                      : 'No filters applied'}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={clearAllFilters}
                    className="px-4 py-2 rounded-lg border border-glass text-sm font-medium t-muted hover:t-main hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center gap-1.5">
                    <RotateCcw size={13} /> Clear All
                  </button>
                  <button onClick={applyFilters}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 shadow-sm
                      ${hasPending
                        ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/25'
                        : 'bg-indigo-500/80 hover:bg-indigo-500 text-white'}`}
                  >
                    <Check size={14} /> Apply Filters
                  </button>
                </div>
              </div>

            </div>
          </div>
      </Card>

      {/* ── Ticket table ──────────────────────────────────────────────────── */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass bg-black/[0.01] dark:bg-white/[0.01]">
                {cols.map(c => (
                  <th key={c.key} className="py-3 px-4 text-left text-[10px] font-bold t-sub uppercase tracking-wider">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={cols.length} className="py-12 text-center t-muted">Loading…</td></tr>
              ) : myTickets.length === 0 ? (
                <tr><td colSpan={cols.length} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Filter size={28} className="t-sub opacity-30" />
                    <p className="text-sm t-sub">
                      {hasAnyFilter ? 'No tickets match your filters' : 'No tickets assigned to you'}
                    </p>
                    {hasAnyFilter && (
                      <button onClick={clearAllFilters} className="text-xs text-indigo-500 hover:text-indigo-400 underline underline-offset-2">
                        Clear all filters
                      </button>
                    )}
                  </div>
                </td></tr>
              ) : myTickets.map(ticket => (
                <tr key={ticket?.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="border-b border-glass hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-all group">
                  {cols.map(c => cellValue(ticket, c.key))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {myTickets.length > 0 && (
          <div className="px-4 py-2.5 border-t border-glass">
            <span className="text-[11px] t-muted">{myTickets.length} result{myTickets.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </Card>

      {selectedTicket && <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />}
    </div>
  )
}
