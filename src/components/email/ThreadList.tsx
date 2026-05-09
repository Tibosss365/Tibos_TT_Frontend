import { Paperclip, Star } from 'lucide-react'
import type { EmailThread } from '../../types/email'

interface Props {
  threads: EmailThread[]
  activeId?: string
  onSelect: (thread: EmailThread) => void
  loading?: boolean
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1)  return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24)  return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7)  return `${day}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function ThreadSkeleton() {
  return (
    <div className="px-4 py-3 space-y-1.5 animate-pulse">
      <div className="flex justify-between">
        <div className="h-3 w-32 bg-white/10 rounded" />
        <div className="h-3 w-16 bg-white/10 rounded" />
      </div>
      <div className="h-3.5 w-48 bg-white/10 rounded" />
      <div className="h-3 w-full bg-white/10 rounded" />
    </div>
  )
}

export function ThreadList({ threads, activeId, onSelect, loading }: Props) {
  if (loading) {
    return (
      <div className="divide-y divide-white/5">
        {[...Array(6)].map((_, i) => <ThreadSkeleton key={i} />)}
      </div>
    )
  }

  if (!threads.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <p className="text-sm font-semibold t-main">No conversations</p>
        <p className="text-xs t-muted mt-1">Emails will appear here when they arrive.</p>
      </div>
    )
  }

  return (
    <div className="divide-y" style={{ borderColor: 'var(--c-border)' }}>
      {threads.map((thread) => (
        <button
          key={thread.id}
          onClick={() => onSelect(thread)}
          className={`w-full text-left px-4 py-3 transition-all hover:bg-white/5 ${
            activeId === thread.id ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : ''
          }`}
        >
          {/* Row 1: participants + time */}
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className={`text-xs truncate ${thread.is_read ? 't-muted' : 'font-semibold t-main'}`}>
              {thread.participant_emails.slice(0, 2).join(', ')}
              {thread.participant_emails.length > 2 && ` +${thread.participant_emails.length - 2}`}
            </span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {thread.is_starred && <Star size={11} className="text-amber-400 fill-amber-400" />}
              {thread.has_attachments && <Paperclip size={11} className="t-muted" />}
              {thread.unread_count > 0 && (
                <span className="text-[10px] font-bold bg-indigo-600 text-white rounded-full w-4 h-4 flex items-center justify-center">
                  {thread.unread_count > 9 ? '9+' : thread.unread_count}
                </span>
              )}
              <span className="text-[10px] t-muted whitespace-nowrap">
                {fmtRelative(thread.last_message_at)}
              </span>
            </div>
          </div>

          {/* Row 2: subject */}
          <p className={`text-xs truncate mb-0.5 ${thread.is_read ? 't-muted' : 'font-semibold t-main'}`}>
            {thread.subject}
          </p>

          {/* Row 3: snippet */}
          {thread.snippet && (
            <p className="text-[11px] t-muted truncate">{thread.snippet}</p>
          )}
        </button>
      ))}
    </div>
  )
}
