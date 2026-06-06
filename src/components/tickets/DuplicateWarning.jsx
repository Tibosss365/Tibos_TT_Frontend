/**
 * DuplicateWarning — shown in NewTicket when potential duplicates exist.
 *
 * Props:
 *   duplicates  (array)  — list of possible duplicate tickets
 *   onDismiss   (fn)     — called when user dismisses
 *   onViewTicket (fn)    — called with ticket object when user clicks "View"
 */
export default function DuplicateWarning({ duplicates = [], onDismiss, onViewTicket }) {
  if (!duplicates.length) return null

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <div className="text-amber-500 text-xl mt-0.5">⚠️</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800 mb-1">
            Possible duplicate ticket{duplicates.length > 1 ? 's' : ''} found
          </p>
          <p className="text-xs text-amber-700 mb-3">
            We found {duplicates.length} open ticket{duplicates.length > 1 ? 's' : ''} with a similar subject.
            Please review before submitting.
          </p>
          <div className="space-y-2">
            {duplicates.map(t => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-amber-100 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-mono text-amber-700 mr-2">{t.ticket_id}</span>
                  <span className="text-xs text-amber-900 truncate">{t.subject}</span>
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-medium
                    ${t.status === 'open' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {t.status}
                  </span>
                </div>
                {onViewTicket && (
                  <button
                    type="button"
                    onClick={() => onViewTicket(t)}
                    className="text-xs font-medium text-amber-700 hover:text-amber-900 shrink-0 underline"
                  >
                    View
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-amber-500 hover:text-amber-700 text-lg leading-none mt-0.5"
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}
