import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Search, Download, Trash2, CheckSquare, Square, X, Check,
  SlidersHorizontal, Filter, RotateCcw
} from 'lucide-react'
import { useTicketStore } from '../stores/ticketStore'
import { useAdminStore } from '../stores/adminStore'
import { useUiStore } from '../stores/uiStore'
import { PriorityBadge, StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { TicketDetailModal } from '../components/tickets/TicketDetailModal'
import { STATUSES, PRIORITIES, TICKET_TYPES, TICKET_TYPE_META, timeAgo, getSlaInfo } from '../utils/ticketUtils'
import { useT } from '../utils/i18n'

// ── Column definitions ────────────────────────────────────────────────────────
const ALL_COLUMNS = [
  { key: 'id',        label: 'ID' },
  { key: 'type',      label: 'Type' },
  { key: 'subject',   label: 'Subject' },
  { key: 'priority',  label: 'Priority' },
  { key: 'status',    label: 'Status' },
  { key: 'sla',       label: 'SLA' },
  { key: 'group',     label: 'Group' },
  { key: 'category',  label: 'Category' },
  { key: 'assignee',  label: 'Assignee' },
  { key: 'submitter', label: 'Submitter' },
  { key: 'created',   label: 'Created' },
  { key: 'updated',   label: 'Updated' },
]
const DEFAULT_COLS = ['id','type','subject','priority','status','sla','group','category','assignee','updated']

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

const STATUS_OPTIONS = [
  { key: '',            label: 'All'         },
  { key: 'open',        label: 'Open'        },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'on-hold',     label: 'On Hold'     },
  { key: 'resolved',    label: 'Resolved'    },
  { key: 'closed',      label: 'Closed'      },
]

const STATUS_ACTIVE_CLS = {
  '':             'bg-indigo-500/15 text-indigo-500 border-indigo-500/40',
  'open':         'bg-blue-500/15 text-blue-500 border-blue-500/40',
  'in-progress':  'bg-violet-500/15 text-violet-500 border-violet-500/40',
  'on-hold':      'bg-amber-500/15 text-amber-500 border-amber-500/40',
  'resolved':     'bg-emerald-500/15 text-emerald-500 border-emerald-500/40',
  'closed':       'bg-slate-500/15 text-slate-400 border-slate-500/40',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const cap  = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const fmtStatus = (s) => s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
const todayStr = () => new Date().toISOString().split('T')[0]
const daysAgoStr = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0] }

export default function AllTickets() {
  const location = useLocation()
  const {
    tickets, filters, setFilter, resetFilters,
    selectedIds, toggleSelect, selectAll, clearSelection,
    bulkUpdate, bulkDelete, getFilteredTickets,
  } = useTicketStore()
  const { getAgentName, getCategoryName, categories, groups, getGroupName, agents } = useAdminStore()
  const { addToast } = useUiStore()
  const t = useT()

  const [selectedTicket, setSelectedTicket]   = useState(null)
  const [staged, setStaged]                   = useState(() => ({
    dateRange: 'all',
    priority:  filters.priority  || '',
    category:  filters.category  || '',
    group:     filters.group     || '',
    type:      filters.type      || '',
    assignee:  filters.assignee  || '',
    dateFrom:  filters.dateFrom  || '',
    dateTo:    filters.dateTo    || '',
    dateField: filters.dateField || 'created',
  }))
  const [visibleCols, setVisibleCols]         = useState(DEFAULT_COLS)
  const [showColPicker, setShowColPicker]     = useState(false)
  const colPickerRef = useRef(null)
  const panelRef     = useRef(null)

  // Auto-open ticket from notification nav
  useEffect(() => {
    const openId = location.state?.openTicketId
    if (openId) {
      const ticket = tickets.find(t => t.id === openId)
      if (ticket) setSelectedTicket(ticket)
      window.history.replaceState({}, '')
    }
  }, [location.state])

  // Close col picker on outside click
  useEffect(() => {
    const h = (e) => { if (colPickerRef.current && !colPickerRef.current.contains(e.target)) setShowColPicker(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const setSF = (key, val) => setStaged(s => ({ ...s, [key]: val }))

  // Apply staged → store (converting dateRange to dateFrom/dateTo)
  const applyFilters = () => {
    const toApply = { ...staged }
    if (staged.dateRange === 'all')   { toApply.dateFrom = ''; toApply.dateTo = '' }
    else if (staged.dateRange === 'today') { toApply.dateFrom = todayStr(); toApply.dateTo = todayStr() }
    else if (staged.dateRange === 'week')  { toApply.dateFrom = daysAgoStr(7); toApply.dateTo = todayStr() }
    else if (staged.dateRange === 'month') {
      const d = new Date()
      toApply.dateFrom = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`
      toApply.dateTo = todayStr()
    }
    Object.entries(toApply).forEach(([k, v]) => { if (k !== 'dateRange') setFilter(k, v) })
  }

  // Clear everything
  const clearAllFilters = () => {
    resetFilters()
    setStaged(STAGED_DEFAULTS)
  }

  // Status chips apply instantly
  const handleStatusChip = (key) => {
    const val = filters.status === key && key !== '' ? '' : key
    setFilter('status', val)
  }

  // Column customization
  const toggleCol = (key) => {
    setVisibleCols(prev =>
      prev.includes(key)
        ? prev.length > 1 ? prev.filter(k => k !== key) : prev
        : [...prev, key]
    )
  }
  const visibleColDefs = ALL_COLUMNS.filter(c => visibleCols.includes(c.key))

  // Bulk actions
  const filtered = getFilteredTickets()
  const allSelected = filtered.length > 0 && filtered.every(t => selectedIds.includes(t._uuid))
  const handleSelectAll = () => { if (allSelected) clearSelection(); else selectAll(filtered.map(t => t._uuid)) }

  const handleBulkResolve = async () => {
    try { await bulkUpdate(selectedIds, { status: 'resolved' }); addToast(`${selectedIds.length} tickets resolved`, 'success') }
    catch (e) { addToast(e.message, 'error') }
  }
  const handleBulkClose = async () => {
    try { await bulkUpdate(selectedIds, { status: 'closed' }); addToast(`${selectedIds.length} tickets closed`, 'info') }
    catch (e) { addToast(e.message, 'error') }
  }
  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} tickets?`)) return
    try { await bulkDelete(selectedIds); addToast(`${selectedIds.length} tickets deleted`, 'error') }
    catch (e) { addToast(e.message, 'error') }
  }

  const handleExportCSV = () => {
    const headers = ['ID','Subject','Category','Priority','Status','Submitter','Assignee','Created']
    const rows = filtered.map(t => [t.id,`"${t.subject}"`,t.category,t.priority,t.status,t.submitter,getAgentName(t.assignee),t.created])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'tickets.csv'; a.click()
  }

  const hasSearch    = !!filters.search
  const hasAnyFilter = !!(filters.status || filters.priority || filters.category || filters.group || filters.type || filters.assignee || filters.dateFrom || filters.dateTo || hasSearch)

  // Detect unsaved staged changes
  const hasPending = (
    staged.priority  !== (filters.priority  || '') ||
    staged.category  !== (filters.category  || '') ||
    staged.group     !== (filters.group     || '') ||
    staged.type      !== (filters.type      || '') ||
    staged.assignee  !== (filters.assignee  || '') ||
    staged.dateFrom  !== (filters.dateFrom  || '') ||
    staged.dateTo    !== (filters.dateTo    || '') ||
    staged.dateRange !== 'all'
  )

  // Status chip counts (pre-status filter for accurate per-status numbers)
  const statusCounts = (() => {
    let result = [...tickets]
    if (filters.priority) result = result.filter(t => t.priority === filters.priority)
    if (filters.category) result = result.filter(t => t.category === filters.category)
    if (filters.group)    result = result.filter(t => t.group === filters.group)
    if (filters.type)     result = result.filter(t => t.type === filters.type)
    if (filters.assignee) {
      if (filters.assignee === 'unassigned') result = result.filter(t => !t.assignee)
      else result = result.filter(t => String(t.assignee) === String(filters.assignee))
    }
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(t =>
        (t.subject||'').toLowerCase().includes(q) ||
        (t.id||'').toLowerCase().includes(q) ||
        (t.submitter||'').toLowerCase().includes(q)
      )
    }
    if (filters.dateFrom || filters.dateTo) {
      const field = filters.dateField || 'created'
      const from  = filters.dateFrom ? new Date(filters.dateFrom) : null
      const to    = filters.dateTo   ? new Date(filters.dateTo + 'T23:59:59') : null
      result = result.filter(t => {
        const d = new Date(t[field])
        if (from && d < from) return false
        if (to   && d > to)   return false
        return true
      })
    }
    const counts = { '': result.length }
    result.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1 })
    return counts
  })()

  const selectCls = "h-8 px-2.5 text-xs rounded-lg border border-glass bg-white/60 dark:bg-slate-800 t-main focus:outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer"

  // Cell renderer
  const cellValue = (ticket, key) => {
    switch (key) {
      case 'id':
        return <td key={key} className="py-3 px-3 font-mono text-[11px] t-sub whitespace-nowrap">{ticket.id}</td>
      case 'type': return (
        <td key={key} className="py-3 px-3 whitespace-nowrap">
          {(() => {
            const t = ticket.type || 'request'; const m = TICKET_TYPE_META[t] || TICKET_TYPE_META.request
            return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${m.bg} ${m.border} ${m.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />{m.label}
            </span>
          })()}
        </td>
      )
      case 'subject': return (
        <td key={key} className="py-3 px-3 max-w-xs">
          <div className="t-main font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">{ticket.subject}</div>
          <div className="text-[10px] t-muted mt-0.5">{ticket.submitter}</div>
        </td>
      )
      case 'priority': return <td key={key} className="py-3 px-3 whitespace-nowrap"><PriorityBadge priority={ticket.priority} /></td>
      case 'status':   return <td key={key} className="py-3 px-3 whitespace-nowrap"><StatusBadge status={ticket.status} /></td>
      case 'sla': return (
        <td key={key} className="py-3 px-3 whitespace-nowrap">
          {(() => {
            const sla = getSlaInfo(ticket)
            if (!sla) return ticket.slaStatus === 'not_started'
              ? <span className="text-[11px] t-muted">Not started</span>
              : <span className="text-xs t-muted">—</span>
            if (sla.done)    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/25">✓ Done</span>
            if (sla.paused)  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30">⏸ {sla.label}</span>
            if (sla.overdue) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-500 border border-rose-500/30 animate-pulse">⚠ {sla.label}</span>
            return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${sla.warning ? 'bg-amber-500/15 text-amber-500 border-amber-500/30' : 'bg-slate-500/10 text-slate-500 border-slate-500/20 dark:text-slate-400'}`}>⏱ {sla.label}</span>
          })()}
        </td>
      )
      case 'group': return (
        <td key={key} className="py-3 px-3 whitespace-nowrap">
          {ticket.group ? (() => {
            const g = groups.find(x => x.id === ticket.group)
            return g
              ? <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: g.color+'20', color: g.color, border: `1px solid ${g.color}40` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: g.color }} />{g.name}
                </span>
              : <span className="text-xs t-muted">—</span>
          })() : <span className="text-xs t-muted">—</span>}
        </td>
      )
      case 'category':  return <td key={key} className="py-3 px-3 text-xs t-muted whitespace-nowrap">{getCategoryName(ticket?.category)}</td>
      case 'assignee':  return <td key={key} className="py-3 px-3 text-xs t-muted whitespace-nowrap">{getAgentName(ticket?.assignee)}</td>
      case 'submitter': return <td key={key} className="py-3 px-3 text-xs t-muted whitespace-nowrap">{ticket.submitter || '—'}</td>
      case 'created':   return <td key={key} className="py-3 px-3 text-xs t-sub whitespace-nowrap">{timeAgo(ticket?.created)}</td>
      case 'updated':   return <td key={key} className="py-3 px-3 text-xs t-sub whitespace-nowrap">{timeAgo(ticket?.updated)}</td>
      default: return <td key={key} className="py-3 px-3 text-xs t-muted">—</td>
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold t-main">All Tickets</h1>
          <p className="text-sm t-muted mt-0.5">
            {filtered.length} ticket{filtered.length !== 1 ? 's' : ''}{hasAnyFilter ? ' (filtered)' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Column picker */}
          <div className="relative" ref={colPickerRef}>
            <button
              onClick={() => setShowColPicker(p => !p)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all
                ${showColPicker ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-600 dark:text-indigo-400' : 'border-glass t-muted hover:t-main hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <SlidersHorizontal size={13} /> <span className="hidden sm:inline">Columns</span>
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
          <Button variant="ghost" size="sm" onClick={handleExportCSV}><Download size={14} /> <span className="hidden sm:inline">Export CSV</span></Button>
        </div>
      </div>

      {/* ── Filter card ───────────────────────────────────────────────────── */}
      <Card>
        <div className="p-4 space-y-3">

          {/* Row 1: Date range tabs + dropdowns + Clear + Apply */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">

            {/* Date range tabs */}
            <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 rounded-lg p-1 border border-glass overflow-x-auto">
              {DATE_RANGES.map(({ key, label }) => (
                <button key={key} onClick={() => setSF('dateRange', key)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0
                    ${staged.dateRange === key ? 'bg-indigo-500 text-white shadow-sm' : 't-muted hover:t-main'}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Custom date inputs */}
            {staged.dateRange === 'custom' && (
              <div className="flex items-center gap-2 flex-wrap">
                <input type="date" value={staged.dateFrom} onChange={e => setSF('dateFrom', e.target.value)} className={selectCls + ' flex-1 sm:flex-none'} />
                <span className="text-xs t-muted">to</span>
                <input type="date" value={staged.dateTo}   onChange={e => setSF('dateTo',   e.target.value)} className={selectCls + ' flex-1 sm:flex-none'} />
              </div>
            )}

            {/* Right-side dropdowns + buttons */}
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
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
                <option value="">All Assignees</option>
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

          {/* Row 2: Status chips + Search + Sort */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 pt-2 border-t border-glass">
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:pb-0 flex-nowrap sm:flex-wrap">
              <span className="text-[10px] font-bold t-sub uppercase tracking-wider mr-1 flex-shrink-0">{t('status')}</span>
              {STATUS_OPTIONS.map(({ key }) => {
                const count = statusCounts[key] ?? 0
                const isActive = filters.status === key
                return (
                  <button key={key} onClick={() => handleStatusChip(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex-shrink-0
                      ${isActive ? STATUS_ACTIVE_CLS[key] : 'border-glass t-muted hover:t-main hover:border-indigo-500/30'}`}>
                    {key ? t(key) : t('allStatuses')}
                    <span className={`min-w-[18px] text-center text-[10px] font-bold px-1 py-0.5 rounded-full
                      ${isActive ? 'bg-black/10 dark:bg-white/20' : 'bg-black/10 dark:bg-white/10 t-sub'}`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Search + Sort */}
            <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
              <div className="relative flex-1 sm:flex-none">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 t-sub" />
                <input type="text" placeholder="Search tickets…"
                  value={filters.search} onChange={e => setFilter('search', e.target.value)}
                  className="glass-input pl-8 pr-7 py-1.5 text-xs w-full sm:w-48" />
                {filters.search && (
                  <button onClick={() => setFilter('search', '')} className="absolute right-2 top-1/2 -translate-y-1/2 t-sub hover:t-main">
                    <X size={11} />
                  </button>
                )}
              </div>
              <select value={filters.sort} onChange={e => setFilter('sort', e.target.value)}
                className={selectCls + ' flex-1 sm:flex-none sm:min-w-32'}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="priority">By priority</option>
                <option value="updated">Recently updated</option>
              </select>
            </div>
          </div>

        </div>
      </Card>

      {/* ── Bulk action bar ───────────────────────────────────────────────── */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-4 py-2.5 rounded-xl bg-indigo-500 dark:bg-indigo-600/15 border border-indigo-500/30 animate-fade-in">
          <span className="text-sm text-white dark:text-indigo-300 font-medium">{selectedIds.length} selected</span>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <Button variant="ghost" size="sm" onClick={handleBulkResolve} className="text-white dark:text-inherit"><span className="hidden sm:inline">Mark </span>Resolved</Button>
            <Button variant="ghost" size="sm" onClick={handleBulkClose}   className="text-white dark:text-inherit"><span className="hidden sm:inline">Mark </span>Closed</Button>
            <Button variant="danger" size="sm" onClick={handleBulkDelete}><Trash2 size={12} /> <span className="hidden sm:inline">Delete</span></Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}     className="text-white dark:text-inherit"><X size={12} /></Button>
          </div>
        </div>
      )}

      {/* ── Ticket table ──────────────────────────────────────────────────── */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass bg-black/[0.01] dark:bg-white/[0.01]">
                <th className="py-3 pl-4 pr-2 w-10">
                  <button onClick={handleSelectAll} className="t-sub hover:t-main transition-colors">
                    {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                  </button>
                </th>
                {visibleColDefs.map(col => (
                  <th key={col.key} className="py-3 px-3 text-left text-[10px] font-bold t-sub uppercase tracking-wider whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={visibleColDefs.length + 1} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Filter size={28} className="t-sub opacity-30" />
                      <p className="text-sm t-sub">No tickets match your filters</p>
                      {hasAnyFilter && (
                        <button onClick={clearAllFilters} className="text-xs text-indigo-500 hover:text-indigo-400 underline underline-offset-2">
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : filtered.map(ticket => (
                <tr key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`border-b border-glass hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-all group
                    ${selectedIds.includes(ticket._uuid) ? 'bg-indigo-500/8 dark:bg-indigo-500/8' : ''}`}>
                  <td className="py-3 pl-4 pr-2" onClick={e => { e.stopPropagation(); toggleSelect(ticket._uuid) }}>
                    {selectedIds.includes(ticket._uuid)
                      ? <CheckSquare size={14} className="text-indigo-500" />
                      : <Square size={14} className="t-sub opacity-40 hover:opacity-100" />}
                  </td>
                  {visibleColDefs.map(col => cellValue(ticket, col.key))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-glass flex items-center justify-between">
            <span className="text-[11px] t-muted">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
            {selectedIds.length > 0 && (
              <span className="text-[11px] text-indigo-500 font-medium">{selectedIds.length} selected</span>
            )}
          </div>
        )}
      </Card>

      {selectedTicket && <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />}
    </div>
  )
}
