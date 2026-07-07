/**
 * HelpModal — ticketing-tool help & support (centered dialog).
 *
 * For help WITH the Tibos Desk product itself: reporting a bug, requesting a
 * modification/change, or asking a how-to question. It composes a pre-filled
 * email (with page + version + browser context) to the support address, and
 * also offers a direct email link.
 *
 * Rendered through a portal to document.body so it escapes the sidebar's
 * transformed container and centers over the whole page (dark backdrop behind).
 *
 * To use your own help illustration, drop the PNG at:  public/help-icon.png
 * and it will replace the gradient icon below automatically.
 */
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { LifeBuoy, Bug, Wrench, HelpCircle, Mail, Send, X } from 'lucide-react'

const SUPPORT_EMAIL = 'support@tibostech.in'
const APP_VERSION = '2.0.0'

const ISSUE_TYPES = [
  { id: 'bug',          label: 'Bug',          tag: 'Bug',    icon: Bug },
  { id: 'modification', label: 'Modification', tag: 'Change', icon: Wrench },
  { id: 'question',     label: 'Question',     tag: 'Help',   icon: HelpCircle },
]

export function HelpModal({ isOpen, onClose }) {
  const [type, setType] = useState('bug')
  const [subject, setSubject] = useState('')
  const [details, setDetails] = useState('')
  // Track whether the custom illustration exists; fall back to the icon if not.
  const [hasImg, setHasImg] = useState(true)

  // Escape to close + lock body scroll while open.
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const current = ISSUE_TYPES.find(t => t.id === type) || ISSUE_TYPES[0]

  const buildMailto = () => {
    const subj = `[Tibos Desk · ${current.tag}] ${subject || current.label}`
    const body = [
      `Issue type: ${current.label}`,
      '',
      details || '(please describe the issue here)',
      '',
      '——— technical context ———',
      `Page: ${window.location.href}`,
      `App version: ${APP_VERSION}`,
      `Browser: ${navigator.userAgent}`,
    ].join('\n')
    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`
  }

  const handleSend = () => { window.location.href = buildMailto() }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fade-in">
      {/* Backdrop — admin page stays visible, dimmed behind */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Centered dialog card (not full-width) */}
      <div className="relative w-full sm:max-w-md glass-card shadow-glass-lg animate-slide-up max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-glass flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-glow-indigo">
            <LifeBuoy size={16} className="text-white" />
          </div>
          <h2 className="text-base font-bold t-main">Help &amp; Support</h2>
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 t-sub hover:t-main transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-4">

          {/* Hero */}
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-glow-indigo overflow-hidden">
              {hasImg ? (
                <img
                  src="/help-icon.png"
                  alt="Help"
                  className="w-full h-full object-contain p-1"
                  onError={() => setHasImg(false)}
                />
              ) : (
                <LifeBuoy size={22} className="text-white" />
              )}
            </div>
            <div>
              <div className="text-sm font-semibold t-main">Ticketing tool help</div>
              <p className="text-xs t-sub mt-0.5 leading-relaxed">
                Report a bug, request a modification, or ask a question about Tibos Desk.
                Our team will get back to you.
              </p>
            </div>
          </div>

          {/* Issue type */}
          <div>
            <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1.5">
              What do you need?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ISSUE_TYPES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setType(id)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[11px] font-medium transition-all ${
                    type === id
                      ? 'border-indigo-500 bg-indigo-500/10 t-main'
                      : 'border-glass t-sub hover:t-main hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1.5">
              Subject
            </label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="glass-input w-full text-sm"
              placeholder="Short summary"
            />
          </div>

          {/* Details */}
          <div>
            <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1.5">
              Describe your issue
            </label>
            <textarea
              rows={4}
              value={details}
              onChange={e => setDetails(e.target.value)}
              className="glass-input w-full text-sm resize-none"
              placeholder="What happened, what you expected, and steps to reproduce…"
            />
          </div>

          {/* Send */}
          <button
            type="button"
            onClick={handleSend}
            className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
          >
            <Send size={14} /> Send to support
          </button>

          {/* Direct contact */}
          <div className="pt-3 border-t border-glass text-center">
            <p className="text-[11px] t-sub">Or email us directly</p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex items-center gap-1.5 mt-1 text-sm font-medium text-indigo-500 hover:underline"
            >
              <Mail size={14} /> {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
