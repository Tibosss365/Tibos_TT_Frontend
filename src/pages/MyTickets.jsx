import { useState, useRef, useEffect } from 'react'
import { useTicketStore } from '../stores/ticketStore'
import { useUserStore } from '../stores/userStore'
import { PriorityBadge, StatusBadge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { TicketDetailModal } from '../components/tickets/TicketDetailModal'
import { timeAgo } from '../utils/ticketUtils'
import { useAdminStore } from '../stores/adminStore'
import { SlidersHorizontal, Check } from 'lucide-react'

const ALL_COLUMNS = [
  { key: 'id',         label: 'ID' },
  { key: 'subject',    label: 'Subject' },
  { key: 'assignedTo', label: 'Assigned To' },
  { key: 'priority',   label: 'Priority' },
  { key: 'status',     label: 'Status' },
  { key: 'category',   label: 'Category' },
  { key: 'updated',    label: 'Updated' },
]

export default function MyTickets() {
  const { tickets, loading } = useTicketStore()
  const { currentUser } = useUserStore()
  const { getCategoryName, getAgentName } = useAdminStore()
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [visibleCols, setVisibleCols] = useState(['id','subject','assignedTo','priority','status','category','updated'])
  const [showColPicker, setShowColPicker] = useState(false)
  const pickerRef = useRef(null)

  const myTickets = [...tickets]
    .filter(t => t.assignee === String(currentUser?.id) && t.status !== 'resolved' && t.status !== 'closed')
    .sort((a, b) => new Date(b.updated) - new Date(a.updated))

  const toggleCol = (key) => {
    setVisibleCols(prev =>
      prev.includes(key)
        ? prev.length > 1 ? prev.filter(k => k !== key) : prev  // keep at least 1
        : [...prev, key]
    )
  }

  // Close picker when clicking outside
  useEffect(() => {
    const handler = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowColPicker(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const cols = ALL_COLUMNS.filter(c => visibleCols.includes(c.key))

  const cellValue = (ticket, key) => {
    switch (key) {
      case 'id':       return <td key={key} className="py-3 px-4 font-mono text-[11px] t-sub">{ticket.id}</td>
      case 'subject':  return (
        <td key={key} className="py-3 px-4 max-w-xs">
          <div className="t-main font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">{ticket.subject}</div>
          <div className="text-[10px] t-muted mt-0.5">{ticket.submitter}</div>
        </td>
      )
      case 'priority': return <td key={key} className="py-3 px-4"><PriorityBadge priority={ticket.priority} /></td>
      case 'status':   return <td key={key} className="py-3 px-4"><StatusBadge status={ticket.status} /></td>
      case 'assignedTo': return (
        <td key={key} className="py-3 px-4">
          {ticket.assignee
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
      case 'updated':  return <td key={key} className="py-3 px-4 text-xs t-sub">{timeAgo(ticket.updated)}</td>
      default: return null
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold t-main">My Tickets</h1>
          <p className="text-sm t-muted mt-0.5">{myTickets.length} tickets assigned to you</p>
        </div>

        {/* Customize Columns button */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowColPicker(p => !p)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all
              ${showColPicker
                ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-600 dark:text-indigo-400'
                : 'border-glass t-muted hover:t-main hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            <SlidersHorizontal size={13} />
            Customize Columns
          </button>

          {showColPicker && (
            <div className="absolute right-0 top-full mt-2 w-48 glass-card border border-glass rounded-xl shadow-lg z-50 p-2 animate-fade-in">
              <div className="text-[10px] font-bold t-sub uppercase tracking-wider px-2 py-1.5">Toggle Columns</div>
              {ALL_COLUMNS.map(col => (
                <button
                  key={col.key}
                  onClick={() => toggleCol(col.key)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  <span className="text-xs t-main">{col.label}</span>
                  {visibleCols.includes(col.key)
                    ? <Check size={13} className="text-indigo-500" />
                    : <span className="w-3 h-3 rounded border border-glass" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass">
                {cols.map(c => (
                  <th key={c.key} className="py-3 px-4 text-left text-[10px] font-bold t-sub uppercase tracking-wider">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={cols.length} className="py-12 text-center t-muted">Loading…</td></tr>
              ) : myTickets.length === 0 ? (
                <tr><td colSpan={cols.length} className="py-12 text-center t-muted">No tickets assigned to you</td></tr>
              ) : myTickets.map(ticket => (
                <tr key={ticket._uuid}
                  onClick={() => setSelectedTicket(ticket)}
                  className="border-b border-glass hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-all group">
                  {cols.map(c => cellValue(ticket, c.key))}
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
