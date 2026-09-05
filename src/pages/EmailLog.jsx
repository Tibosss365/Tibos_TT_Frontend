import { useEffect, useState } from 'react'
import { Inbox, ArrowRight, XCircle, RefreshCw } from 'lucide-react'
import { useAdminStore } from '../stores/adminStore'
import { Card, CardHeader } from '../components/ui/Card'

const STATUS_META = {
  processed: { label: 'Converted', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  duplicate: { label: 'Duplicate', cls: 'bg-amber-500/10  text-amber-600  dark:text-amber-400  border-amber-500/20'  },
  error:     { label: 'Error',     cls: 'bg-rose-500/10   text-rose-600   dark:text-rose-400   border-rose-500/20'   },
  filtered:  { label: 'Filtered',  cls: 'bg-slate-500/10  text-slate-500  dark:text-slate-400  border-slate-500/20'  },
}

export default function EmailLog() {
  const { emailLog, fetchInboundLogs, clearInboundLogs } = useAdminStore()
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const load = async () => {
    setLoading(true)
    try { await fetchInboundLogs() } finally { setLoading(false) }
  }

  return (
    <div className="w-full space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold t-main">Email → Ticket Log</h1>
          <p className="text-sm t-muted mt-0.5">Every inbound email and the ticket it became (or why it didn't).</p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg t-sub hover:t-main transition-colors"
          title="Refresh"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

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
                </tr>
              </thead>
              <tbody className="divide-y divide-glass">
                {emailLog.map(entry => (
                  <tr key={entry.id} className="hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
