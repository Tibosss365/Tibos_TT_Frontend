import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, Filter, Download, Trash2, CheckSquare, Square, ChevronUp, ChevronDown, X } from 'lucide-react'
import { useTicketStore } from '../stores/ticketStore'
import { useAdminStore } from '../stores/adminStore'
import { useUiStore } from '../stores/uiStore'
import { PriorityBadge, StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { TicketDetailModal } from '../components/tickets/TicketDetailModal'
import { STATUSES, PRIORITIES, TICKET_TYPES, TICKET_TYPE_META, timeAgo } from '../utils/ticketUtils'

export default function AllTickets() {
  const location = useLocation()
  const { tickets, filters, setFilter, resetFilters, selectedIds, toggleSelect, selectAll, clearSelection, bulkUpdate, bulkDelete, getFilteredTickets } = useTicketStore()
  const { getAgentName, getCategoryName, categories, groups, getGroupName } = useAdminStore()
  const { addToast } = useUiStore()
  const [selectedTicket, setSelectedTicket] = useState(null)

  // Auto-open ticket when navigated from notification
  useEffect(() => {
    const openId = location.state?.openTicketId
    if (openId) {
      const ticket = tickets.find(t => t.id === openId)
      if (ticket) setSelectedTicket(ticket)
      // Clear state so back-navigation doesn't re-open
      window.history.replaceState({}, '')
    }
  }, [location.state])

  const filtered = getFilteredTickets()
  const allSelected = filtered.length > 0 && filtered.every(t => selectedIds.includes(t._uuid))

  const handleSelectAll = () => {
    if (allSelected) clearSelection()
    else selectAll(filtered.map(t => t._uuid))
  }

  const handleBulkResolve = async () => {
    try {
      await bulkUpdate(selectedIds, { status: 'resolved' })
      addToast(`${selectedIds.length} tickets resolved`, 'success')
    } catch (e) {
      addToast(e.message, 'error')
    }
  }

  const handleBulkClose = async () => {
    try {
      await bulkUpdate(selectedIds, { status: 'closed' })
      addToast(`${selectedIds.length} tickets closed`, 'info')
    } catch (e) {
      addToast(e.message, 'error')
    }
  }

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedIds.length} tickets?`)) {
      try {
        await bulkDelete(selectedIds)
        addToast(`${selectedIds.length} tickets deleted`, 'error')
      } catch (e) {
        addToast(e.message, 'error')
      }
    }
  }

  const handleExportCSV = () => {
    const headers = ['ID', 'Subject', 'Category', 'Priority', 'Status', 'Submitter', 'Assignee', 'Created']
    const rows = filtered.map(t => [t.id, `"${t.subject}"`, t.category, t.priority, t.status, t.submitter, getAgentName(t.assignee), t.created])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'tickets.csv'; a.click()
  }

  const hasFilters = filters.status || filters.priority || filters.category || filters.group || filters.type || filters.search

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold t-main">All Tickets</h1>
          <p className="text-sm t-muted mt-0.5">{filtered.length} tickets{hasFilters ? ' (filtered)' : ''}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleExportCSV}>
          <Download size={14} /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-40">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 t-sub" />
            <input
              type="text" placeholder="Search…" value={filters.search}
              onChange={e => setFilter('search', e.target.value)}
              className="glass-input w-full pl-8 py-1.5 text-sm"
            />
          </div>
          {[
            { key: 'status',   opts: STATUSES,   label: 'Status',   fmt: s => s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ') },
            { key: 'priority', opts: PRIORITIES, label: 'Priority', fmt: p => p.charAt(0).toUpperCase() + p.slice(1) },
            { key: 'category', opts: [...categories].sort((a,b)=>a.sortOrder-b.sortOrder).map(c=>c.id), label: 'Category', fmt: getCategoryName },
            { key: 'group',    opts: groups.map(g=>g.id),   label: 'Group',    fmt: getGroupName },
            { key: 'type',     opts: TICKET_TYPES,           label: 'Type',     fmt: t => t.charAt(0).toUpperCase() + t.slice(1) },
          ].map(({ key, opts, label, fmt }) => (
            <select key={key} value={filters[key]} onChange={e => setFilter(key, e.target.value)} className="glass-input text-sm py-1.5">
              <option value="">{label}</option>
              {opts.map(o => <option key={o} value={o}>{fmt(o)}</option>)}
            </select>
          ))}
          <select value={filters.sort} onChange={e => setFilter('sort', e.target.value)} className="glass-input text-sm py-1.5">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="priority">By priority</option>
            <option value="updated">Recently updated</option>
          </select>
          {hasFilters && (
            <button onClick={resetFilters} className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-400 transition-colors">
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </Card>

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-indigo-500 dark:bg-indigo-600/15 border border-indigo-500/30 animate-fade-in">
          <span className="text-sm text-white dark:text-indigo-300 font-medium">{selectedIds.length} selected</span>
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" size="sm" onClick={handleBulkResolve} className="text-white dark:text-inherit">Mark Resolved</Button>
            <Button variant="ghost" size="sm" onClick={handleBulkClose} className="text-white dark:text-inherit">Mark Closed</Button>
            <Button variant="danger" size="sm" onClick={handleBulkDelete}><Trash2 size={12} /> Delete</Button>
            <Button variant="ghost" size="sm" onClick={clearSelection} className="text-white dark:text-inherit"><X size={12} /></Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass">
                <th className="py-3 pl-4 pr-2 w-10">
                  <button onClick={handleSelectAll} className="t-sub hover:t-main transition-colors">
                    {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                  </button>
                </th>
                {['ID', 'Type', 'Subject', 'Priority', 'Status', 'Group', 'Category', 'Assignee', 'Updated'].map(h => (
                  <th key={h} className="py-3 px-3 text-left text-[10px] font-bold t-sub uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center t-sub text-sm">No tickets found</td></tr>
              ) : filtered.map(ticket => (
                <tr key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`border-b border-glass hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-all group ${selectedIds.includes(ticket.id) ? 'bg-indigo-500/10 dark:bg-indigo-500/8' : ''}`}>
                  <td className="py-3 pl-4 pr-2" onClick={e => { e.stopPropagation(); toggleSelect(ticket.id) }}>
                    {selectedIds.includes(ticket.id)
                      ? <CheckSquare size={14} className="text-indigo-500" />
                      : <Square size={14} className="t-sub opacity-50 hover:opacity-100" />}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] t-sub whitespace-nowrap">{ticket.id}</td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    {(() => {
                      const t = ticket.type || 'request'
                      const m = TICKET_TYPE_META[t] || TICKET_TYPE_META.request
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${m.bg} ${m.border} ${m.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.dot}`} />
                          {m.label}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="py-3 px-3 max-w-xs">
                    <div className="t-main font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">{ticket.subject}</div>
                    <div className="text-[10px] t-muted mt-0.5">{ticket.submitter}</div>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap"><PriorityBadge priority={ticket.priority} /></td>
                  <td className="py-3 px-3 whitespace-nowrap"><StatusBadge status={ticket.status} /></td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    {ticket.group ? (() => {
                      const g = groups.find(x => x.id === ticket.group)
                      return g ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: g.color + '20', color: g.color, border: `1px solid ${g.color}40` }}>
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: g.color }} />
                          {g.name}
                        </span>
                      ) : <span className="text-xs t-muted">—</span>
                    })() : <span className="text-xs t-muted">—</span>}
                  </td>
                  <td className="py-3 px-3 text-xs t-muted whitespace-nowrap">{getCategoryName(ticket?.category)}</td>
                  <td className="py-3 px-3 text-xs t-muted whitespace-nowrap">{getAgentName(ticket?.assignee)}</td>
                  <td className="py-3 px-3 text-xs t-sub whitespace-nowrap">{timeAgo(ticket?.updated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedTicket && <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />}
    </div>
  )
}
