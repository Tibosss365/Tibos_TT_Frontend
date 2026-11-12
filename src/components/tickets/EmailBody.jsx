import { memo, useMemo, useState } from 'react'
import { cleanEmailHtml, splitQuoted } from '../../utils/htmlContent'

/**
 * Renders an email body. Shows only what the sender wrote and folds the quoted
 * earlier conversation behind a "Show quoted text" toggle — like Outlook/Gmail.
 * Nothing is removed: the toggle reveals the complete original email.
 * Memoised, so typing elsewhere in the ticket never re-processes the email.
 */
export const EmailBody = memo(function EmailBody({ html, className = '' }) {
  const { full, own } = useMemo(() => {
    const cleaned = cleanEmailHtml(html)
    return { full: cleaned, own: splitQuoted(cleaned) }
  }, [html])
  const [showQuoted, setShowQuoted] = useState(false)

  const shown = own && !showQuoted ? own : full
  return (
    <div className={className}>
      <div dangerouslySetInnerHTML={{ __html: shown }} />
      {own && (
        <button
          type="button"
          onClick={() => setShowQuoted(v => !v)}
          className="mt-2 inline-flex items-center gap-1 rounded-md border border-glass px-2 py-0.5 text-[11px] font-semibold t-muted hover:t-main hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title={showQuoted ? 'Hide the earlier conversation quoted in this email' : 'Show the earlier conversation quoted in this email'}
        >
          {showQuoted ? 'Hide quoted text' : '⋯ Show quoted text'}
        </button>
      )}
    </div>
  )
})
