export function StatsCard({ label, value, icon: Icon, color = 'indigo', trend }) {
  const colorMap = {
    indigo:  { bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',  text: 'text-indigo-600 dark:text-indigo-400',  glow: 'shadow-glow-indigo',  val: 'text-indigo-700 dark:text-indigo-300' },
    violet:  { bg: 'bg-violet-500/10 dark:bg-violet-500/15',  text: 'text-violet-600 dark:text-violet-400',  glow: 'shadow-glow-violet',  val: 'text-violet-700 dark:text-violet-300' },
    rose:    { bg: 'bg-rose-500/10 dark:bg-rose-500/15',    text: 'text-rose-600 dark:text-rose-400',    glow: 'shadow-glow-rose',    val: 'text-rose-700 dark:text-rose-300' },
    emerald: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400', glow: 'shadow-glow-emerald', val: 'text-emerald-700 dark:text-emerald-300' },
    amber:   { bg: 'bg-amber-500/10 dark:bg-amber-500/15',   text: 'text-amber-600 dark:text-amber-400',   glow: '',                    val: 'text-amber-700 dark:text-amber-300' },
    cyan:    { bg: 'bg-cyan-500/10 dark:bg-cyan-500/15',    text: 'text-cyan-600 dark:text-cyan-400',    glow: 'shadow-glow-cyan',    val: 'text-cyan-700 dark:text-cyan-300' },
  }
  const c = colorMap[color] || colorMap.indigo

  return (
    <div className={`glass-card p-5 hover:${c.glow} transition-all duration-300 group ring-1 ring-transparent hover:ring-indigo-500/20`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${c.bg} ${c.glow} group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={18} className={c.text} />
        </div>
        {trend && (
          <span className={`text-xs font-medium ${trend > 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className={`text-2xl font-bold ${c.text} mb-1 transition-colors`}>{value}</div>
      <div className="text-xs t-muted font-medium">{label}</div>
    </div>
  )
}
