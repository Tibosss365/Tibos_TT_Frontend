import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, Search, X, RefreshCw, Inbox } from 'lucide-react'
import { useTicketStore } from '../stores/ticketStore'
import { useUserStore } from '../stores/userStore'
import { useUiStore } from '../stores/uiStore'
import { PriorityBadge, StatusBadge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { TicketDetailModal } from '../components/tickets/TicketDetailModal'
import { timeAgo } from '../utils/ticketUtils'

const STATUS_OPTIONS = [
  { key: '',           label: 'All' },
  { key: 'open',       label: 'Open' },
  { key: 'in-progress',label: 'In Progress' },
  { key: 'on-hold',    label: 'On Hold' },
  { key: 'resolved',   label: 'Resolved' },
  { key: 'closed',     label: 'Closed' },
]

const STATUS_CHIP = {
  '':            'bg-indigo-500/15 text-indigo-500 border-indigo-500/40',
  'open':        'bg-blue-500/15 text-blue-500 border-blue-500/40',
  'in-progress': 'bg-violet-500/15 text-violet-500 border-violet-500/40',
  'on-hold':     'bg-amber-500/15 text-amber-500 border-amber-500/40',
  'resolved':    'bg-emerald-500/15 text-emerald-500 border-emerald-500/40',
  'closed':      'bg-slate-500/15 text-slate-500 border-slate-500/40',
}

export default function UserPortal() {
  const { myRequests, fetchMyRequests, loading } = useTicketStore()
  const { currentUser } = useUserStore()
  const { addToast } = useUiStore()
  const navigate = useNavigate()

  const [search, setSearch]           = useState('')
  const [statusFilter, setStatus]     = useState('')
  const [selectedTicket, setSelected] = useState(null)

  useEffect(() => {
    fetchMyRequests()
  }, [])

  const filtered = myRequests.filter(t => {
    if (statusFilter && t.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (
        !(t.subject || '').toLowerCase().includes(q) &&
        !(t.id || '').toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  const counts = {}
  STATUS_OPTIONS.forEach(s => {
    counts[s.key] = s.key === ''
      ? myRequests.length
      : myRequests.filter(t => t.status === s.key).length
  })

  const inputCls = 'glass-input text-sm h-8 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500/50'

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold t-main">My Tickets</h1>
          <p className="text-sm t-muted mt-0.5">
            Support requests you've submitted
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchMyRequests()}
            className="p-2 rounded-lg t-sub hover:t-main transition-colors"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <Button variant="primary" size="sm" onClick={() => navigate('/tickets/new')}>
            <PlusCircle size={14} /> New Ticket
          </Button>
        </div>
      </div>

      {/* Status chips */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setStatus(opt.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              statusFilter === opt.key
                ? STATUS_CHIP[opt.key]
                : 'border-glass t-muted hover:t-main'
            }`}
          >
            {opt.label}
            {counts[opt.key] > 0 && (
              <span className="ml-1.5 opacity-70">{counts[opt.key]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 t-muted" />
          <input
            className={`${inputCls} w-full pl-8`}
            placeholder="Search by subject or ticket ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 t-muted hover:t-main"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Ticket list */}
      <Card>
        {loading && myRequests.length === 0 ? (
          <div className="flex items-center justify-center py-16 t-muted">
            <RefreshCw size={18} className="animate-spin mr-2" />
            Loading tickets…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Inbox size={32} className="t-muted opacity-40" />
            <p className="t-muted text-sm">
              {myRequests.length === 0
                ? "You haven't submitted any tickets yet."
                : 'No tickets match your filters.'}
            </p>
            {myRequests.length === 0 && (
              <Button variant="primary" size="sm" onClick={() => navigate('/tickets/new')}>
                <PlusCircle size={14} /> Submit your first ticket
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--c-border)' }}>
                  {['ID', 'Subject', 'Priority', 'Status', 'Assigned To', 'Last Updated'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold t-sub uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(ticket => (
                  <tr
                    key={ticket._uuid}
                    onClick={() => setSelected(ticket)}
                    className="border-b transition-colors cursor-pointer hover:bg-black/3 dark:hover:bg-white/3"
                    style={{ borderColor: 'var(--c-border)' }}
                  >
                    <td className="px-4 py-3 font-mono text-xs t-muted whitespace-nowrap">
                      {ticket.id}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <span className="t-main font-medium line-clamp-1">{ticket.subject}</span>
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={ticket.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="px-4 py-3 t-muted text-xs">
                      {ticket.assigneeName || <span className="opacity-50">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3 t-muted text-xs whitespace-nowrap">
                      {timeAgo(ticket.updated)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
