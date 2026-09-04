/**
 * SourceBadge — displays the ticket source with a coloured icon pill.
 */
const SOURCE_CONFIG = {
  email:   { label: 'Email',    color: 'bg-blue-100 text-blue-700',   icon: '✉️' },
  portal:  { label: 'Portal',   color: 'bg-indigo-100 text-indigo-700', icon: '🖥️' },
  phone:   { label: 'Phone',    color: 'bg-green-100 text-green-700',  icon: '📞' },
  api:     { label: 'API',      color: 'bg-yellow-100 text-yellow-700', icon: '⚙️' },
  walk_in: { label: 'Walk-In',  color: 'bg-orange-100 text-orange-700', icon: '🚶' },
  chat:    { label: 'Chat',     color: 'bg-pink-100 text-pink-700',    icon: '💬' },
  teams:   { label: 'Teams',    color: 'bg-violet-100 text-violet-700', icon: '👥' },
}

export default function SourceBadge({ source = 'portal', size = 'sm' }) {
  const cfg = SOURCE_CONFIG[source] || SOURCE_CONFIG.portal
  const sizeClass = size === 'xs' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${cfg.color} ${sizeClass}`}>
      <span className="text-[10px]">{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}
