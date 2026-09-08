import { useEffect, useState } from 'react'
import { Inbox, ArrowRight, XCircle, RefreshCw, TicketPlus, Loader2, Mail, Trash2, AlertTriangle } from 'lucide-react'
import { useAdminStore } from '../stores/adminStore'
import { useTicketStore } from '../stores/ticketStore'
import { useUiStore } from '../stores/uiStore'
import { Card, CardHeader } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { TicketDetailModal } from '../components/tickets/TicketDetailModal'
import { cleanEmailHtml } from '../utils/htmlContent'
import { api, normalizeTicket } from '../api/client'

// Statuses that count as "not yet resolved" — fetched directly with a status
// filter instead of paging through the entire tickets table and filtering
// client-side, which was the reason this list took so long to appear.
const OPEN_STATUSES = ['open', 'in-progress', 'on-hold']

async function fetchOpenTickets() {
  const perStatus = await Promise.all(OPEN_STATUSES.map(async (status) => {
    let items = []
    let page = 1
    while (true) {
      const data = await api.get(`/tickets?status=${status}&page=${page}&page_size=100&sort=newest`)
      items = [...items, ...(data.items || []).map(normalizeTicket)]
      if (page >= (data.pages || 1) || (data.items || []).length === 0) break
      page++
    }
    return items
  }))
  return perStatus.flat()
}

const STATUS_META = {
  processed: { label: 'Converted', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  duplicate: { label: 'Duplicate', cls: 'bg-amber-500/10  text-amber-600  dark:text-amber-400  border-amber-500/20'  },
  error:     { label: 'Error',     cls: 'bg-rose-500/10   text-rose-600   dark:text-rose-400   border-rose-500/20'   },
  filtered:  { label: 'Filtered',  cls: 'bg-slate-500/10  text-slate-500  dark:text-slate-400  border-slate-500/20'  },
}

const TICKET_STATUS_META = {
  'open':        { label: 'Open',        cls: 'bg-blue-500/10    text-blue-500    dark:text-blue-400    border-blue-500/20'    },
  'in-progress': { label: 'In Progress', cls: 'bg-violet-500/10  text-violet-500  dark:text-violet-400  border-violet-500/20'  },
  'on-hold':     { label: 'On Hold',     cls: 'bg-amber-500/10   text-amber-600   dark:text-amber-400   border-amber-500/20'   },
  'resolved':    { label: 'Resolved',    cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
}

// ── Preview modal for an entry with no live ticket (never converted, or its ticket was later deleted) ──
function EmailPreviewModal({ entry, onClose, onConverted }) {
  const { fetchEmailLogDetail, convertEmailLogToTicket } = useAdminStore()
  const { addToast } = useUiStore()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchEmailLogDetail(entry.id).then(d => { if (!cancelled) setDetail(d) }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [entry.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleConvert = async () => {
    setConverting(true)
    try {
      const data = await convertEmailLogToTicket(entry.id)
      addToast(`Converted to ticket ${data.ticket_number}`, 'success')
      onConverted?.(data)
      onClose()
    } catch (e) {
      addToast(e.message || 'Could not convert this email', 'error')
    } finally {
      setConverting(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Email Preview" size="lg">
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold t-main truncate">{entry.subject || '(no subject)'}</div>
            <div className="text-xs t-muted mt-0.5">
              {entry.fromName || entry.fromEmail} &lt;{entry.fromEmail}&gt;
            </div>
          </div>
          <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${STATUS_META[entry.status]?.cls || ''}`}>
            {STATUS_META[entry.status]?.label || entry.status}
          </span>
        </div>

        {entry.errorMessage && (
          <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
            {entry.errorMessage}
          </div>
        )}

        <div className="border-t border-glass pt-3">
          {loading ? (
            <div className="py-8 text-center text-sm t-muted">Loading email content…</div>
          ) : detail?.body ? (
            <div className="email-body max-h-[45vh] overflow-y-auto" dangerouslySetInnerHTML={{ __html: cleanEmailHtml(detail.body) }} />
          ) : (
            <div className="py-8 text-center">
              <Mail size={24} className="mx-auto t-muted mb-2 opacity-40" />
              <p className="text-xs t-muted">Original email content wasn't saved for this entry.</p>
              <p className="text-[11px] t-muted mt-0.5">A ticket can still be created from the subject line alone.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-glass">
          <Button variant="primary" size="sm" onClick={handleConvert} disabled={converting}>
            {converting ? <Loader2 size={14} className="animate-spin" /> : <TicketPlus size={14} />}
            {converting ? 'Converting…' : 'Convert to Ticket'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Scrolling ticker of emails that never became a ticket, so it's noticeable
// without having to scan the table (like a news headline strip). ──
function UnconvertedTicker({ entries, onSelect }) {
  if (entries.length === 0) return null

  const chips = entries.map(entry => (
    <button
      key={entry.id}
      onClick={() => onSelect(entry)}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 mx-1.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors whitespace-nowrap flex-shrink-0"
    >
      <AlertTriangle size={11} />
      {entry.subject || '(no subject)'} — not converted
    </button>
  ))

  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-amber-500/5 py-2 group">
      <div className="flex items-center w-max animate-marquee group-hover:[animation-play-state:paused]">
        <div className="flex items-center flex-shrink-0">{chips}</div>
        <div className="flex items-center flex-shrink-0" aria-hidden="true">{chips}</div>
      </div>
    </div>
  )
}

export default function EmailLog() {
  const { emailLog, fetchInboundLogs, clearInboundLogs, convertEmailLogToTicket, deleteEmailLogEntry } = useAdminStore()
  const { fetchTicket } = useTicketStore()
  const { addToast } = useUiStore()
  const [loading, setLoading] = useState(false)
  const [convertingId, setConvertingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [previewEntry, setPreviewEntry] = useState(null)
  const [openTicket, setOpenTicket] = useState(null)
  const [ticketLoading, setTicketLoading] = useState(false)
  const [openTickets, setOpenTickets] = useState([])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const load = async () => {
    setLoading(true)
    try {
      const [, tix] = await Promise.all([fetchInboundLogs(), fetchOpenTickets()])
      setOpenTickets(tix.sort((a, b) => new Date(b.updated || 0) - new Date(a.updated || 0)))
    } finally {
      setLoading(false)
    }
  }

  const handleConvert = async (entry) => {
    setConvertingId(entry.id)
    try {
      const data = await convertEmailLogToTicket(entry.id)
      addToast(`Converted to ticket ${data.ticket_number}`, 'success')
    } catch (e) {
      addToast(e.message || 'Could not convert this email', 'error')
    } finally {
      setConvertingId(null)
    }
  }

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete this log entry ("${entry.subject || '(no subject)'}")? This only removes the log — any ticket it already became is untouched.`)) return
    setDeletingId(entry.id)
    try {
      await deleteEmailLogEntry(entry.id)
      addToast('Log entry deleted', 'success')
    } catch (e) {
      addToast(e.message || 'Could not delete this entry', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  // Row click: a live ticket → open its full conversation (same modal used everywhere
  // else in the app); no live ticket → open a preview of the email with a convert option.
  const handleRowClick = async (entry) => {
    if (entry.ticketUuid) {
      setTicketLoading(true)
      try {
        const ticket = await fetchTicket(entry.ticketUuid)
        if (ticket) setOpenTicket(ticket)
        else addToast('That ticket could not be loaded — it may have been deleted', 'error')
      } catch {
        addToast('That ticket could not be loaded — it may have been deleted', 'error')
      } finally {
        setTicketLoading(false)
      }
    } else {
      setPreviewEntry(entry)
    }
  }

  return (
    <div className="w-full space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold t-main">Email → Ticket Log</h1>
          <p className="text-sm t-muted mt-0.5">Every inbound email and the ticket it became (or why it didn't). Click a row for details.</p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg t-sub hover:t-main transition-colors"
          title="Refresh"
        >
          <RefreshCw size={15} className={loading || ticketLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <UnconvertedTicker
        entries={emailLog.filter(e => !e.ticketUuid)}
        onSelect={entry => setPreviewEntry(entry)}
      />

      <Card>
        <div className="flex items-center justify-between mb-3">
          <CardHeader title="Open Tickets" subtitle={`${openTickets.length} not yet resolved — click one to see why and view its email communication`} />
        </div>

        {openTickets.length === 0 ? (
          <div className="py-10 text-center">
            <Mail size={28} className="mx-auto t-muted mb-2 opacity-40" />
            <p className="text-sm t-muted">No open tickets right now.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-glass">
                  <th className="text-left pb-2 text-[10px] font-bold t-sub uppercase tracking-wider">Ticket</th>
                  <th className="text-left pb-2 text-[10px] font-bold t-sub uppercase tracking-wider">Subject</th>
                  <th className="text-left pb-2 text-[10px] font-bold t-sub uppercase tracking-wider">Requester</th>
                  <th className="text-left pb-2 text-[10px] font-bold t-sub uppercase tracking-wider">Status</th>
                  <th className="text-left pb-2 text-[10px] font-bold t-sub uppercase tracking-wider">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass">
                {openTickets.map(t => (
                  <tr
                    key={t._uuid}
                    onClick={() => setOpenTicket(t)}
                    className="hover:bg-black/3 dark:hover:bg-white/3 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 pr-3 font-medium t-main whitespace-nowrap">{t.id}</td>
                    <td className="py-2.5 pr-3 t-main truncate max-w-xs">{t.subject}</td>
                    <td className="py-2.5 pr-3 t-muted truncate max-w-[180px]">{t.email || '—'}</td>
                    <td className="py-2.5 pr-3">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${TICKET_STATUS_META[t.status]?.cls || ''}`}>
                        {TICKET_STATUS_META[t.status]?.label || t.status}
                      </span>
                    </td>
                    <td className="py-2.5 t-muted whitespace-nowrap text-xs">
                      {t.updated ? new Date(t.updated).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <CardHeader title="Recent Activity" subtitle={`${emailLog.length} recent entries`} />
          {emailLog.length > 0 && (
            <button onClick={clearInboundLogs} className="flex items-center gap-1 text-[10px] t-muted hover:text-rose-500 transition-colors">
              <XCircle size={11} /> Clear
            </button>
          )}
        </div>

        {emailLog.length === 0 ? (
          <div className="py-16 text-center">
            <Inbox size={32} className="mx-auto t-muted mb-2 opacity-40" />
            <p className="text-sm t-muted">No emails processed yet.</p>
            <p className="text-xs t-muted mt-1">Inbound email is configured in Admin → Email.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-glass">
                  <th className="text-left pb-2 text-[10px] font-bold t-sub uppercase tracking-wider">From</th>
                  <th className="text-left pb-2 text-[10px] font-bold t-sub uppercase tracking-wider">Subject → Ticket</th>
                  <th className="text-left pb-2 text-[10px] font-bold t-sub uppercase tracking-wider">Status</th>
                  <th className="text-left pb-2 text-[10px] font-bold t-sub uppercase tracking-wider">Time</th>
                  <th className="text-right pb-2 text-[10px] font-bold t-sub uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass">
                {emailLog.map(entry => {
                  // Convertible whenever there's no live ticket attached — covers
                  // never-converted entries AND ones whose ticket was since deleted.
                  const canConvert = !entry.ticketUuid
                  const isConverting = convertingId === entry.id
                  const isDeleting = deletingId === entry.id
                  return (
                    <tr
                      key={entry.id}
                      onClick={() => handleRowClick(entry)}
                      className="hover:bg-black/3 dark:hover:bg-white/3 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 pr-3">
                        <div className="font-medium t-main truncate max-w-[180px]">{entry.fromName || entry.fromEmail}</div>
                        <div className="text-[11px] t-muted truncate max-w-[180px]">{entry.fromEmail}</div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="t-main truncate max-w-xs">{entry.subject}</div>
                        {entry.ticketId && (
                          <div className="flex items-center gap-1 text-[11px] text-indigo-500 mt-0.5">
                            <ArrowRight size={10} /> {entry.ticketId}
                          </div>
                        )}
                        {!entry.ticketId && entry.status === 'processed' && (
                          <div className="text-[11px] text-amber-500 mt-0.5">Ticket no longer exists</div>
                        )}
                        {entry.errorMessage && (
                          <div className="text-[11px] text-rose-500 mt-0.5 truncate max-w-xs">{entry.errorMessage}</div>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${STATUS_META[entry.status]?.cls || ''}`}>
                          {STATUS_META[entry.status]?.label || entry.status}
                        </span>
                      </td>
                      <td className="py-2.5 t-muted whitespace-nowrap text-xs">
                        {entry.processedAt ? new Date(entry.processedAt).toLocaleString() : '—'}
                      </td>
                      <td className="py-2.5 pl-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5">
                          {canConvert && (
                            <button
                              onClick={() => handleConvert(entry)}
                              disabled={isConverting}
                              title={entry.hasBody ? 'Create a ticket from this email' : 'Original email content was not saved — ticket will be created with the subject only'}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 border border-indigo-500/20 transition-all disabled:opacity-50"
                            >
                              {isConverting
                                ? <Loader2 size={11} className="animate-spin" />
                                : <TicketPlus size={11} />}
                              {isConverting ? 'Converting…' : 'Convert to Ticket'}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(entry)}
                            disabled={isDeleting}
                            title="Delete this log entry"
                            className="p-1.5 rounded-lg t-muted hover:text-rose-500 hover:bg-rose-500/10 transition-all disabled:opacity-50"
                          >
                            {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
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

      {previewEntry && (
        <EmailPreviewModal
          entry={previewEntry}
          onClose={() => setPreviewEntry(null)}
          onConverted={() => fetchInboundLogs()}
        />
      )}

      {openTicket && (
        <TicketDetailModal ticket={openTicket} onClose={() => setOpenTicket(null)} conversationOnly />
      )}
    </div>
  )
}
