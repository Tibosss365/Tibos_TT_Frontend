export function Card({ children, className = '', glow = false }) {
  return (
    <div className={`glass-card p-5 ${glow ? 'shadow-glow-indigo' : ''} ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-base font-semibold t-main">{title}</h3>
        {subtitle && <p className="text-xs t-muted mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
