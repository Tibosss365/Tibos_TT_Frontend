import { useEffect } from 'react'
import { X } from 'lucide-react'

export function Modal({ isOpen, onClose, title, children, size = 'md', fillHeight = false }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    if (isOpen) {
      document.addEventListener('keydown', handler)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizes = { sm: 'sm:max-w-md', md: 'sm:max-w-2xl', lg: 'sm:max-w-4xl', xl: 'sm:max-w-6xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel — full-width bottom sheet on mobile, centered dialog on sm+ */}
      <div className={`
        relative w-full ${sizes[size]}
        glass-card shadow-glass-lg animate-slide-up
        max-h-[92vh] sm:max-h-[90vh]
        flex flex-col
        rounded-t-2xl sm:rounded-2xl
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-glass flex-shrink-0">
          <h2 className="text-base font-bold t-main">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 t-sub hover:t-main transition-all"
          >
            <X size={16} />
          </button>
        </div>
        {/* fillHeight: content manages its own scroll (e.g. TicketDetailModal) */}
        {/* default: outer scroll for simple content that may overflow */}
        <div className={fillHeight
          ? 'flex-1 min-h-0 flex flex-col overflow-hidden'
          : 'overflow-y-auto flex-1'
        }>
          {children}
        </div>
      </div>
    </div>
  )
}
