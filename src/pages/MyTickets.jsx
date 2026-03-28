import { useState } from 'react'
import { useTicketStore } from '../stores/ticketStore'
import { useUserStore } from '../stores/userStore'
import { PriorityBadge, StatusBadge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { TicketDetailModal } from '../components/tickets/TicketDetailModal'
import { timeAgo } from '../utils/ticketUtils'
import { useAdminStore } from '../stores/adminStore'

export default function MyTickets() {
  const { tickets, loading } = useTicketStore()
  const { currentUser } = useUserStore()
  const { getCategoryName } = useAdminStore()
  const [selectedTicket, setSelectedTicket] = useState(null)

  const myTickets = [...tickets]
    .filter(t => t.assignee === String(currentUser?.id))
    .sort((a, b) => new Date(b.updated) - new Date(a.updated))

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold t-main">My Tickets</h1>
        <p className="text-sm t-muted mt-0.5">{myTickets.length} tickets assigned to you</p>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass">
                {['ID', 'Subject', 'Priority', 'Status', 'Category', 'Updated'].map(h => (
                  <th key={h} className="py-3 px-4 text-left text-[10px] font-bold t-sub uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center t-muted">Loading…</td></tr>
              ) : myTickets.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center t-muted">No tickets assigned to you</td></tr>
              ) : myTickets.map(ticket => (
                <tr key={ticket._uuid}
                  onClick={() => setSelectedTicket(ticket)}
                  className="border-b border-glass hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-all group">
                  <td className="py-3 px-4 font-mono text-[11px] t-sub">{ticket.id}</td>
                  <td className="py-3 px-4 max-w-xs">
                    <div className="t-main font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">{ticket.subject}</div>
                    <div className="text-[10px] t-muted mt-0.5">{ticket.submitter}</div>
                  </td>
                  <td className="py-3 px-4"><PriorityBadge priority={ticket.priority} /></td>
                  <td className="py-3 px-4"><StatusBadge status={ticket.status} /></td>
                  <td className="py-3 px-4 text-xs t-muted">{getCategoryName(ticket.category)}</td>
                  <td className="py-3 px-4 text-xs t-sub">{timeAgo(ticket.updated)}</td>
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
