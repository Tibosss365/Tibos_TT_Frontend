// Each KPI card gets its own soft tint (calm, desaturated) so the cards are easy to tell apart
// without the page turning into a rainbow. Numbers stay neutral.
const TINTS = {
  indigo:  '#6f86d8',   // blue
  violet:  '#9482d4',   // lilac
  rose:    '#cf7a8c',   // dusty rose
  emerald: '#4fa89b',   // teal
  amber:   '#d09a4f',   // sand
  orange:  '#d49563',   // clay
  cyan:    '#58a6c4',   // sky
}

export function StatsCard({ label, value, icon: Icon, color = 'indigo', trend, onClick, disabled = false }) {
  const tint = TINTS[color] || TINTS.indigo

  return (
    <div
      className={`glass-card tint-card p-5 transition-all duration-300 group ring-1 ring-transparent ${onClick && !disabled ? 'cursor-pointer hover:ring-indigo-500/25 hover:-translate-y-0.5' : ''} ${disabled ? 'opacity-70' : ''}`}
      style={{ '--tint': tint }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      aria-label={onClick ? `Show ${value} ${label.toLowerCase()}` : undefined}
      onClick={onClick && !disabled ? onClick : undefined}
      onKeyDown={onClick && !disabled ? event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      } : undefined}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="p-2.5 rounded-2xl group-hover:scale-110 transition-transform duration-300"
          style={{ background: 'color-mix(in srgb, var(--tint) 22%, transparent)' }}
        >
          <Icon size={18} style={{ color: 'var(--tint)' }} />
        </div>
        {trend && (
          <span className={`text-xs font-medium ${trend > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold t-main mb-1 transition-colors">{value}</div>
      <div className="text-xs t-muted font-medium">{label}</div>
    </div>
  )
}
