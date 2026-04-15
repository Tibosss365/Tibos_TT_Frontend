import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Search, Download, Trash2, CheckSquare, Square, X, Check,
  SlidersHorizontal, Calendar, Filter, RotateCcw
} from 'lucide-react'
import { useTicketStore } from '../stores/ticketStore'
import { useAdminStore } from '../stores/adminStore'
import { useUiStore } from '../stores/uiStore'
import { PriorityBadge, StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { TicketDetailModal } from '../components/tickets/TicketDetailModal'
import { STATUSES, PRIORITIES, TICKET_TYPES, TICKET_TYPE_META, timeAgo, getSlaInfo } from '../utils/ticketUtils'

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

// ── Staged filter defaults (excludes search + sort which are always instant) ──
const STAGED_DEFAULTS = {
  status: '', priority: '', category: '', group: '', type: '',
  assignee: '', dateFrom: '', dateTo: '', dateField: 'created',
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

  const [selectedTicket, setSelectedTicket]   = useState(null)
  const [staged, setStaged]                   = useState(() => ({
    status:    filters.status,
    priority:  filters.priority,
    category:  filters.category,
    group:     filters.group,
    type:      filters.type,
    assignee:  filters.assignee,
    dateFrom:  filters.dateFrom,
    dateTo:    filters.dateTo,
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

  // Apply staged → store
  const applyFilters = () => {
    Object.entries(staged).forEach(([k, v]) => setFilter(k, v))
  }

  // Clear everything
  const clearAllFilters = () => {
    resetFilters()
    setStaged(STAGED_DEFAULTS)
  }

  // Remove a single applied chip immediately
  const removeChip = (key) => {
    if (key === 'dateRange') {
      setFilter('dateFrom', ''); setFilter('dateTo', '')
      setStaged(s => ({ ...s, dateFrom: '', dateTo: '' }))
    } else {
      setFilter(key, '')
      setStaged(s => ({ ...s, [key]: '' }))
    }
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

  // Build active filter chips from APPLIED (store) filters
  const filterChips = [
    filters.status   && { key: 'status',   label: 'Status',   value: fmtStatus(filters.status), color: 'violet' },
    filters.priority && { key: 'priority', label: 'Priority', value: cap(filters.priority),      color: 'orange' },
    filters.category && { key: 'category', label: 'Category', value: getCategoryName(filters.category), color: 'blue' },
    filters.group    && { key: 'group',    label: 'Group',    value: getGroupName(filters.group), color: 'teal' },
    filters.type     && { key: 'type',     label: 'Type',     value: cap(filters.type),           color: 'rose' },
    filters.assignee && { key: 'assignee', label: 'Assignee', value: getAgentName(filters.assignee), color: 'indigo' },
    (filters.dateFrom || filters.dateTo) && {
      key: 'dateRange',
      label: filters.dateField === 'updated' ? 'Updated' : 'Created',
      value: [filters.dateFrom, filters.dateTo].filter(Boolean).join(' → '),
      color: 'emerald',
    },
  ].filter(Boolean)

  const appliedCount = filterChips.length
  const hasSearch    = !!filters.search
  const hasAnyFilter = appliedCount > 0 || hasSearch

  // Detect unsaved staged changes (show indicator on Apply button)
  const hasPending = (
    staged.status    !== filters.status    ||
    staged.priority  !== filters.priority  ||
    staged.category  !== filters.category  ||
    staged.group     !== filters.group     ||
    staged.type      !== filters.type      ||
    staged.assignee  !== filters.assignee  ||
    staged.dateFrom  !== filters.dateFrom  ||
    staged.dateTo    !== filters.dateTo
  )

  // chip color map → tailwind classes
  const chipColors = {
    violet:  'bg-violet-500/12 border-violet-400/30 text-violet-700 dark:text-violet-300',
    orange:  'bg-orange-500/12 border-orange-400/30 text-orange-700 dark:text-orange-300',
    blue:    'bg-blue-500/12 border-blue-400/30 text-blue-700 dark:text-blue-300',
    teal:    'bg-teal-500/12 border-teal-400/30 text-teal-700 dark:text-teal-300',
    rose:    'bg-rose-500/12 border-rose-400/30 text-rose-700 dark:text-rose-300',
    indigo:  'bg-indigo-500/12 border-indigo-400/30 text-indigo-700 dark:text-indigo-300',
    emerald: 'bg-emerald-500/12 border-emerald-400/30 text-emerald-700 dark:text-emerald-300',
  }

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold t-main">All Tickets</h1>
          <p className="text-sm t-muted mt-0.5">
            {filtered.length} ticket{filtered.length !== 1 ? 's' : ''}{hasAnyFilter ? ' (filtered)' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Column picker */}
          <div className="relative" ref={colPickerRef}>
            <button
              onClick={() => setShowColPicker(p => !p)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all
                ${showColPicker ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-600 dark:text-indigo-400' : 'border-glass t-muted hover:t-main hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <SlidersHorizontal size={13} /> Columns
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
          <Button variant="ghost" size="sm" onClick={handleExportCSV}><Download size={14} /> Export CSV</Button>
        </div>
      </div>

      {/* ── Filter card ───────────────────────────────────────────────────── */}
      <Card className="p-0 overflow-hidden">

        {/* Search + sort bar */}
        <div className="flex flex-wrap items-center gap-2 p-4 pb-3">
          <div className="relative flex-1 min-w-52">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 t-sub" />
            <input
              type="text" placeholder="Search tickets by subject, ID, submitter…"
              value={filters.search} onChange={e => setFilter('search', e.target.value)}
              className="glass-input w-full pl-9 pr-3 py-2 text-sm"
            />
            {filters.search && (
              <button onClick={() => setFilter('search', '')} className="absolute right-2.5 top-1/2 -translate-y-1/2 t-sub hover:t-main">
                <X size={13} />
              </button>
            )}
          </div>
          <select value={filters.sort} onChange={e => setFilter('sort', e.target.value)}
            className="glass-input text-sm py-2 font-medium min-w-36">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="priority">By priority</option>
            <option value="updated">Recently updated</option>
          </select>
          {/* Active filter count badge */}
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

              {/* Section: Value filters */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold t-sub uppercase tracking-wider">Filter By</span>
                  <div className="flex-1 h-px bg-glass" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    {
                      key: 'status', label: 'Status', placeholder: 'Any Status',
                      options: STATUSES.map(s => ({ value: s, label: fmtStatus(s) })),
                    },
                    {
                      key: 'priority', label: 'Priority', placeholder: 'Any Priority',
                      options: PRIORITIES.map(p => ({ value: p, label: cap(p) })),
                    },
                    {
                      key: 'category', label: 'Category', placeholder: 'Any Category',
                      options: [...categories].sort((a,b)=>a.sortOrder-b.sortOrder).map(c => ({ value: c.id, label: getCategoryName(c.id) })),
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
                      key: 'assignee', label: 'Assignee', placeholder: 'All Assignees',
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

              {/* Section: Date range */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={12} className="t-sub" />
                  <span className="text-[10px] font-bold t-sub uppercase tracking-wider">Date Range</span>
                  <div className="flex-1 h-px bg-glass" />
                </div>
                <div className="p-3 rounded-xl border border-glass/60 bg-black/[0.02] dark:bg-white/[0.02] space-y-3">
                  <div className="flex flex-wrap gap-3 items-end">
                    {/* Field selector */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold t-sub uppercase tracking-wider">Apply To</label>
                      <select value={staged.dateField} onChange={e => setSF('dateField', e.target.value)}
                        className="glass-input text-sm py-2 font-medium min-w-36">
                        <option value="created">Created Date</option>
                        <option value="updated">Last Updated</option>
                      </select>
                    </div>
                    {/* From */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold t-sub uppercase tracking-wider">From</label>
                      <input type="date" value={staged.dateFrom} onChange={e => setSF('dateFrom', e.target.value)}
                        className={`glass-input text-sm py-2 font-medium ${staged.dateFrom ? 'border-indigo-400/50 bg-indigo-500/5' : ''}`} />
                    </div>
                    {/* To */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold t-sub uppercase tracking-wider">To</label>
                      <input type="date" value={staged.dateTo} onChange={e => setSF('dateTo', e.target.value)}
                        className={`glass-input text-sm py-2 font-medium ${staged.dateTo ? 'border-indigo-400/50 bg-indigo-500/5' : ''}`} />
                    </div>
                    {/* Clear dates */}
                    {(staged.dateFrom || staged.dateTo) && (
                      <button onClick={() => { setSF('dateFrom',''); setSF('dateTo','') }}
                        className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-400 transition-colors pb-2">
                        <X size={11} /> Clear dates
                      </button>
                    )}
                  </div>
                  {/* Quick range presets */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-medium t-muted">Quick:</span>
                    {[
                      { label: 'Today',    days: 0 },
                      { label: '7 days',   days: 7 },
                      { label: '30 days',  days: 30 },
                      { label: '90 days',  days: 90 },
                      { label: 'This year', days: 365 },
                    ].map(({ label, days }) => {
                      const from = daysAgoStr(days)
                      const to   = todayStr()
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

      {/* ── Bulk action bar ───────────────────────────────────────────────── */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-indigo-500 dark:bg-indigo-600/15 border border-indigo-500/30 animate-fade-in">
          <span className="text-sm text-white dark:text-indigo-300 font-medium">{selectedIds.length} selected</span>
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" size="sm" onClick={handleBulkResolve} className="text-white dark:text-inherit">Mark Resolved</Button>
            <Button variant="ghost" size="sm" onClick={handleBulkClose}   className="text-white dark:text-inherit">Mark Closed</Button>
            <Button variant="danger" size="sm" onClick={handleBulkDelete}><Trash2 size={12} /> Delete</Button>
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
