export function Button({ children, variant = 'primary', size = 'md', className = '', onClick, type = 'button', disabled }) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none'
  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2 text-sm rounded-lg',
    lg: 'px-6 py-3 text-sm rounded-xl',
  }
  const variants = {
    primary: 'btn-primary',
    ghost:   'btn-ghost',
    danger:  'btn-danger',
    outline: 'border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 rounded-lg',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
