import { useState } from 'react'
import {
  Archive, ChevronDown, ChevronUp, Download, ExternalLink,
  Forward, Loader2, MoreHorizontal, Reply, ReplyAll, Star, Trash2,
} from 'lucide-react'
import type { EmailMessage, EmailThread } from '../../types/email'
import { DELIVERY_META, SENTIMENT_META } from '../../types/email'

interface Props {
  thread: EmailThread
  messages: EmailMessage[]
  loading?: boolean
  onReply: (msg: EmailMessage) => void
  onForward: (msg: EmailMessage) => void
  onArchive: () => void
  onStar: () => void
  onOpenAIPanel: (msg: EmailMessage) => void
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function MessageBubble({ msg, onReply, onForward, onOpenAI }: {
  msg: EmailMessage
  onReply: (m: EmailMessage) => void
  onForward: (m: EmailMessage) => void
  onOpenAI: (m: EmailMessage) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [showHeaders, setShowHeaders] = useState(false)
  const isOutbound = msg.direction === 'outbound'
  const isNote = msg.message_type === 'internal_note'

  return (
    <div className={`glass-card rounded-xl overflow-hidden ${isNote ? 'border border-amber-400/30' : ''}`}>
      {/* Header */}
      <div
        className="flex items-start justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start gap-3 min-w-0">
          {/* Avatar */}
          <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
            isNote ? 'bg-amber-400/20 text-amber-400' :
            isOutbound ? 'bg-indigo-500/20 text-indigo-400' :
            'bg-emerald-500/20 text-emerald-400'
          }`}>
            {(msg.from_name || msg.from_email)[0]?.toUpperCase()}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold t-main">
                {msg.from_name || msg.from_email}
              </span>
              {isNote && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 font-semibold">
                  Internal Note
                </span>
              )}
              {isOutbound && (
                <span className={`text-[10px] font-medium ${DELIVERY_META[msg.delivery_status]?.cls}`}>
                  {DELIVERY_META[msg.delivery_status]?.label}
                </span>
              )}
              {msg.ai_sentiment && (
                <span className={`text-[10px] ${SENTIMENT_META[msg.ai_sentiment]?.cls}`}>
                  {SENTIMENT_META[msg.ai_sentiment]?.label}
                </span>
              )}
            </div>
            {expanded && (
              <div className="text-[11px] t-muted mt-0.5">
                <span>To: {msg.to_recipients.map((r) => r.name || r.email).join(', ')}</span>
                {msg.cc_recipients.length > 0 && (
                  <span> · CC: {msg.cc_recipients.map((r) => r.name || r.email).join(', ')}</span>
                )}
              </div>
            )}
            {!expanded && (
              <p className="text-xs t-muted truncate max-w-xs">{msg.body_stripped || '...'}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] t-muted">{fmtDate(msg.received_at)}</span>
          {expanded ? <ChevronUp size={14} className="t-muted" /> : <ChevronDown size={14} className="t-muted" />}
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <>
          <div className="px-4 pb-3" style={{ borderTop: '1px solid var(--c-border)' }}>
            <div className="pt-3 text-sm t-main leading-relaxed">
              {msg.body_html ? (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none email-body"
                  dangerouslySetInnerHTML={{ __html: msg.body_html }}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm">{msg.body_text}</pre>
              )}
            </div>
          </div>

          {/* Attachments */}
          {msg.attachments.filter((a) => !a.is_inline).length > 0 && (
            <div className="px-4 pb-3 flex flex-wrap gap-2" style={{ borderTop: '1px solid var(--c-border)' }}>
              {msg.attachments.filter((a) => !a.is_inline).map((att) => (
                <a
                  key={att.id}
                  href={att.storage_path || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-card text-xs t-muted hover:t-main transition-all"
                >
                  <Download size={12} />
                  <span className="max-w-[140px] truncate">{att.filename}</span>
                  <span className="opacity-60">{fmtSize(att.size_bytes)}</span>
                </a>
              ))}
            </div>
          )}

          {/* Actions */}
          <div
            className="flex items-center gap-2 px-4 py-2"
            style={{ borderTop: '1px solid var(--c-border)' }}
          >
            <button
              onClick={() => onReply(msg)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-card text-xs t-muted hover:t-main transition-all"
            >
              <Reply size={12} /> Reply
            </button>
            <button
              onClick={() => onForward(msg)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-card text-xs t-muted hover:t-main transition-all"
            >
              <Forward size={12} /> Forward
            </button>
            <button
              onClick={() => onOpenAI(msg)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-indigo-400 hover:bg-indigo-400/10 transition-all"
            >
              ✦ AI Assist
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function ThreadView({
  thread, messages, loading,
  onReply, onForward, onArchive, onStar, onOpenAIPanel,
}: Props) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin t-muted" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Thread header */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--c-border)' }}>
        <div className="min-w-0">
          <h2 className="text-base font-bold t-main truncate">{thread.subject}</h2>
          <p className="text-xs t-muted mt-0.5">
            {thread.message_count} message{thread.message_count !== 1 ? 's' : ''} ·{' '}
            {thread.participant_emails.join(', ')}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onStar}
            className={`p-2 rounded-lg transition-all ${thread.is_starred ? 'text-amber-400' : 't-muted hover:text-amber-400'}`}
          >
            <Star size={15} className={thread.is_starred ? 'fill-amber-400' : ''} />
          </button>
          <button
            onClick={onArchive}
            className="p-2 rounded-lg t-muted hover:t-main transition-all"
          >
            <Archive size={15} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            onReply={onReply}
            onForward={onForward}
            onOpenAI={onOpenAIPanel}
          />
        ))}
      </div>
    </div>
  )
}
