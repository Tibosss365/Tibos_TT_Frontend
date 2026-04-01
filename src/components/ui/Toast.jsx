import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useUiStore } from '../../stores/uiStore'

const CONFIGS = {
  success: {
    icon:   <CheckCircle size={16} className="text-emerald-500 dark:text-emerald-400 flex-shrink-0" />,
    border: 'border-emerald-500/30',
    bg:     'bg-white dark:bg-gray-900',
  },
  error: {
    icon:   <XCircle size={16} className="text-rose-500 dark:text-rose-400 flex-shrink-0" />,
    border: 'border-rose-500/30',
    bg:     'bg-white dark:bg-gray-900',
  },
  warning: {
    icon:   <AlertTriangle size={16} className="text-amber-500 dark:text-amber-400 flex-shrink-0" />,
    border: 'border-amber-500/30',
    bg:     'bg-white dark:bg-gray-900',
  },
  info: {
    icon:   <Info size={16} className="text-blue-500 dark:text-blue-400 flex-shrink-0" />,
    border: 'border-blue-500/30',
    bg:     'bg-white dark:bg-gray-900',
  },
}

export function ToastContainer() {
  const { toasts, removeToast } = useUiStore()

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => {
        const cfg = CONFIGS[toast.type] || CONFIGS.info
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-slide-in-right min-w-[280px] max-w-sm ${cfg.bg} ${cfg.border}`}
          >
            {cfg.icon}
            <span className="text-sm font-medium text-gray-800 dark:text-gray-100 flex-1">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors flex-shrink-0">
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
