import { useEffect, useState } from 'react'
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react'
import { useTicketStore } from '../stores/ticketStore'
import { useUiStore } from '../stores/uiStore'
import { PriorityBadge, StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function daysRemaining(deletedAt) {
  const elapsed = Date.now() - new Date(deletedAt).getTime()
  return Math.max(0, Math.ceil((THIRTY_DAYS_MS - elapsed) / (1000 * 60 * 60 * 24)))
}

export default function DeletedItems() {
  const { deletedTickets, fetchDeletedTickets, restoreTicket, permanentDelete, permanentBulkDelete } = useTicketStore()
  const { addToast } = useUiStore()
  const [deleting, setDeleting] = useState({})

  useEffect(() => { fetchDeletedTickets() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRestore = async (uuid, ticketId) => {
    await restoreTicket(uuid)
    addToast(`${ticketId} restored`, 'success')
  }

  const handlePermanentDelete = async (uuid, ticketId) => {
    if (!window.confirm(`Permanently delete ${ticketId}? This cannot be recovered.`)) return
    setDeleting(p => ({ ...p, [uuid]: true }))
    try {
      await permanentDelete(uuid)
      addToast(`${ticketId} permanently deleted`, 'info')
    } catch (e) {
      addToast(e.message || 'Delete failed', 'error')
    } finally {
      setDeleting(p => ({ ...p, [uuid]: false }))
    }
  }

  const handleEmptyTrash = async () => {
    if (!window.confirm(`Permanently delete all ${deletedTickets.length} ticket${deletedTickets.length !== 1 ? 's' : ''}? This cannot be undone.`)) return
    try {
      await permanentBulkDelete(deletedTickets.map(t => t._uuid))
      addToast('Trash emptied', 'info')
    } catch (e) {
      addToast(e.message || 'Failed to empty trash', 'error')
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold t-main flex items-center gap-2">
            <Trash2 size={20} className="t-sub" />
            Deleted Items
          </h1>
          <p className="text-sm t-muted mt-0.5">
            Tickets are permanently deleted after 30 days · {deletedTickets.length} item{deletedTickets.length !== 1 ? 's' : ''} in trash
          </p>
        </div>
        {deletedTickets.length > 0 && (
          <Button variant="danger" size="sm" onClick={handleEmptyTrash}>
            <Trash2 size={14} />
            Empty Trash
          </Button>
        )}
      </div>

      {/* Info banner — only shown when at least one item expires within 3 days */}
      {deletedTickets.some(t => daysRemaining(t.deletedAt) <= 3) && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'var(--c-amber-bg, rgba(245,158,11,0.08))', border: '1px solid rgba(245,158,11,0.25)' }}>
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <span className="text-amber-700 dark:text-amber-400">
            Items highlighted in red expire within 3 days and will be permanently deleted automatically.
          </span>
        </div>
      )}

      <Card>
        {deletedTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--c-hover)' }}>
              <Trash2 size={28} className="t-sub opacity-40" />
            </div>
            <p className="font-medium t-main">Trash is empty</p>
            <p className="text-sm t-muted">Deleted tickets will appear here for 30 days before being permanently removed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--c-border)' }}>
                  {['Ticket', 'Priority', 'Status', 'Deleted On', 'Expires In', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold t-sub uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deletedTickets.map(ticket => {
                  const days = daysRemaining(ticket.deletedAt)
                  const urgent = days <= 3
                  const warn   = days <= 7 && !urgent
                  return (
                    <tr
                      key={ticket._uuid}
                      className="transition-colors group"
                      style={{
                        borderBottom: '1px solid var(--c-border)',
                        background: urgent ? 'rgba(239,68,68,0.04)' : 'transparent',
                      }}
                    >
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-medium t-main truncate">{ticket.subject}</div>
                        <div className="text-[10px] t-muted mt-0.5 font-mono">{ticket.id}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <PriorityBadge priority={ticket.priority} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td className="px-4 py-3 text-xs t-muted whitespace-nowrap">
                        {new Date(ticket.deletedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs font-semibold ${urgent ? 'text-rose-500' : warn ? 'text-amber-500' : 't-muted'}`}>
                          {days === 0 ? 'Expires today' : `${days} day${days !== 1 ? 's' : ''}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => handleRestore(ticket._uuid, ticket.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          >
                            <RotateCcw size={12} />
                            Restore
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(ticket._uuid, ticket.id)}
                            disabled={!!deleting[ticket._uuid]}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                          >
                            <Trash2 size={12} />
                            {deleting[ticket._uuid] ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
