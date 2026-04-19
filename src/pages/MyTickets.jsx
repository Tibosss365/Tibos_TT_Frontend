import { useState, useRef, useEffect } from 'react'
import { useTicketStore } from '../stores/ticketStore'
import { useUserStore } from '../stores/userStore'
import { useUiStore } from '../stores/uiStore'
import { PriorityBadge, StatusBadge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { TicketDetailModal } from '../components/tickets/TicketDetailModal'
import { timeAgo, PRIORITIES, TICKET_TYPES, TICKET_TYPE_META } from '../utils/ticketUtils'
import { useAdminStore } from '../stores/adminStore'
import { useT } from '../utils/i18n'
import { SlidersHorizontal, Check, Search, X, Filter, RotateCcw, Inbox, HandMetal, Loader2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'

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
const STAGED_DEFAULTS = {
  dateRange: 'all', priority: '', category: '', group: '', type: '',
  assignee: '', dateFrom: '', dateTo: '', dateField: 'created',
}

const DATE_RANGES = [
  { key: 'all',    label: 'All Time'   },
  { key: 'today',  label: 'Today'      },
  { key: 'week',   label: 'This Week'  },
  { key: 'month',  label: 'This Month' },
  { key: 'custom', label: 'Custom'     },
]

// My Tickets only shows active (non-resolved, non-closed) tickets
const STATUS_OPTIONS = [
  { key: '',            label: 'All'         },
  { key: 'open',        label: 'Open'        },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'on-hold',     label: 'On Hold'     },
]

const STATUS_ACTIVE_CLS = {
  '':             'bg-indigo-500/15 text-indigo-500 border-indigo-500/40',
  'open':         'bg-blue-500/15 text-blue-500 border-blue-500/40',
  'in-progress':  'bg-violet-500/15 text-violet-500 border-violet-500/40',
  'on-hold':      'bg-amber-500/15 text-amber-500 border-amber-500/40',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const todayStr   = () => new Date().toISOString().split('T')[0]
const daysAgoStr = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0] }

export default function MyTickets() {
  const { tickets, loading, updateTicket, deleteTicket } = useTicketStore()
  const { currentUser }                    = useUserStore()
  const { addToast }                       = useUiStore()
  const { getCategoryName, getAgentName, categories, groups, agents } = useAdminStore()
  const t = useT()

  const [selectedTicket, setSelectedTicket]   = useState(null)
  const [claiming, setClaiming]               = useState({})   // { _uuid: true }
  const [deleting, setDeleting]               = useState({})   // { _uuid: true }
  const [poolCollapsed, setPoolCollapsed]     = useState(false)
  const [visibleCols, setVisibleCols]       = useState(DEFAULT_COLS)
  const [showColPicker, setShowColPicker]   = useState(false)
  const [search, setSearch]                 = useState('')
  const [activeStatus, setActiveStatus]     = useState('')   // instant chip filter
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

  // ── Apply / Clear ─────────────────────────────────────────────────────────
  const applyFilters = () => {
    const toApply = { ...staged }
    if (staged.dateRange === 'all')        { toApply.dateFrom = ''; toApply.dateTo = '' }
    else if (staged.dateRange === 'today') { toApply.dateFrom = todayStr(); toApply.dateTo = todayStr() }
    else if (staged.dateRange === 'week')  { toApply.dateFrom = daysAgoStr(7); toApply.dateTo = todayStr() }
    else if (staged.dateRange === 'month') {
      const d = new Date()
      toApply.dateFrom = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`
      toApply.dateTo = todayStr()
    }
    setApplied(toApply)
  }

  const clearAllFilters = () => {
    setApplied(STAGED_DEFAULTS); setStaged(STAGED_DEFAULTS)
    setSearch(''); setActiveStatus('')
  }

  const handleStatusChip = (key) => {
    setActiveStatus(prev => prev === key && key !== '' ? '' : key)
  }

  // ── Claim (Pick Up) handler ───────────────────────────────────────────────
  const handleClaim = async (ticket) => {
    if (!currentUser?.id) return
    setClaiming(prev => ({ ...prev, [ticket._uuid]: true }))
    try {
      await updateTicket(ticket._uuid, { assignee: String(currentUser.id) })
      addToast(`${ticket.id} assigned to you`, 'success')
    } catch (err) {
      addToast(err.message || 'Failed to claim ticket', 'error')
    } finally {
      setClaiming(prev => ({ ...prev, [ticket._uuid]: false }))
    }
  }

  // ── Delete (from pool) handler ─────────────────────────────────────────
  const handleDelete = async (ticket) => {
    if (!window.confirm(`Delete ticket ${ticket.id}? This cannot be undone.`)) return
    setDeleting(prev => ({ ...prev, [ticket._uuid]: true }))
    try {
      await deleteTicket(ticket._uuid)
      addToast(`${ticket.id} deleted`, 'success')
    } catch (err) {
      addToast(err.message || 'Failed to delete ticket', 'error')
    } finally {
      setDeleting(prev => ({ ...prev, [ticket._uuid]: false }))
    }
  }

  // ── Unassigned pool (visible to all agents) ───────────────────────────────
  const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }
  const unassignedPool = tickets
    .filter(t => !t.assignee && t.status !== 'resolved' && t.status !== 'closed')
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99))

  // ── Filter logic ──────────────────────────────────────────────────────────
  // Base: my active (non-resolved, non-closed) tickets — resolved tickets live in All Tickets
  let baseTickets = tickets.filter(t =>
    t.assignee === String(currentUser?.id) &&
    t.status !== 'resolved' &&
    t.status !== 'closed'
  )

  // Apply search
  if (search) {
    const q = search.toLowerCase()
    baseTickets = baseTickets.filter(t =>
      (t.subject||'').toLowerCase().includes(q) ||
      (t.id||'').toLowerCase().includes(q) ||
      (t.submitter||'').toLowerCase().includes(q)
    )
  }

  // Apply non-status staged filters
  if (applied.priority) baseTickets = baseTickets.filter(t => t.priority === applied.priority)
  if (applied.category) baseTickets = baseTickets.filter(t => t.category === applied.category)
  if (applied.group)    baseTickets = baseTickets.filter(t => String(t.group) === String(applied.group))
  if (applied.type)     baseTickets = baseTickets.filter(t => t.type === applied.type)
  if (applied.assignee) {
    if (applied.assignee === 'unassigned') baseTickets = baseTickets.filter(t => !t.assignee)
    else baseTickets = baseTickets.filter(t => String(t.assignee) === String(applied.assignee))
  }
  if (applied.dateFrom || applied.dateTo) {
    const field = applied.dateField || 'created'
    const from  = applied.dateFrom ? new Date(applied.dateFrom) : null
    const to    = applied.dateTo   ? new Date(applied.dateTo + 'T23:59:59') : null
    baseTickets = baseTickets.filter(t => {
      const d = new Date(t[field])
      if (from && d < from) return false
      if (to   && d > to)   return false
      return true
    })
  }

  // Status counts (pre-status filter)
  const statusCounts = { '': baseTickets.length }
  baseTickets.forEach(t => { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1 })

  // Apply status chip
  let myTickets = activeStatus ? baseTickets.filter(t => t.status === activeStatus) : baseTickets
  myTickets = [...myTickets].sort((a, b) => new Date(b.updated) - new Date(a.updated))

  // ── Derived ───────────────────────────────────────────────────────────────
  const hasAnyFilter = !!(activeStatus || applied.priority || applied.category || applied.group ||
    applied.type || applied.assignee || applied.dateFrom || applied.dateTo || search)

  const hasPending = (
    staged.priority  !== (applied.priority  || '') ||
    staged.category  !== (applied.category  || '') ||
    staged.group     !== (applied.group     || '') ||
    staged.type      !== (applied.type      || '') ||
    staged.assignee  !== (applied.assignee  || '') ||
    staged.dateFrom  !== (applied.dateFrom  || '') ||
    staged.dateTo    !== (applied.dateTo    || '') ||
    staged.dateRange !== 'all'
  )

  const selectCls = "h-8 px-2.5 text-xs rounded-lg border border-glass bg-white/60 dark:bg-white/5 t-main focus:outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer"

  // ── Column customization ──────────────────────────────────────────────────
  const toggleCol = (key) => {
    setVisibleCols(prev =>
      prev.includes(key)
        ? prev.length > 1 ? prev.filter(k => k !== key) : prev
        : [...prev, key]
    )
  }
  const cols = ALL_COLUMNS.filter(c => visibleCols.includes(c.key))

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
            {myTickets.length} ticket{myTickets.length !== 1 ? 's' : ''} assigned to you
            {unassignedPool.length > 0 && (
              <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
                · {unassignedPool.length} unassigned available
              </span>
            )}
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

      {/* ── Unassigned ticket pool ────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        {/* Section header */}
        <button
          onClick={() => setPoolCollapsed(p => !p)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-black/3 dark:hover:bg-white/3 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Inbox size={14} className="text-amber-500" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold t-main">Unassigned Tickets</div>
              <div className="text-[11px] t-muted">Open tickets available for any agent to pick up</div>
            </div>
            {unassignedPool.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                {unassignedPool.length}
              </span>
            )}
          </div>
          {poolCollapsed
            ? <ChevronDown size={15} className="t-muted flex-shrink-0" />
            : <ChevronUp   size={15} className="t-muted flex-shrink-0" />}
        </button>

        {!poolCollapsed && (
          unassignedPool.length === 0 ? (
            <div className="px-4 pb-4 pt-1 flex items-center gap-2 text-xs t-muted">
              <Check size={13} className="text-emerald-500" />
              No unassigned tickets — all caught up!
            </div>
          ) : (
            <div className="border-t border-glass divide-y divide-glass">
              {unassignedPool.map(ticket => {
                const isClaiming = claiming[ticket._uuid]
                const pri = ticket.priority
                const PRIORITY_COLOR = {
                  critical: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30',
                  high:     'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/30',
                  medium:   'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30',
                  low:      't-muted bg-slate-500/10 border-slate-500/20',
                }
                return (
                  <div
                    key={ticket._uuid}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-black/3 dark:hover:bg-white/3 transition-colors"
                  >
                    {/* Priority strip */}
                    <div className={`flex-shrink-0 px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wide ${PRIORITY_COLOR[pri]}`}>
                      {pri}
                    </div>

                    {/* Ticket info */}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] t-sub flex-shrink-0">{ticket.id}</span>
                        <span className="text-sm font-medium t-main truncate group-hover:text-indigo-500">{ticket.subject}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] t-muted truncate">{getCategoryName(ticket.category)}</span>
                        <span className="text-[10px] t-muted">·</span>
                        <span className="text-[10px] t-muted">{ticket.company}</span>
                        <span className="text-[10px] t-muted">·</span>
                        <span className="text-[10px] t-muted">{timeAgo(ticket.created)}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex-shrink-0 flex items-center gap-1.5">
                      {/* Pick Up */}
                      <button
                        disabled={isClaiming || deleting[ticket._uuid]}
                        onClick={() => handleClaim(ticket)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all
                          ${isClaiming
                            ? 'opacity-60 cursor-wait border-indigo-500/30 text-indigo-400'
                            : 'border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/60 active:scale-95'
                          }`}
                      >
                        {isClaiming
                          ? <><Loader2 size={12} className="animate-spin" /> Claiming…</>
                          : <><HandMetal size={12} /> Pick Up</>}
                      </button>

                      {/* Delete */}
                      <button
                        disabled={deleting[ticket._uuid] || isClaiming}
                        onClick={() => handleDelete(ticket)}
                        title="Delete ticket"
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all
                          ${deleting[ticket._uuid]
                            ? 'opacity-60 cursor-wait border-rose-500/30 text-rose-400'
                            : 'border-rose-500/30 text-rose-500/70 hover:bg-rose-500/10 hover:border-rose-500/50 hover:text-rose-500 active:scale-95'
                          }`}
                      >
                        {deleting[ticket._uuid]
                          ? <Loader2 size={12} className="animate-spin" />
                          : <Trash2 size={12} />}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </Card>

      {/* ── Filter card ───────────────────────────────────────────────────── */}
      <Card>
        <div className="p-4 space-y-3">

          {/* Row 1: Date range tabs + dropdowns + Clear + Apply */}
          <div className="flex flex-wrap items-center gap-2">

            {/* Date range tabs */}
            <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 rounded-lg p-1 border border-glass">
              {DATE_RANGES.map(({ key, label }) => (
                <button key={key} onClick={() => setSF('dateRange', key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap
                    ${staged.dateRange === key ? 'bg-indigo-500 text-white shadow-sm' : 't-muted hover:t-main'}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Custom date inputs */}
            {staged.dateRange === 'custom' && (
              <div className="flex items-center gap-2">
                <input type="date" value={staged.dateFrom} onChange={e => setSF('dateFrom', e.target.value)} className={selectCls} />
                <span className="text-xs t-muted">to</span>
                <input type="date" value={staged.dateTo}   onChange={e => setSF('dateTo',   e.target.value)} className={selectCls} />
              </div>
            )}

            {/* Right-side dropdowns + buttons */}
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <select value={staged.priority} onChange={e => setSF('priority', e.target.value)} className={selectCls}>
                <option value="">All Priorities</option>
                {PRIORITIES.map(p => <option key={p} value={p}>{cap(p)}</option>)}
              </select>

              <select value={staged.category} onChange={e => setSF('category', e.target.value)} className={selectCls}>
                <option value="">All Categories</option>
                {[...categories].sort((a,b) => a.sortOrder - b.sortOrder).map(c => (
                  <option key={c.id} value={c.id}>{getCategoryName(c.id)}</option>
                ))}
              </select>

              <select value={staged.group} onChange={e => setSF('group', e.target.value)} className={selectCls}>
                <option value="">All Groups</option>
                {(groups||[]).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>

              <select value={staged.type} onChange={e => setSF('type', e.target.value)} className={selectCls}>
                <option value="">All Types</option>
                {TICKET_TYPES.map(t => <option key={t} value={t}>{cap(t)}</option>)}
              </select>

              <select value={staged.assignee} onChange={e => setSF('assignee', e.target.value)} className={selectCls}>
                <option value="">All Agents</option>
                <option value="unassigned">Unassigned</option>
                {(agents||[]).map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
              </select>

              <button onClick={clearAllFilters}
                className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold t-muted hover:text-rose-500 border border-glass hover:border-rose-500/40 rounded-lg transition-all whitespace-nowrap">
                <X size={12} /> Clear
              </button>

              <button onClick={applyFilters}
                className={`flex items-center gap-1.5 h-8 px-4 text-xs font-semibold rounded-lg transition-all whitespace-nowrap
                  ${hasPending
                    ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                    : 'bg-indigo-500/80 hover:bg-indigo-500 text-white'}`}>
                <Filter size={12} /> Apply
              </button>
            </div>
          </div>

          {/* Row 2: Status chips + Search */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-glass">
            <span className="text-[10px] font-bold t-sub uppercase tracking-wider mr-1">{t('status')}</span>
            {STATUS_OPTIONS.map(({ key }) => {
              const count = statusCounts[key] ?? 0
              const isActive = activeStatus === key
              return (
                <button key={key} onClick={() => handleStatusChip(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                    ${isActive ? STATUS_ACTIVE_CLS[key] : 'border-glass t-muted hover:t-main hover:border-indigo-500/30'}`}>
                  {key ? t(key) : t('allStatuses')}
                  <span className={`min-w-[18px] text-center text-[10px] font-bold px-1 py-0.5 rounded-full
                    ${isActive ? 'bg-black/10 dark:bg-white/20' : 'bg-black/10 dark:bg-white/10 t-sub'}`}>
                    {count}
                  </span>
                </button>
              )
            })}

            {/* Search pushed to right */}
            <div className="ml-auto">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 t-sub" />
                <input type="text" placeholder="Search my tickets…"
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="glass-input pl-8 pr-7 py-1.5 text-xs w-52" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 t-sub hover:t-main">
                    <X size={11} />
                  </button>
                )}
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
                      {hasAnyFilter ? t('noTickets') : t('noActiveTickets')}
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
