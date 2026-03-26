import { PRIORITY_COLORS, STATUS_COLORS, statusLabel } from '../../utils/ticketUtils'

export function PriorityBadge({ priority }) {
  const c = PRIORITY_COLORS[priority] || PRIORITY_COLORS.low
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  )
}

export function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS['open']
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {statusLabel(status)}
    </span>
  )
}
