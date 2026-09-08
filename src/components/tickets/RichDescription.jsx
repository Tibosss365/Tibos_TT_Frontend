import { useRef, useEffect } from 'react'
import { Bold, Italic, Underline, List, ListOrdered, Link2 } from 'lucide-react'
import { cleanEmailHtml } from '../../utils/htmlContent'

// Decode quoted-printable (common in .eml bodies): soft line-breaks + =XX hex.
function qpDecode(s) {
  return s.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
}

// Best-effort extraction of an email body from a dropped .eml / .txt / .html file.
function extractEmailBody(raw) {
  let text = raw
  if (/content-transfer-encoding:\s*quoted-printable/i.test(raw)) text = qpDecode(raw)
  const htmlMatch = text.match(/<html[\s\S]*?<\/html>/i) || text.match(/<body[\s\S]*?<\/body>/i)
  if (htmlMatch) return cleanEmailHtml(htmlMatch[0])
  // Plain text: drop the MIME headers (up to first blank line) and keep line breaks.
  const idx = text.search(/\r?\n\r?\n/)
  const body = idx >= 0 ? text.slice(idx) : text
  return body.split(/\r?\n/).map(l => (l.trim() ? l.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '')).join('<br>')
}

/**
 * Rich, paste-aware description field. Paste an email (keeps formatting), or
 * drop a .eml/.txt/.html file — the conversation trail is preserved as HTML.
 * Plain typing works normally. Emits cleaned HTML (or '' when empty).
 */
const TOOLBAR_BUTTONS = [
  { cmd: 'bold',          icon: Bold,        title: 'Bold' },
  { cmd: 'italic',        icon: Italic,      title: 'Italic' },
  { cmd: 'underline',     icon: Underline,   title: 'Underline' },
  { cmd: 'insertUnorderedList', icon: List,        title: 'Bulleted list' },
  { cmd: 'insertOrderedList',   icon: ListOrdered, title: 'Numbered list' },
]

export function RichDescription({ value, onChange, placeholder = '', className = '', invalid = false, toolbar = false, onImagePaste = null }) {
  const ref = useRef(null)

  // Sync external value (template fill, file drop) without disturbing the caret
  // while typing — only writes when the value genuinely differs.
  useEffect(() => {
    const el = ref.current
    if (el && (value || '') !== el.innerHTML) el.innerHTML = value || ''
  }, [value])

  const emit = () => {
    const el = ref.current
    if (!el) return
    const text = (el.textContent || '').trim()
    onChange(text ? el.innerHTML : '')
  }

  const handlePaste = (e) => {
    if (onImagePaste) {
      for (const item of e.clipboardData?.items || []) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) onImagePaste(file)
          return
        }
      }
    }
    const html = e.clipboardData?.getData('text/html')
    if (html) {
      e.preventDefault()
      const clean = cleanEmailHtml(html)
      // eslint-disable-next-line deprecation/deprecation
      document.execCommand('insertHTML', false, clean)
      emit()
    } else {
      // plain text — let the browser insert, then capture
      setTimeout(emit, 0)
    }
  }

  const handleDrop = async (e) => {
    const file = e.dataTransfer?.files?.[0]
    if (!file) return
    if (/\.(eml|txt|html?)$/i.test(file.name)) {
      e.preventDefault()
      try {
        const body = extractEmailBody(await file.text())
        if (ref.current) { ref.current.innerHTML = body; emit() }
      } catch { /* ignore unreadable files */ }
    }
    // .msg (Outlook binary) can't be parsed in the browser — user should paste instead.
  }

  const format = (cmd) => {
    ref.current?.focus()
    if (cmd === 'link') {
      const url = window.prompt('Link URL:')
      if (!url) return
      // eslint-disable-next-line deprecation/deprecation
      document.execCommand('createLink', false, url)
    } else {
      // eslint-disable-next-line deprecation/deprecation
      document.execCommand(cmd, false)
    }
    emit()
  }

  return (
    <div>
      {toolbar && (
        <div className="flex items-center gap-0.5 mb-1.5 pb-1.5 border-b border-glass">
          {TOOLBAR_BUTTONS.map(({ cmd, icon: Icon, title }) => (
            <button
              key={cmd}
              type="button"
              title={title}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => format(cmd)}
              className="p-1.5 rounded-lg t-muted hover:t-main hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <Icon size={13} />
            </button>
          ))}
          <button
            type="button"
            title="Insert link"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => format('link')}
            className="p-1.5 rounded-lg t-muted hover:t-main hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <Link2 size={13} />
          </button>
        </div>
      )}
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline="true"
        onInput={emit}
        onBlur={emit}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        data-placeholder={placeholder}
        suppressContentEditableWarning
        className={`email-body rt-editable glass-input w-full text-sm leading-relaxed overflow-y-auto ${invalid ? 'border-rose-500' : ''} ${className}`}
        style={{ minHeight: '140px', maxHeight: '360px' }}
      />
    </div>
  )
}
