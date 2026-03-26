import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useUiStore } from '../../stores/uiStore'

const ICONS = {
  success: <CheckCircle size={16} className="text-emerald-400" />,
  error:   <XCircle size={16} className="text-rose-400" />,
  warning: <AlertTriangle size={16} className="text-amber-400" />,
  info:    <Info size={16} className="text-blue-400" />,
}

const BORDERS = {
  success: 'border-emerald-500/30',
  error:   'border-rose-500/30',
  warning: 'border-amber-500/30',
  info:    'border-blue-500/30',
}

export function ToastContainer() {
  const { toasts, removeToast } = useUiStore()

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl glass-card border ${BORDERS[toast.type] || BORDERS.info} shadow-glass animate-slide-in-right min-w-[280px] max-w-sm`}
        >
          {ICONS[toast.type] || ICONS.info}
          <span className="text-sm text-white/90 flex-1">{toast.message}</span>
          <button onClick={() => removeToast(toast.id)} className="text-white/30 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
